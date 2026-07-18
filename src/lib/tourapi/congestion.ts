import { callTourApi } from "./client";
import { getFallbackCongestion, type FetchSource } from "./fallback";

export type CongestionDay = {
  baseYmd: string;
  cnctrRate: number;
};

type CongestionApiItem = {
  baseYmd: string;
  areaCd: string;
  areaNm: string;
  signguCd: string;
  signguNm: string;
  tAtsNm: string;
  cnctrRate: string;
};

const ENDPOINT = process.env.TOURAPI_CONGESTION_ENDPOINT ?? "";
const SERVICE_KEY = process.env.TOURAPI_CONGESTION_KEY_DECODED ?? "";

/**
 * 이름 정규화: 괄호/대괄호 안 내용, 공백·슬래시·가운뎃점 등 구분자를 제거하고 소문자화한다.
 * hub spot API와 congestion API의 표기 차이(예: "국립현대미술관/서울관" vs "국립현대미술관 서울",
 * "조계사" vs "조계사(서울)")를 흡수하기 위한 것.
 */
function normalizeName(s: string): string {
  return s
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[\s/·().,\-]/g, "")
    .toLowerCase();
}

const sortChars = (s: string): string =>
  normalizeName(s).split("").sort().join("");

/**
 * hub spot 이름(hubTatsNm)을 congestion API의 실제 관광지명(tAtsNm)으로 해석한다.
 *
 * 두 API에는 공유 ID가 없어 이름으로만 연결해야 하는데 표기가 미묘하게 달라, 단순 정확일치는
 * 같은 장소도 빈 결과를 낸다(예: "팔각정북악스카이" ↔ congestion의 "북악스카이 팔각정"). 반대로
 * 과하게 퍼지 매칭하면 다른 관광지 데이터를 잘못 보여줄 수 있어("국립민속박물관"→"국립고궁박물관"
 * 류) **정밀도 우선**으로 구조적 신호만, 그리고 후보가 유일할 때만 매칭한다:
 *   1) 정확일치 → 2) 정규화 정확일치 → 3) 애너그램(글자 구성 동일·어순만 다름, 길이≥5)
 *   → 4) 정규화 부분문자열 포함(짧은 쪽 길이≥4, 길이비≥0.5).
 * 어느 단계든 후보가 2개 이상이면 모호하므로 매칭하지 않는다(잘못된 데이터 노출 방지).
 *
 * 종로구 100개 hub 스팟 실측: 정확일치만 27개 → 이 리졸버로 32개(오탐 0). 나머지 미매칭은
 * 대부분 호텔·숙박 등 congestion 데이터셋에 애초에 없는 항목이다.
 */
export function resolveCongestionName(
  hubName: string,
  congestionNames: string[],
): string | null {
  const hn = normalizeName(hubName);
  if (!hn) return null;
  const unique = (cands: string[]) => (cands.length === 1 ? cands[0] : null);

  const exact = unique(congestionNames.filter((c) => c === hubName));
  if (exact) return exact;

  const normEq = unique(congestionNames.filter((c) => normalizeName(c) === hn));
  if (normEq) return normEq;

  if (hn.length >= 5) {
    const sc = sortChars(hubName);
    const anagram = unique(
      congestionNames.filter(
        (c) => normalizeName(c).length >= 5 && sortChars(c) === sc,
      ),
    );
    if (anagram) return anagram;
  }

  const contain = unique(
    congestionNames.filter((c) => {
      const cn = normalizeName(c);
      const [short, long] = hn.length < cn.length ? [hn, cn] : [cn, hn];
      return short.length >= 4 && long.includes(short) && short.length / long.length >= 0.5;
    }),
  );
  return contain;
}

/**
 * tatsCnctrRatedList는 관광지 단위 필터 파라미터를 지원하지 않고(날짜/월 파라미터도 없이 오늘부터
 * 향후 30일 예측을 한 번에 반환), 해당 시/군/구 내 모든 관광지 데이터를 돌려준다. 따라서 시/군/구
 * 전체를 한 번에 조회한 뒤, spotName(hub spot의 hubTatsNm)을 congestion 측 이름으로 해석해
 * 필터링한다(표기 차이 흡수 — resolveCongestionName 참고).
 */
export async function fetchCongestion(
  areaCd: string,
  signguCd: string,
  spotName: string,
): Promise<{ series: CongestionDay[]; source: FetchSource }> {
  let items: CongestionApiItem[];
  try {
    items = await callTourApi<CongestionApiItem>(
      ENDPOINT,
      SERVICE_KEY,
      "tatsCnctrRatedList",
      { areaCd, signguCd, numOfRows: 5000, pageNo: 1 },
    );
  } catch (err) {
    // API 실패 시 대표 지역은 정적 캐시로 degrade(데모 안정성). 캐시 없으면 원래 에러 전파.
    const fb = getFallbackCongestion(areaCd, signguCd, spotName);
    if (fb === null) throw err;
    return { series: fb, source: "fallback" };
  }

  const congestionNames = [...new Set(items.map((item) => item.tAtsNm))];
  const resolved = resolveCongestionName(spotName, congestionNames);
  if (!resolved) return { series: [], source: "live" };

  const series = items
    .filter((item) => item.tAtsNm === resolved)
    .map((item) => ({
      baseYmd: item.baseYmd,
      cnctrRate: Number(item.cnctrRate),
    }))
    .sort((a, b) => a.baseYmd.localeCompare(b.baseYmd));
  return { series, source: "live" };
}

export type RecommendedWindow = {
  startYmd: string;
  endYmd: string;
  avgRate: number;
};

/**
 * 집중률이 가장 낮은 연속 구간(기본 3일)을 찾아 "추천 방문 시기"로 반환한다.
 * 시리즈가 windowSize보다 짧으면 전체 구간의 평균을 반환한다.
 */
export function findRecommendedWindow(
  series: CongestionDay[],
  windowSize = 3,
): RecommendedWindow | null {
  if (series.length === 0) return null;
  const size = Math.min(windowSize, series.length);

  let bestStart = 0;
  let bestAvg = Infinity;
  for (let i = 0; i <= series.length - size; i++) {
    const window = series.slice(i, i + size);
    const avg = window.reduce((sum, d) => sum + d.cnctrRate, 0) / size;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  return {
    startYmd: series[bestStart].baseYmd,
    endYmd: series[bestStart + size - 1].baseYmd,
    avgRate: Math.round(bestAvg * 10) / 10,
  };
}
