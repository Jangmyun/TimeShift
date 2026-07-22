/**
 * 서울시 실시간 도시데이터(citydata_ppltn)가 커버하는 주요 명소(핫스팟) 전체 목록 — 시간대별 혼잡 축.
 *
 * citydata_ppltn은 관광지 코드가 아니라 **구역명(AREA_NM)**으로 조회하고, 서울 121곳 핫스팟
 * (고궁·문화유산·관광특구·공원·발달상권·인구밀집지역)만 커버한다. 중심 관광지(hub)에는 실시간/시간대
 * 데이터가 없으므로, hub의 mapX/mapY를 이 표의 구역 중심 좌표와 최근접 매칭해 대응 구역을 찾는다
 * (regions.ts가 법정동코드 표를 하드코딩하는 것과 같은 이유). `AREA_NM`은 등록 구역명과 **정확히
 * 일치**해야 조회되므로 표기(공백·가운뎃점)를 그대로 보존한다. 커버되지 않은 관광지는 매칭되지 않아
 * 시간대 데이터 없이 날짜 축만 쓰는 정직한 폴백으로 동작한다.
 *
 * 이 표는 서울열린데이터광장 실시간 도시데이터의 핫스팟 목록 API에서 이름+중심좌표를 그대로 캡처한
 * 것이다(2026-07-22 기준 121곳). 갱신하려면 아래를 재실행해 area_nm(=AREA_NM)·x(위도)·y(경도)를 다시 뜬다:
 *   curl 'https://data.seoul.go.kr/SeoulRtd/api/hotspot-category?page=1&category=전체보기&count=300'
 *     -H 'Referer: https://data.seoul.go.kr/SeoulRtd/'
 * (응답 row의 x=위도/y=경도. 구역 추가·정정 시 이 파일을 갱신.)
 */
import { haversineKm, type LngLat } from "@/lib/route/geo";

export type CityArea = { areaNm: string; coord: LngLat };

export const CITY_AREAS: CityArea[] = [
  // 고궁·문화유산 (5)
  { areaNm: "경복궁", coord: { lng: 126.976765, lat: 37.579876 } },
  { areaNm: "광화문·덕수궁", coord: { lng: 126.977186, lat: 37.570931 } },
  { areaNm: "보신각", coord: { lng: 126.983411, lat: 37.570585 } },
  { areaNm: "서울 암사동 유적", coord: { lng: 127.130759, lat: 37.560632 } },
  { areaNm: "창덕궁·종묘", coord: { lng: 126.993353, lat: 37.578696 } },
  // 관광특구 (7)
  { areaNm: "강남 MICE 관광특구", coord: { lng: 127.060063, lat: 37.511 } },
  { areaNm: "동대문 관광특구", coord: { lng: 127.011023, lat: 37.567311 } },
  { areaNm: "명동 관광특구", coord: { lng: 126.981851, lat: 37.564149 } },
  { areaNm: "이태원 관광특구", coord: { lng: 126.994373, lat: 37.534438 } },
  { areaNm: "잠실 관광특구", coord: { lng: 127.115274, lat: 37.516479 } },
  { areaNm: "종로·청계 관광특구", coord: { lng: 126.99737, lat: 37.570002 } },
  { areaNm: "홍대 관광특구", coord: { lng: 126.921274, lat: 37.553919 } },
  // 공원 (33)
  { areaNm: "강서한강공원", coord: { lng: 126.818549, lat: 37.586514 } },
  { areaNm: "고척돔", coord: { lng: 126.867023, lat: 37.497672 } },
  { areaNm: "광나루한강공원", coord: { lng: 127.12982, lat: 37.553988 } },
  { areaNm: "광화문광장", coord: { lng: 126.976921, lat: 37.573409 } },
  { areaNm: "국립중앙박물관·용산가족공원", coord: { lng: 126.981427, lat: 37.522768 } },
  { areaNm: "난지한강공원", coord: { lng: 126.877328, lat: 37.566502 } },
  { areaNm: "남산공원", coord: { lng: 126.993762, lat: 37.551577 } },
  { areaNm: "노들섬", coord: { lng: 126.958661, lat: 37.517557 } },
  { areaNm: "뚝섬한강공원", coord: { lng: 127.071515, lat: 37.529184 } },
  { areaNm: "망원한강공원", coord: { lng: 126.899268, lat: 37.553281 } },
  { areaNm: "반포한강공원", coord: { lng: 126.994675, lat: 37.509825 } },
  { areaNm: "보라매공원", coord: { lng: 126.920056, lat: 37.492963 } },
  { areaNm: "북서울꿈의숲", coord: { lng: 127.041116, lat: 37.621852 } },
  { areaNm: "서대문독립공원", coord: { lng: 126.956607, lat: 37.574091 } },
  { areaNm: "서리풀공원·몽마르뜨공원", coord: { lng: 127.002683, lat: 37.491583 } },
  { areaNm: "서울대공원", coord: { lng: 127.017156, lat: 37.429007 } },
  { areaNm: "서울숲공원", coord: { lng: 127.037648, lat: 37.542963 } },
  { areaNm: "송현녹지광장", coord: { lng: 126.983711, lat: 37.577857 } },
  { areaNm: "아차산", coord: { lng: 127.102811, lat: 37.566842 } },
  { areaNm: "안양천", coord: { lng: 126.879697, lat: 37.518668 } },
  { areaNm: "양화한강공원", coord: { lng: 126.898185, lat: 37.541305 } },
  { areaNm: "어린이대공원", coord: { lng: 127.081361, lat: 37.549062 } },
  { areaNm: "여의도한강공원", coord: { lng: 126.928223, lat: 37.528987 } },
  { areaNm: "여의서로", coord: { lng: 126.914584, lat: 37.532701 } },
  { areaNm: "올림픽공원", coord: { lng: 127.122411, lat: 37.519408 } },
  { areaNm: "월드컵공원", coord: { lng: 126.884201, lat: 37.570188 } },
  { areaNm: "응봉산", coord: { lng: 127.030466, lat: 37.548215 } },
  { areaNm: "이촌한강공원", coord: { lng: 126.966651, lat: 37.519401 } },
  { areaNm: "잠실종합운동장", coord: { lng: 127.073648, lat: 37.514522 } },
  { areaNm: "잠실한강공원", coord: { lng: 127.084298, lat: 37.519234 } },
  { areaNm: "잠원한강공원", coord: { lng: 127.014728, lat: 37.52381 } },
  { areaNm: "청계산", coord: { lng: 127.050018, lat: 37.440739 } },
  { areaNm: "홍제폭포", coord: { lng: 126.936983, lat: 37.580788 } },
  // 발달상권 (28)
  { areaNm: "DDP(동대문디자인플라자)", coord: { lng: 127.010289, lat: 37.566988 } },
  { areaNm: "DMC(디지털미디어시티)", coord: { lng: 126.891794, lat: 37.579278 } },
  { areaNm: "가락시장", coord: { lng: 127.111896, lat: 37.493468 } },
  { areaNm: "가로수길", coord: { lng: 127.023572, lat: 37.521389 } },
  { areaNm: "광장(전통)시장", coord: { lng: 126.999904, lat: 37.570003 } },
  { areaNm: "김포공항", coord: { lng: 126.802599, lat: 37.562272 } },
  { areaNm: "남대문시장", coord: { lng: 126.978527, lat: 37.559915 } },
  { areaNm: "노량진", coord: { lng: 126.944056, lat: 37.513894 } },
  { areaNm: "덕수궁길·정동길", coord: { lng: 126.971785, lat: 37.566351 } },
  { areaNm: "북창동 먹자골목", coord: { lng: 126.978498, lat: 37.562264 } },
  { areaNm: "북촌한옥마을", coord: { lng: 126.984002, lat: 37.582236 } },
  { areaNm: "서촌", coord: { lng: 126.969575, lat: 37.580367 } },
  { areaNm: "성수카페거리", coord: { lng: 127.056596, lat: 37.542967 } },
  { areaNm: "송리단길·호수단길", coord: { lng: 127.106314, lat: 37.508047 } },
  { areaNm: "신촌 스타광장", coord: { lng: 126.936931, lat: 37.556509 } },
  { areaNm: "압구정로데오거리", coord: { lng: 127.038734, lat: 37.525495 } },
  { areaNm: "여의도", coord: { lng: 126.925531, lat: 37.525022 } },
  { areaNm: "연남동", coord: { lng: 126.92234, lat: 37.561618 } },
  { areaNm: "영등포 타임스퀘어", coord: { lng: 126.906151, lat: 37.516863 } },
  { areaNm: "용리단길", coord: { lng: 126.971294, lat: 37.531186 } },
  { areaNm: "이태원 앤틱가구거리", coord: { lng: 126.993918, lat: 37.532231 } },
  { areaNm: "익선동", coord: { lng: 126.989631, lat: 37.572661 } },
  { areaNm: "인사동", coord: { lng: 126.986063, lat: 37.573863 } },
  { areaNm: "잠실롯데타워·석촌호수", coord: { lng: 127.103306, lat: 37.511559 } },
  { areaNm: "창동 신경제 중심지", coord: { lng: 127.054706, lat: 37.656148 } },
  { areaNm: "청담동 명품거리", coord: { lng: 127.043765, lat: 37.525832 } },
  { areaNm: "청량리 제기동 일대 전통시장", coord: { lng: 127.039981, lat: 37.58083 } },
  { areaNm: "해방촌·경리단길", coord: { lng: 126.987183, lat: 37.542371 } },
  // 인구밀집지역 (48)
  { areaNm: "가산디지털단지역", coord: { lng: 126.880107, lat: 37.48089 } },
  { areaNm: "강남역", coord: { lng: 127.028134, lat: 37.498857 } },
  { areaNm: "건대입구역", coord: { lng: 127.068195, lat: 37.539967 } },
  { areaNm: "고덕역", coord: { lng: 127.154872, lat: 37.553455 } },
  { areaNm: "고속터미널역", coord: { lng: 127.005855, lat: 37.504814 } },
  { areaNm: "교대역", coord: { lng: 127.013958, lat: 37.492201 } },
  { areaNm: "구로디지털단지역", coord: { lng: 126.896183, lat: 37.483878 } },
  { areaNm: "구로역", coord: { lng: 126.882122, lat: 37.50235 } },
  { areaNm: "군자역", coord: { lng: 127.080195, lat: 37.556316 } },
  { areaNm: "대림역", coord: { lng: 126.895543, lat: 37.492667 } },
  { areaNm: "동대문역", coord: { lng: 127.009654, lat: 37.571481 } },
  { areaNm: "뚝섬역", coord: { lng: 127.046137, lat: 37.548291 } },
  { areaNm: "미아사거리역", coord: { lng: 127.030741, lat: 37.612195 } },
  { areaNm: "발산역", coord: { lng: 126.839173, lat: 37.559151 } },
  { areaNm: "사당역", coord: { lng: 126.981266, lat: 37.477931 } },
  { areaNm: "삼각지역", coord: { lng: 126.973884, lat: 37.535341 } },
  { areaNm: "서울대입구역", coord: { lng: 126.953063, lat: 37.480613 } },
  { areaNm: "서울식물원·마곡나루역", coord: { lng: 126.831061, lat: 37.567597 } },
  { areaNm: "서울역", coord: { lng: 126.973028, lat: 37.556594 } },
  { areaNm: "선릉역", coord: { lng: 127.049807, lat: 37.506054 } },
  { areaNm: "성신여대입구역", coord: { lng: 127.016865, lat: 37.592393 } },
  { areaNm: "수유역", coord: { lng: 127.025722, lat: 37.64106 } },
  { areaNm: "숭례문", coord: { lng: 126.975729, lat: 37.560486 } },
  { areaNm: "시의회 앞", coord: { lng: 126.976939, lat: 37.567069 } },
  { areaNm: "신논현역·논현역", coord: { lng: 127.023406, lat: 37.50808 } },
  { areaNm: "신도림역", coord: { lng: 126.890205, lat: 37.509099 } },
  { areaNm: "신림역", coord: { lng: 126.929337, lat: 37.484677 } },
  { areaNm: "신정네거리역", coord: { lng: 126.855275, lat: 37.521306 } },
  { areaNm: "신촌·이대역", coord: { lng: 126.938972, lat: 37.557035 } },
  { areaNm: "쌍문역", coord: { lng: 127.033089, lat: 37.647762 } },
  { areaNm: "양재역", coord: { lng: 127.033972, lat: 37.485339 } },
  { areaNm: "역삼역", coord: { lng: 127.038184, lat: 37.500392 } },
  { areaNm: "연신내역", coord: { lng: 126.920725, lat: 37.618659 } },
  { areaNm: "오목교역·목동운동장", coord: { lng: 126.876641, lat: 37.528811 } },
  { areaNm: "왕십리역", coord: { lng: 127.0389, lat: 37.562216 } },
  { areaNm: "용산역", coord: { lng: 126.960822, lat: 37.530256 } },
  { areaNm: "이태원역", coord: { lng: 126.993048, lat: 37.534186 } },
  { areaNm: "잠실새내역", coord: { lng: 127.082656, lat: 37.510413 } },
  { areaNm: "잠실역", coord: { lng: 127.100367, lat: 37.511997 } },
  { areaNm: "장지역", coord: { lng: 127.123275, lat: 37.47875 } },
  { areaNm: "장한평역", coord: { lng: 127.064786, lat: 37.561804 } },
  { areaNm: "천호역", coord: { lng: 127.125013, lat: 37.539239 } },
  { areaNm: "총신대입구(이수)역", coord: { lng: 126.981042, lat: 37.486003 } },
  { areaNm: "충정로역", coord: { lng: 126.963691, lat: 37.559696 } },
  { areaNm: "합정역", coord: { lng: 126.911735, lat: 37.549376 } },
  { areaNm: "혜화역", coord: { lng: 127.001764, lat: 37.582482 } },
  { areaNm: "홍대입구역(2호선)", coord: { lng: 126.923008, lat: 37.556762 } },
  { areaNm: "회기역", coord: { lng: 127.056162, lat: 37.59054 } },
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
