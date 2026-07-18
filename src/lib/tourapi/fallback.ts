/**
 * 데모용 정적 폴백 데이터 (PRD §8 데모 안정성, §10 데이터 커버리지 리스크).
 *
 * 공모전 시연 중 data.go.kr 공공데이터 API가 실패(네트워크·쿼터·장애)해도 플로우가 끊기지
 * 않도록, 대표 지역(서울 종로구, areaCd=11 / signguCd=11110)의 응답을 스냅샷해 둔다. 각 fetch
 * 함수는 upstream 호출이 throw할 때만 이 캐시로 degrade하며(빈 결과는 정상 상태라 폴백하지
 * 않음), 반환값의 `source: "fallback"`로 폴백 여부를 알린다.
 *
 * 스냅샷은 `.claude`/scripts 없이 캡처했고(2026년 기준월 202606), 종로구 hub 30개 스팟에 대한
 * 최종 가공 결과다: hub 목록, hubTatsNm→집중률 시계열, hubTatsCd→연관 관광지. 다른 지역은
 * 폴백이 없어 기존대로 502로 degrade한다. 이 데이터는 API Route(서버)에서만 로드된다
 * (클라이언트는 타입만 import하므로 번들에 포함되지 않음).
 */
import type { HubSpot } from "./hubSpots";
import type { CongestionDay } from "./congestion";
import type { RelatedSpot } from "./relatedSpots";
import hub11110 from "./fallback/hub-11-11110.json";
import congestion11110 from "./fallback/congestion-11-11110.json";
import related11110 from "./fallback/related-11-11110.json";

export type FetchSource = "live" | "fallback";

const keyOf = (areaCd: string, signguCd: string) => `${areaCd}:${signguCd}`;

type HubFallback = { items: HubSpot[]; baseYm: string };
type CongestionFallback = Record<string, CongestionDay[]>; // hubTatsNm → series
type RelatedFallback = { baseYm: string; byCode: Record<string, RelatedSpot[]> }; // hubTatsCd → items

const HUB: Record<string, HubFallback> = {
  [keyOf("11", "11110")]: hub11110 as unknown as HubFallback,
};
const CONGESTION: Record<string, CongestionFallback> = {
  [keyOf("11", "11110")]: congestion11110 as unknown as CongestionFallback,
};
const RELATED: Record<string, RelatedFallback> = {
  [keyOf("11", "11110")]: related11110 as unknown as RelatedFallback,
};

/** 캐시된 지역이면 hub 목록을, 아니면 null. */
export function getFallbackHubSpots(
  areaCd: string,
  signguCd: string,
): HubFallback | null {
  return HUB[keyOf(areaCd, signguCd)] ?? null;
}

/**
 * 캐시된 지역이면 해당 관광지의 집중률 시계열을 반환한다. 지역은 캐시돼 있으나 그 관광지의
 * 데이터가 없으면 빈 배열(정상적인 "데이터 없음" 상태)을, 지역 자체가 캐시에 없으면 null을 반환.
 */
export function getFallbackCongestion(
  areaCd: string,
  signguCd: string,
  spotName: string,
): CongestionDay[] | null {
  const region = CONGESTION[keyOf(areaCd, signguCd)];
  if (!region) return null;
  return region[spotName] ?? [];
}

/** 캐시된 지역이면 해당 관광지 코드의 연관 관광지 목록을, 아니면 null. */
export function getFallbackRelated(
  areaCd: string,
  signguCd: string,
  tAtsCd: string,
): { items: RelatedSpot[]; baseYm: string } | null {
  const region = RELATED[keyOf(areaCd, signguCd)];
  if (!region) return null;
  return { items: region.byCode[tAtsCd] ?? [], baseYm: region.baseYm };
}
