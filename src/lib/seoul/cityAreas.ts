/**
 * 서울시 실시간 도시데이터(citydata_ppltn)가 커버하는 주요 명소(핫스팟) 목록 — 시간대별 혼잡 축.
 *
 * citydata_ppltn은 관광지 코드가 아니라 **구역명(AREA_NM)**으로 조회하고, 서울 116곳 핫스팟
 * (관광특구·고궁·공원·인구밀집지역)만 커버한다. 중심 관광지(hub)에는 실시간/시간대 데이터가
 * 없으므로, hub의 mapX/mapY를 이 표의 구역 중심 좌표와 최근접 매칭해 대응 구역을 찾는다
 * (regions.ts가 법정동코드 표를 하드코딩하는 것과 같은 이유 — 확정된 공개 매핑이 없다).
 *
 * 아래 좌표는 각 구역 대표 지점의 경위도(대략값)다. AREA_NM은 서울열린데이터광장에 등록된
 * 구역명과 정확히 일치해야 조회되므로, 최초 라이브 호출로 응답의 AREA_NM을 대조해 확정한다
 * (PRD §10 "응답 구조 실호출 검증" 패턴). 커버되지 않은 관광지는 이 표에서 매칭되지 않아
 * 시간대 데이터 없이 날짜 축만 쓰는 정직한 폴백으로 동작한다. 구역 추가/정정 시 이 파일을 갱신.
 */
import { haversineKm, type LngLat } from "@/lib/route/geo";

export type CityArea = { areaNm: string; coord: LngLat };

// 서울 도심·강남·한강 주요 관광 구역 위주의 대표 부분집합. 전체 116곳 중 관광 동선과
// 관련성 높은 구역을 우선 수록했다(전체가 필요하면 라이브 목록으로 확장).
export const CITY_AREAS: CityArea[] = [
  { areaNm: "광화문·덕수궁", coord: { lng: 126.9769, lat: 37.57 } },
  { areaNm: "경복궁", coord: { lng: 126.977, lat: 37.5796 } },
  { areaNm: "북촌한옥마을", coord: { lng: 126.985, lat: 37.5826 } },
  { areaNm: "서촌", coord: { lng: 126.9702, lat: 37.5797 } },
  { areaNm: "인사동", coord: { lng: 126.9856, lat: 37.574 } },
  { areaNm: "익선동", coord: { lng: 126.9905, lat: 37.5726 } },
  { areaNm: "창덕궁·종묘", coord: { lng: 126.992, lat: 37.5794 } },
  { areaNm: "명동 관광특구", coord: { lng: 126.985, lat: 37.5636 } },
  { areaNm: "남대문시장", coord: { lng: 126.9776, lat: 37.559 } },
  { areaNm: "서울역", coord: { lng: 126.9707, lat: 37.5547 } },
  { areaNm: "남산공원", coord: { lng: 126.991, lat: 37.5512 } },
  { areaNm: "이태원 관광특구", coord: { lng: 126.9945, lat: 37.5345 } },
  { areaNm: "동대문 관광특구", coord: { lng: 127.0094, lat: 37.5707 } },
  { areaNm: "종로·청계 관광특구", coord: { lng: 126.9982, lat: 37.5698 } },
  { areaNm: "대학로", coord: { lng: 127.0027, lat: 37.5822 } },
  { areaNm: "홍대 관광특구", coord: { lng: 126.9237, lat: 37.5563 } },
  { areaNm: "여의도", coord: { lng: 126.9245, lat: 37.5215 } },
  { areaNm: "여의도한강공원", coord: { lng: 126.9331, lat: 37.5285 } },
  { areaNm: "강남역", coord: { lng: 127.0276, lat: 37.4979 } },
  { areaNm: "가로수길", coord: { lng: 127.023, lat: 37.5206 } },
  { areaNm: "압구정로데오거리", coord: { lng: 127.0405, lat: 37.5273 } },
  { areaNm: "코엑스", coord: { lng: 127.0587, lat: 37.5115 } },
  { areaNm: "잠실 관광특구", coord: { lng: 127.098, lat: 37.5111 } },
  { areaNm: "잠실한강공원", coord: { lng: 127.0824, lat: 37.5177 } },
  { areaNm: "뚝섬한강공원", coord: { lng: 127.0699, lat: 37.5299 } },
  { areaNm: "서울숲공원", coord: { lng: 127.0416, lat: 37.5443 } },
  { areaNm: "성수카페거리", coord: { lng: 127.0557, lat: 37.5443 } },
  { areaNm: "반포한강공원", coord: { lng: 126.9966, lat: 37.51 } },
  { areaNm: "국립중앙박물관·용산가족공원", coord: { lng: 126.98, lat: 37.5238 } },
  { areaNm: "노량진", coord: { lng: 126.9421, lat: 37.5131 } },
  { areaNm: "김포공항", coord: { lng: 126.8016, lat: 37.5583 } },
  { areaNm: "어린이대공원", coord: { lng: 127.0817, lat: 37.5497 } },
  { areaNm: "건대입구역", coord: { lng: 127.0702, lat: 37.5404 } },
];

// hub↔구역 매칭 최대 거리(km). 이보다 멀면 "이 관광지에는 시간대 데이터 없음"으로 처리.
const MAX_AREA_MATCH_KM = 1.8;

/** 좌표에 가장 가까운 서울 핫스팟 구역을 임계 거리 내에서 찾는다. 없으면 null. */
export function resolveCityArea(coord: LngLat): CityArea | null {
  let best: CityArea | null = null;
  let bestDist = Infinity;
  for (const area of CITY_AREAS) {
    const d = haversineKm(coord, area.coord);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best && bestDist <= MAX_AREA_MATCH_KM ? best : null;
}
