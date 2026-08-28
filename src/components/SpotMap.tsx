"use client";

import { useEffect, useRef, useState } from "react";
import type { HubSpot } from "@/lib/tourapi/hubSpots";
import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";
import { optimizeCourse } from "@/lib/route/graph";
import {
  buildMapCongestionSignal,
  type MapCongestionSignal,
} from "@/lib/congestionSignal";

// 최적 동선 결과를 상위(page)로 올려 LLM 코스 서사에 쓰게 한다. 좌표는 브라우저 지오코딩으로만
// 확보되므로(연관 관광지에 좌표 필드 없음) 계산·리포팅을 SpotMap이 단일 지점으로 담당한다.
export type CourseStopReport = {
  name: string;
  order: number;
  distanceFromPrevKm: number;
  category?: string;
  isHub: boolean;
};
export type CourseReport = {
  stops: CourseStopReport[];
  totalDistanceKm: number;
};

// optimizeCourse 노드에 실을 데이터(이름·카테고리·좌표). 폴리라인/번호 오버레이에 좌표가 필요.
type StopData = {
  name: string;
  category?: string;
  isHub: boolean;
  lat: number;
  lng: number;
};

// F7 — 카카오맵 시각화.
// 중심 관광지는 hub API가 주는 정확한 mapX/mapY(경위도)로 마커를 찍고, 연관 관광지는
// 좌표 필드가 없어(RelatedSpot에 mapX/mapY 없음) 카카오 SDK의 services(Places) 라이브러리로
// 이름을 키워드 지오코딩해 마커를 배치한다 — 별도 REST 키 없이 JS 키 하나로 해결(계획문서 F7).

// 카카오 지도 API 타입 최소 선언(공식 @types 미설치). 사용하는 서브셋만 정의해 any를 피한다.
type KakaoLatLng = { getLat(): number; getLng(): number };
type KakaoMarkerImage = unknown;
type KakaoSize = unknown;
type KakaoMarker = {
  setMap(map: KakaoMap | null): void;
  setImage?(image: KakaoMarkerImage): void;
};
type KakaoInfoWindow = {
  open(map: KakaoMap, marker?: KakaoMarker): void;
  close(): void;
  setContent(content: string): void;
};
type KakaoBounds = { extend(latlng: KakaoLatLng): void };
type KakaoMap = { setBounds(bounds: KakaoBounds): void };
type KakaoPolyline = { setMap(map: KakaoMap | null): void };
type KakaoCustomOverlay = { setMap(map: KakaoMap | null): void };
type KakaoPlacesResult = {
  x: string;
  y: string;
  place_name?: string;
  place_url?: string;
};
type KakaoPlaces = {
  keywordSearch(
    keyword: string,
    callback: (data: KakaoPlacesResult[], status: string) => void,
    options?: { location?: KakaoLatLng; radius?: number; size?: number },
  ): void;
};

type KakaoMaps = {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: {
    position: KakaoLatLng;
    map?: KakaoMap;
    title?: string;
    image?: KakaoMarkerImage;
  }) => KakaoMarker;
  MarkerImage: new (
    src: string,
    size: KakaoSize,
    options?: { offset?: KakaoLatLng },
  ) => KakaoMarkerImage;
  Size: new (width: number, height: number) => KakaoSize;
  InfoWindow: new (options: {
    content: string;
    removable?: boolean;
    zIndex?: number;
  }) => KakaoInfoWindow;
  Polyline: new (options: {
    path: KakaoLatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
  }) => KakaoPolyline;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: string;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  event: {
    addListener(
      target: KakaoMarker,
      type: string,
      handler: () => void,
    ): void;
  };
  services: {
    Places: new () => KakaoPlaces;
    Status: { OK: string };
  };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

// SDK는 앱 전체에서 한 번만 로드한다(관광지를 바꿔도 스크립트는 재사용).
let sdkPromise: Promise<KakaoMaps> | null = null;

function loadKakaoSdk(appKey: string): Promise<KakaoMaps> {
  if (window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    // autoload=false → onload 후 kakao.maps.load()로 services 라이브러리까지 준비되면 resolve.
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("카카오 지도 SDK 초기화 실패"));
        return;
      }
      maps.load(() => resolve(maps));
    };
    script.onerror = () => {
      sdkPromise = null; // 실패 시 다음 시도에서 재로드 가능하도록.
      reject(new Error("카카오 지도 SDK 로드 실패"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function formatMd(ymd: string) {
  return `${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
}

// 인포윈도우 HTML(카카오 인포윈도우는 문자열 content만 받는다). 값은 API/카테고리명이라
// 실질적 XSS 위험은 낮지만, 최소한의 이스케이프로 마크업 깨짐을 방지한다.
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const MAX_RELATED_MARKERS = 8;
const RELATED_MARKER_GRAY = "#6d7882";

// 방문 순번 배지 오버레이 HTML(①②③…). 중심은 혼잡 데이터가 있으면 해당 단계 색으로 표시해
// 지도만 봐도 "지금 붐비는지"가 읽히게 한다. 연관 관광지는 기존 회색 유지.
function orderBadge(
  order: number,
  isHub: boolean,
  signal: MapCongestionSignal | null,
): string {
  const bg = isHub ? (signal?.color ?? "#256ef4") : "#4b5563";
  return (
    `<div style="transform:translateY(-6px);background:${bg};color:#fff;` +
    `min-width:20px;height:20px;padding:0 5px;border-radius:10px;display:flex;` +
    `align-items:center;justify-content:center;font-size:12px;font-weight:700;` +
    `border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);">${order}</div>`
  );
}

function markerImage(maps: KakaoMaps, signal: MapCongestionSignal | null) {
  const fill = signal?.color ?? RELATED_MARKER_GRAY;
  const label = signal ? `오늘 예측 ${signal.level}` : "혼잡도 미매칭";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38" role="img" aria-label="${escapeHtml(label)}">` +
    `<path d="M14 37s11-11.2 11-23A11 11 0 1 0 3 14c0 11.8 11 23 11 23Z" fill="${fill}" stroke="#fff" stroke-width="2"/>` +
    `<circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`;
  return new maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new maps.Size(28, 38),
  );
}

// 연관 관광지 지오코딩용 키워드. rlteTatsNm은 지점을 `/`로 구분(예: `신세계백화점/대구신세계점`,
// `호텔인터불고/대구`)하는데, 이 슬래시를 그대로 키워드에 넣으면 카카오 keywordSearch가 오검색한다
// (검증: `동구 신세계백화점/대구신세계점` → 엉뚱한 `배스킨라빈스 대구신세계점`이 1순위). detail.ts의
// 슬래시 처리와 같은 원리로 **슬래시 앞 본체**만 남기면 지역명+반경 편향으로 올바른 지점이 잡힌다
// (`동구 신세계백화점` → `신세계백화점 대구점`). 슬래시가 없으면 이름 전체가 그대로 쓰인다.
function buildSearchKeyword(signgu: string, name: string): string {
  const head = name.split("/")[0].trim();
  return `${signgu} ${head}`.trim();
}

// 인포윈도우 하단의 카카오맵 바로가기. `map.kakao.com/link`는 모바일에서 카카오맵 앱을, 데스크톱
// 에서 카카오맵 웹을 새 탭으로 연다(map=해당 위치 지도, to=길찾기). `placeUrl`(지오코딩으로 매칭된
// 실제 장소의 카카오 상세 URL)이 있으면 "보기"는 그 정식 URL을 써서 핀과 정확히 같은 장소를 연다 —
// 이름으로 map/이름,위경도 URL을 재구성할 때 생길 수 있는 이름/좌표 불일치를 원천 차단한다. 이름은
// 콤마 구조가 깨지지 않도록 encodeURIComponent로 감싼다.
function kakaoMapLinks(
  name: string,
  lat: number,
  lng: number,
  placeUrl?: string,
): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const n = encodeURIComponent(name);
  const base = "https://map.kakao.com/link";
  // font-size/line-height를 인라인으로 못박아 카카오 인포윈도우 높이 측정을 결정론적으로 만든다
  // (KRDS 전역 리셋·웹폰트 스왑에 따른 리플로우로 링크 줄이 밀려나는 것을 방지).
  const linkStyle =
    "color:#256ef4;font-weight:600;font-size:13px;line-height:1.5;text-decoration:none;white-space:nowrap;";
  const viewHref = placeUrl && placeUrl.startsWith("http")
    ? placeUrl
    : `${base}/map/${n},${lat},${lng}`;
  return (
    `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e6e8ea;display:flex;flex-wrap:nowrap;gap:12px;">` +
    `<a href="${escapeHtml(viewHref)}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">카카오맵에서 보기</a>` +
    `<a href="${base}/to/${n},${lat},${lng}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">길찾기</a>` +
    `</div>`
  );
}

// 중심 관광지 인포윈도우 HTML(장소명 + F2 추천 방문시기 + 카카오맵 링크). LLM 추천코스는 넣지
// 않는다 — 아래 "AI 추천 코스" 카드에서 전문을 보여준다.
function buildHubContent(
  spotName: string,
  recommended: RecommendedWindow | null,
  signal: MapCongestionSignal | null,
  lat: number,
  lng: number,
): string {
  return (
    `<div style="padding:8px 12px;font-size:13px;line-height:1.5;color:#1e2124;width:196px;">` +
    `<strong>${escapeHtml(spotName)}</strong><br/>` +
    (signal
      ? `<span style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:2px 7px;border-radius:999px;color:${signal.color};background:${signal.bg};font-size:12px;font-weight:700;">` +
        `<span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:${signal.color};"></span>` +
        `오늘 예측 ${signal.level} · ${signal.currentRate}%</span>`
      : `<span style="color:#256ef4;">중심 관광지</span>`) +
    (recommended
      ? `<br/>추천 방문 ${formatMd(recommended.startYmd)}~${formatMd(recommended.endYmd)}`
      : "") +
    (signal?.avoidPoint
      ? `<br/><span style="color:#6d7882;">최고 혼잡일 대비 ${signal.avoidPoint}p 낮은 구간</span>`
      : "") +
    kakaoMapLinks(spotName, lat, lng) +
    `</div>`
  );
}

function buildRelatedContent(
  related: RelatedSpot,
  signal: MapCongestionSignal | null,
  lat: number,
  lng: number,
  placeUrl?: string,
): string {
  return (
    `<div style="padding:8px 12px;font-size:13px;line-height:1.5;color:#1e2124;width:196px;">` +
    `<strong>${escapeHtml(related.rlteTatsNm)}</strong><br/>` +
    `<span style="color:#6d7882;">${escapeHtml(related.rlteCtgryLclsNm)} · ${escapeHtml(related.rlteCtgryMclsNm)}</span>` +
    (signal
      ? `<br/><span style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:2px 7px;border-radius:999px;color:${signal.color};background:${signal.bg};font-size:12px;font-weight:700;">` +
        `<span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:${signal.color};"></span>` +
        `오늘 예측 ${signal.level} · ${signal.currentRate}%</span>`
      : `<br/><span style="color:#6d7882;">혼잡도 미매칭</span>`) +
    kakaoMapLinks(related.rlteTatsNm, lat, lng, placeUrl) +
    `</div>`
  );
}

type CongestionResponse = {
  series?: CongestionDay[];
  recommended?: RecommendedWindow | null;
};

async function fetchRelatedCongestionSignal(
  related: RelatedSpot,
  signal?: AbortSignal,
): Promise<MapCongestionSignal | null> {
  const params = new URLSearchParams({
    areaCd: related.rlteRegnCd,
    signguCd: related.rlteSignguCd,
    spotName: related.rlteTatsNm,
  });
  const res = await fetch(`/api/congestion?${params.toString()}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as CongestionResponse;
  return buildMapCongestionSignal(data.series ?? [], data.recommended ?? null);
}

export function SpotMap({
  spot,
  related,
  recommended,
  congestionSignal,
  onCourse,
}: {
  spot: HubSpot;
  related: RelatedSpot[];
  recommended: RecommendedWindow | null;
  congestionSignal?: MapCongestionSignal | null;
  onCourse?: (course: CourseReport | null) => void;
}) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  // onCourse를 deps에 넣으면 부모의 함수 재생성으로 지도가 재초기화(재지오코딩)되므로 ref로 우회.
  const onCourseRef = useRef(onCourse);
  useEffect(() => {
    onCourseRef.current = onCourse;
  });

  // 지도를 못 그리는 경로(키 미설정)에서도 상위 코스 대기가 풀리도록 null 코스를 1회 보고한다.
  useEffect(() => {
    if (!appKey) onCourseRef.current?.(null);
  }, [appKey, spot]);

  useEffect(() => {
    // 키 미설정은 아래 렌더 폴백("지도를 불러올 수 없습니다")이 처리하므로 여기선 조용히 종료.
    if (!appKey) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const markers: KakaoMarker[] = [];
    const overlays: KakaoCustomOverlay[] = [];
    const geocoded: { data: StopData; coord: { lng: number; lat: number } }[] =
      [];
    const signalAbort = new AbortController();
    let polyline: KakaoPolyline | null = null;
    // 관광지 전환 시 로딩 표시로 되돌린다.
    setStatus("loading");

    loadKakaoSdk(appKey)
      .then((maps) => {
        if (cancelled) return;
        const lat = Number(spot.mapY);
        const lng = Number(spot.mapX);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setStatus("error");
          onCourseRef.current?.(null);
          return;
        }

        const center = new maps.LatLng(lat, lng);
        const map = new maps.Map(container, { center, level: 6 });
        const bounds = new maps.LatLngBounds();
        bounds.extend(center);
        let extended = 1;

        // 중심 관광지 — 카카오 기본 핀. 지도 중앙(center)에 위치하고, 장소명·추천 방문시기를 담은
        // 인포윈도우를 기본으로 열어둬 선택한 중심 관광지임을 나타낸다.
        const hubMarker = new maps.Marker({
          position: center,
          map,
          title: spot.hubTatsNm,
        });
        markers.push(hubMarker);
        // zIndex는 번호배지 CustomOverlay(zIndex:5)보다 높게 둬, 열린 인포윈도우가 항상 배지 위에
        // 올라오도록 한다(그렇지 않으면 배지가 박스의 글자·버튼을 가린다).
        const hubInfo = new maps.InfoWindow({
          content: buildHubContent(
            spot.hubTatsNm,
            recommended,
            congestionSignal ?? null,
            lat,
            lng,
          ),
          removable: true, // X 버튼으로 닫기.
          zIndex: 100,
        });
        hubInfo.open(map, hubMarker);
        maps.event.addListener(hubMarker, "click", () => {
          hubInfo.open(map, hubMarker);
        });

        // 연관 관광지 마커 클릭 시 재사용하는 단일 인포윈도우(동시에 하나만 열리게, X로 닫기).
        const relatedInfo = new maps.InfoWindow({
          content: "",
          removable: true,
          zIndex: 100,
        });

        const topRelated = related.slice(0, MAX_RELATED_MARKERS);
        let pending = topRelated.length;
        const ps = new maps.services.Places();

        // 지오코딩이 모두 끝난 뒤 최소 이동 동선을 계산해 폴리라인·번호배지를 그리고 상위로 보고.
        const renderCourse = () => {
          if (cancelled) return;
          const hubNode = {
            data: {
              name: spot.hubTatsNm,
              category: spot.hubCtgryLclsNm,
              isHub: true,
              lat,
              lng,
            },
            coord: { lng, lat },
          };
          const course = optimizeCourse<StopData>(hubNode, geocoded);
          if (course.stops.length >= 2) {
            const path = course.stops.map(
              (s) => new maps.LatLng(s.data.lat, s.data.lng),
            );
            polyline = new maps.Polyline({
              path,
              strokeWeight: 4,
              strokeColor: "#256ef4",
              strokeOpacity: 0.85,
              strokeStyle: "solid",
            });
            polyline.setMap(map);
          }
          course.stops.forEach((s) => {
            const ov = new maps.CustomOverlay({
              position: new maps.LatLng(s.data.lat, s.data.lng),
              content: orderBadge(
                s.order,
                s.data.isHub,
                congestionSignal ?? null,
              ),
              yAnchor: 2.4,
              xAnchor: 0.5,
              zIndex: 5,
            });
            ov.setMap(map);
            overlays.push(ov);
          });
          onCourseRef.current?.({
            stops: course.stops.map((s) => ({
              name: s.data.name,
              order: s.order,
              distanceFromPrevKm: s.distanceFromPrevKm,
              category: s.data.category,
              isHub: s.data.isHub,
            })),
            totalDistanceKm: course.totalDistanceKm,
          });
        };

        const finish = () => {
          if (cancelled) return;
          // 연관 마커가 하나라도 붙었으면 전체를 담도록 뷰포트 조정(단일 지점이면 확대 과함 방지).
          if (extended > 1) map.setBounds(bounds);
          renderCourse();
        };

        if (topRelated.length === 0) {
          renderCourse();
          setStatus("ready");
        } else {
          topRelated.forEach((r) => {
            // 지역명을 붙여 동명 관광지 오검색을 줄이고, 중심 좌표 반경으로 편향.
            // 슬래시 지점명은 본체만 남긴다(buildSearchKeyword 주석 참고).
            const keyword = buildSearchKeyword(r.rlteSignguNm, r.rlteTatsNm);
            ps.keywordSearch(
              keyword,
              (data, searchStatus) => {
                if (cancelled) return;
                if (searchStatus === maps.services.Status.OK && data[0]) {
                  const pos = new maps.LatLng(
                    Number(data[0].y),
                    Number(data[0].x),
                  );
                  const marker = new maps.Marker({
                    position: pos,
                    map,
                    title: r.rlteTatsNm,
                    image: markerImage(maps, null),
                  });
                  markers.push(marker);
                  bounds.extend(pos);
                  extended += 1;
                  const rLat = Number(data[0].y);
                  const rLng = Number(data[0].x);
                  const rPlaceUrl = data[0].place_url;
                  let relatedSignal: MapCongestionSignal | null = null;
                  geocoded.push({
                    data: {
                      name: r.rlteTatsNm,
                      category: r.rlteCtgryLclsNm,
                      isHub: false,
                      lat: rLat,
                      lng: rLng,
                    },
                    coord: { lng: rLng, lat: rLat },
                  });
                  maps.event.addListener(marker, "click", () => {
                    relatedInfo.setContent(
                      buildRelatedContent(
                        r,
                        relatedSignal,
                        rLat,
                        rLng,
                        rPlaceUrl,
                      ),
                    );
                    relatedInfo.open(map, marker);
                  });
                  fetchRelatedCongestionSignal(r, signalAbort.signal)
                    .then((signal) => {
                      if (cancelled || !signal) return;
                      relatedSignal = signal;
                      marker.setImage?.(markerImage(maps, signal));
                    })
                    .catch(() => {
                      // 부가 혼잡 레이어는 실패해도 회색 마커로 유지한다.
                    });
                }
                pending -= 1;
                if (pending === 0) {
                  finish();
                  setStatus("ready");
                }
              },
              { location: center, radius: 10000, size: 1 },
            );
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        onCourseRef.current?.(null);
      });

    return () => {
      cancelled = true;
      signalAbort.abort();
      markers.forEach((m) => m.setMap(null));
      overlays.forEach((o) => o.setMap(null));
      polyline?.setMap(null);
    };
  }, [appKey, spot, related, recommended, congestionSignal]);

  // 키 미설정 등으로 지도를 못 그릴 때의 폴백(계획문서 F7: "지도 준비중" degrade).
  if (!appKey || status === "error") {
    return (
      <div
        className="flex h-[360px] w-full items-center justify-center rounded-[10px] text-[14px]"
        style={{
          backgroundColor: "#f4f5f6" /* --krds-color-light-gray-5 */,
          border: "1px solid #e6e8ea" /* --krds-color-light-gray-10 */,
          color: "#6d7882" /* --krds-color-light-gray-50 */,
        }}
      >
        지도를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="kakao-map-root h-[360px] w-full rounded-[10px]"
        style={{ border: "1px solid #cdd1d5" /* --krds-color-light-gray-20 */ }}
      />
      {congestionSignal && (
        <div
          className="pointer-events-none absolute right-[12px] top-[12px] rounded-[10px] px-[12px] py-[10px] text-[13px] shadow-sm"
          style={{
            backgroundColor: "rgba(255,255,255,.94)",
            border: "1px solid #e6e8ea",
            color: "#1e2124",
          }}
        >
          <div className="flex items-center gap-[7px] font-semibold">
            <span
              className="h-[9px] w-[9px] rounded-full"
              style={{ backgroundColor: congestionSignal.color }}
              aria-hidden="true"
            />
            오늘 예측 {congestionSignal.level}
          </div>
          <div className="mt-[2px]" style={{ color: "#6d7882" }}>
            집중률 {congestionSignal.currentRate}%
            {congestionSignal.avoidPoint
              ? ` · 추천 구간 ${congestionSignal.avoidPoint}p↓`
              : ""}
          </div>
        </div>
      )}
      {status === "loading" && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[10px] text-[14px]"
          style={{
            backgroundColor: "#f4f5f6",
            color: "#6d7882",
          }}
        >
          지도를 불러오는 중...
        </div>
      )}
    </div>
  );
}
