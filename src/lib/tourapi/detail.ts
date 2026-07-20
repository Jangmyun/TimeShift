import { callTourApi } from "./client";

/**
 * 중심 관광지 상세정보·이미지 보강 (PRD §7: TourAPI 국문관광정보서비스 detailCommon2).
 *
 * 중심/집중률/연관 API는 자체 코드체계를 쓰고 TourAPI `contentId`와 공유 키가 없다. 그래서
 * 이름(`searchKeyword2`)으로 후보를 찾고, hub 스팟의 정확한 mapX/mapY로 **가장 가까운 후보를
 * 골라 동명 장소를 disambiguation**한다(좌표만으론 경복궁 자리에서 인접한 건청궁이 잡히는 등
 * 부정확 → 이름+좌표 병용이 가장 정확). 확정한 contentId로 `detailCommon2`를 호출해 개요·홈페이지를
 * 얻는다. 순수 보강이라 실패하면 코어 플로우(차트·연관·지도)에 영향 없이 null로 degrade한다.
 */
export type SpotDetail = {
  contentId: string;
  title: string;
  image: string | null;
  address: string | null;
  homepage: string | null;
  overview: string | null;
};

const ENDPOINT = process.env.TOURAPI_DETAIL_ENDPOINT ?? "";
const SERVICE_KEY = process.env.TOURAPI_DETAIL_KEY_DECODED ?? "";

type SearchItem = {
  contentid: string;
  title: string;
  firstimage?: string;
  addr1?: string;
  mapx?: string;
  mapy?: string;
};
type CommonItem = {
  contentid: string;
  title: string;
  firstimage?: string;
  addr1?: string;
  homepage?: string;
  overview?: string;
};

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 엉뚱한 원거리 매칭(동명 다른 지역·부분일치 오검색)을 거르는 거리 임계. 관광지 중심 좌표와
// TourAPI 등록 좌표는 약간 다를 수 있어 넉넉히 2.5km. 이보다 멀면 보강을 생략(null)한다.
const MAX_MATCH_KM = 2.5;

/** 경위도 → 대략 km 거리(소규모 반경 평면 근사, 위도 37.5° 기준 경도 스케일 보정). */
function distKm(x1: number, y1: number, x2: number, y2: number): number {
  const dLat = (y1 - y2) * 111;
  const dLng = (x1 - x2) * 88;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * 후보 선택: 이름이 정확히 일치하는 후보를 우선한다(searchKeyword2는 같은 좌표의 행사·축제
 * "경복궁 별빛야행"도 반환 → 좌표만으론 이벤트를 집을 수 있다). 정확 일치군(없으면 전체)에서
 * hub 좌표에 가장 가까운 후보로 동명 장소를 disambiguation하고, 그 거리가 임계를 넘으면 null.
 */
function pickBest(
  candidates: SearchItem[],
  spotName: string,
  hubX: number,
  hubY: number,
): SearchItem | null {
  const target = normalize(spotName);
  const exact = candidates.filter((c) => normalize(c.title) === target);
  const pool = exact.length > 0 ? exact : candidates;

  if (!Number.isFinite(hubX) || !Number.isFinite(hubY)) return pool[0];

  let best: SearchItem | null = null;
  let bestDist = Infinity;
  for (const c of pool) {
    const cx = Number(c.mapx);
    const cy = Number(c.mapy);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const d = distKm(cx, cy, hubX, hubY);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (!best) return pool[0]; // 후보에 좌표가 전혀 없으면 최상위로.
  return bestDist <= MAX_MATCH_KM ? best : null;
}

/**
 * 이미지 URL을 next/image에 안전하게 넘길 수 있는 형태로 정규화한다.
 * - http → https (visitkorea CDN이 http로 내려오는 경우가 있음)
 * - **호스트가 허용 목록(visitkorea 서브도메인) 밖이면 null**. next.config의 remotePatterns에
 *   없는 호스트를 `<Image src>`에 넘기면 렌더 중 throw되어 페이지 전체가 크래시하므로, 여기서
 *   걸러 이미지 없이 degrade한다. 허용 호스트는 next.config.ts의 remotePatterns와 반드시 일치.
 */
function safeImage(url?: string | null): string | null {
  if (!url) return null;
  const https = url.replace(/^http:\/\//i, "https://");
  try {
    const host = new URL(https).hostname;
    return host.endsWith(".visitkorea.or.kr") ? https : null;
  } catch {
    return null;
  }
}

/** detailCommon2의 homepage 필드는 보통 `<a href="URL" ...>URL</a>` 마크업 → 순수 URL만 추출. */
function cleanHomepage(raw?: string): string | null {
  if (!raw) return null;
  const hrefMatch = raw.match(/href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1];
  const urlMatch = raw.match(/https?:\/\/[^\s"'<)]+/i);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * 검색 키워드 후보(순서대로 시도, 첫 비어있지 않은 결과 사용). hub 이름은 지점 구분에 "/"를
 * 쓰지만(예: "국립현대미술관/서울관") TourAPI는 공백 표기라 정확 검색이 실패한다. "/"를 공백으로
 * 바꾸고, 그래도 없으면 "/" 앞부분만으로 넓혀 검색한 뒤 좌표로 정확한 지점을 고른다.
 */
function keywordVariants(spotName: string): string[] {
  const variants = [spotName];
  if (spotName.includes("/")) {
    variants.push(spotName.replace(/\//g, " "));
    variants.push(spotName.split("/")[0].trim());
  }
  return Array.from(new Set(variants.filter(Boolean)));
}

export async function fetchSpotDetail(
  spotName: string,
  mapX: string,
  mapY: string,
): Promise<SpotDetail | null> {
  try {
    let candidates: SearchItem[] = [];
    for (const kw of keywordVariants(spotName)) {
      candidates = await callTourApi<SearchItem>(
        ENDPOINT,
        SERVICE_KEY,
        "searchKeyword2",
        { keyword: kw, numOfRows: 20, pageNo: 1, arrange: "A" },
      );
      if (candidates.length > 0) break;
    }
    if (candidates.length === 0) return null;

    const best = pickBest(candidates, spotName, Number(mapX), Number(mapY));
    if (!best) return null; // 거리 임계 초과 → 오매칭 가능성, 보강 생략.

    let common: CommonItem | undefined;
    try {
      const rows = await callTourApi<CommonItem>(
        ENDPOINT,
        SERVICE_KEY,
        "detailCommon2",
        { contentId: best.contentid },
      );
      common = rows[0];
    } catch {
      // 개요 조회 실패 시에도 검색 결과(이미지/주소)만으로 최소 보강.
    }

    return {
      contentId: best.contentid,
      title: common?.title || best.title,
      image: safeImage(best.firstimage || common?.firstimage),
      address: common?.addr1 || best.addr1 || null,
      homepage: cleanHomepage(common?.homepage),
      overview: common?.overview || null,
    };
  } catch {
    // 순수 보강 기능 → 실패는 조용히 생략(코어 플로우 무영향).
    return null;
  }
}
