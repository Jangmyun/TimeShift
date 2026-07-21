/**
 * 경위도 거리 유틸 (그래프 기반 동선 최적화 F3+).
 *
 * `detail.ts`의 private 평면 근사(distKm)를 일반화한 공용 haversine. 관광지 간 거리는
 * 수십 km까지 벌어질 수 있어(연관 관광지가 인접 시/군/구인 경우) 위도 스케일 보정만으로는
 * 오차가 커지므로, 구면 거리(haversine)를 쓴다. 순수 함수라 클라이언트/서버 양쪽에서 쓰인다.
 */

export type LngLat = { lng: number; lat: number };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 두 지점(경위도) 사이의 대권 거리(km). */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * TourAPI 계열의 mapX(경도)/mapY(위도) 문자열을 LngLat로 파싱한다.
 * 값이 없거나 숫자가 아니면 null (좌표 없는 노드는 그래프에서 제외).
 */
export function parseLngLat(
  mapX: string | number | undefined | null,
  mapY: string | number | undefined | null,
): LngLat | null {
  const lng = Number(mapX);
  const lat = Number(mapY);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  // 대한민국 경위도 대략 범위 밖이면 오염된 값으로 보고 제외.
  if (lng < 124 || lng > 132 || lat < 33 || lat > 39) return null;
  return { lng, lat };
}
