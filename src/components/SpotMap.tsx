"use client";

import { useEffect, useRef, useState } from "react";
import type { HubSpot } from "@/lib/tourapi/hubSpots";
import type { RecommendedWindow } from "@/lib/tourapi/congestion";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";

// F7 — 카카오맵 시각화.
// 중심 관광지는 hub API가 주는 정확한 mapX/mapY(경위도)로 마커를 찍고, 연관 관광지는
// 좌표 필드가 없어(RelatedSpot에 mapX/mapY 없음) 카카오 SDK의 services(Places) 라이브러리로
// 이름을 키워드 지오코딩해 마커를 배치한다 — 별도 REST 키 없이 JS 키 하나로 해결(계획문서 F7).

// 카카오 지도 API 타입 최소 선언(공식 @types 미설치). 사용하는 서브셋만 정의해 any를 피한다.
type KakaoLatLng = { getLat(): number; getLng(): number };
type KakaoMarker = { setMap(map: KakaoMap | null): void };
type KakaoInfoWindow = {
  open(map: KakaoMap, marker?: KakaoMarker): void;
  close(): void;
  setContent(content: string): void;
};
type KakaoBounds = { extend(latlng: KakaoLatLng): void };
type KakaoMap = { setBounds(bounds: KakaoBounds): void };
type KakaoPlacesResult = { x: string; y: string };
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
  }) => KakaoMarker;
  InfoWindow: new (options: {
    content: string;
    removable?: boolean;
  }) => KakaoInfoWindow;
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
// 마커 인포윈도우에 넣을 F5 요약 최대 길이(길면 말줄임 — 전문은 아래 요약 카드에 있다).
const SUMMARY_SNIPPET_MAX = 90;

// 중심 관광지 인포윈도우 HTML(F2 추천 방문시기 + F5 요약 스니펫). 지도 초기화와 요약 도착
// 두 시점에서 같은 콘텐츠를 만들 수 있도록 헬퍼로 분리한다(PRD F7: 마커 클릭 시 F2·F5 팝업).
function buildHubContent(
  spotName: string,
  recommended: RecommendedWindow | null,
  summary?: string | null,
): string {
  const snippet = summary?.trim()
    ? summary.trim().length > SUMMARY_SNIPPET_MAX
      ? summary.trim().slice(0, SUMMARY_SNIPPET_MAX) + "…"
      : summary.trim()
    : "";
  return (
    `<div style="padding:8px 12px;font-size:13px;line-height:1.5;color:#1e2124;max-width:240px;">` +
    `<strong>${escapeHtml(spotName)}</strong><br/>` +
    `<span style="color:#256ef4;">중심 관광지</span>` +
    (recommended
      ? `<br/>추천 방문 ${formatMd(recommended.startYmd)}~${formatMd(recommended.endYmd)}`
      : "") +
    (snippet
      ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e6e8ea;color:#6d7882;">${escapeHtml(snippet)}</div>`
      : "") +
    `</div>`
  );
}

export function SpotMap({
  spot,
  related,
  recommended,
  summary,
}: {
  spot: HubSpot;
  related: RelatedSpot[];
  recommended: RecommendedWindow | null;
  summary?: string | null;
}) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  // 요약은 지도 초기화보다 늦게 도착한다. 지도를 재초기화(연관 마커 재지오코딩)하지 않고
  // hub 인포윈도우만 갱신하려고 map/marker/infowindow를 ref로 들고 있는다. 요약 반영은
  // 아래 별도 effect가 담당하므로 여기서 summary를 참조하지 않는다.
  const mapRef = useRef<KakaoMap | null>(null);
  const hubMarkerRef = useRef<KakaoMarker | null>(null);
  const hubInfoRef = useRef<KakaoInfoWindow | null>(null);

  useEffect(() => {
    // 키 미설정은 아래 렌더 폴백("지도를 불러올 수 없습니다")이 처리하므로 여기선 조용히 종료.
    if (!appKey) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const markers: KakaoMarker[] = [];
    // 관광지 전환 시 로딩 표시로 되돌린다.
    setStatus("loading");

    loadKakaoSdk(appKey)
      .then((maps) => {
        if (cancelled) return;
        const lat = Number(spot.mapY);
        const lng = Number(spot.mapX);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setStatus("error");
          return;
        }

        const center = new maps.LatLng(lat, lng);
        const map = new maps.Map(container, { center, level: 6 });
        mapRef.current = map;
        const bounds = new maps.LatLngBounds();
        bounds.extend(center);
        let extended = 1;

        // 중심 관광지 마커 — 추천 방문 시기(+요약이 이미 있으면 함께)를 인포윈도우로 기본 표시.
        const hubMarker = new maps.Marker({
          position: center,
          map,
          title: spot.hubTatsNm,
        });
        markers.push(hubMarker);
        hubMarkerRef.current = hubMarker;
        const hubInfo = new maps.InfoWindow({
          // 요약은 뒤따르는 summary effect가 채운다(여기선 F2 추천 방문시기까지만).
          content: buildHubContent(spot.hubTatsNm, recommended),
        });
        hubInfoRef.current = hubInfo;
        hubInfo.open(map, hubMarker);

        // 연관 관광지 마커 클릭 시 재사용하는 단일 인포윈도우(동시에 하나만 열리게).
        const relatedInfo = new maps.InfoWindow({ content: "" });

        const topRelated = related.slice(0, MAX_RELATED_MARKERS);
        let pending = topRelated.length;
        const ps = new maps.services.Places();

        const finish = () => {
          if (cancelled) return;
          // 연관 마커가 하나라도 붙었으면 전체를 담도록 뷰포트 조정(단일 지점이면 확대 과함 방지).
          if (extended > 1) map.setBounds(bounds);
        };

        if (topRelated.length === 0) {
          setStatus("ready");
        } else {
          topRelated.forEach((r) => {
            // 지역명을 붙여 동명 관광지 오검색을 줄이고, 중심 좌표 반경으로 편향.
            const keyword = `${r.rlteSignguNm} ${r.rlteTatsNm}`;
            ps.keywordSearch(
              keyword,
              (data, searchStatus) => {
                if (cancelled) return;
                if (searchStatus === maps.services.Status.OK && data[0]) {
                  const pos = new maps.LatLng(
                    Number(data[0].y),
                    Number(data[0].x),
                  );
                  const marker = new maps.Marker({ position: pos, map });
                  markers.push(marker);
                  bounds.extend(pos);
                  extended += 1;
                  maps.event.addListener(marker, "click", () => {
                    relatedInfo.setContent(
                      `<div style="padding:8px 12px;font-size:13px;line-height:1.5;color:#1e2124;">` +
                        `<strong>${escapeHtml(r.rlteTatsNm)}</strong><br/>` +
                        `<span style="color:#6d7882;">${escapeHtml(r.rlteCtgryLclsNm)} · ${escapeHtml(r.rlteCtgryMclsNm)}</span>` +
                        `</div>`,
                    );
                    relatedInfo.open(map, marker);
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
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      mapRef.current = null;
      hubMarkerRef.current = null;
      hubInfoRef.current = null;
    };
  }, [appKey, spot, related, recommended]);

  // F5 요약은 지도보다 늦게 도착한다. 지도가 이미 그려져 있으면 재초기화 없이 hub 인포윈도우
  // 콘텐츠만 갱신한다(summary는 위 init effect의 deps에 없다 — 여기서만 반영).
  useEffect(() => {
    const info = hubInfoRef.current;
    const marker = hubMarkerRef.current;
    const map = mapRef.current;
    if (!info || !marker || !map) return;
    info.setContent(buildHubContent(spot.hubTatsNm, recommended, summary));
  }, [summary, recommended, spot]);

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
        className="h-[360px] w-full rounded-[10px]"
        style={{ border: "1px solid #cdd1d5" /* --krds-color-light-gray-20 */ }}
      />
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
