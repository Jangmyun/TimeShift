import { callTourApi } from "./client";

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
 * tatsCnctrRatedList는 관광지 단위 필터 파라미터를 지원하지 않고, 해당 시/군/구 내
 * 모든 관광지의 향후 30일 집중률을 한 번에 반환한다. 따라서 시/군/구 전체를 한 번에
 * 조회한 뒤 관광지명(tAtsNm)으로 필터링한다 — spotName은 F1 hub spot의 hubTatsNm과
 * 정확히 일치해야 한다.
 */
export async function fetchCongestion(
  areaCd: string,
  signguCd: string,
  spotName: string,
): Promise<CongestionDay[]> {
  const items = await callTourApi<CongestionApiItem>(
    ENDPOINT,
    SERVICE_KEY,
    "tatsCnctrRatedList",
    { areaCd, signguCd, numOfRows: 5000, pageNo: 1 },
  );

  return items
    .filter((item) => item.tAtsNm === spotName)
    .map((item) => ({
      baseYmd: item.baseYmd,
      cnctrRate: Number(item.cnctrRate),
    }))
    .sort((a, b) => a.baseYmd.localeCompare(b.baseYmd));
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
