import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpotMap } from "./SpotMap";
import type { HubSpot } from "@/lib/tourapi/hubSpots";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";

const spot: HubSpot = {
  baseYm: "202607",
  areaCd: "11",
  areaNm: "서울특별시",
  signguCd: "11110",
  signguNm: "종로구",
  hubTatsCd: "abc",
  hubTatsNm: "경복궁",
  hubCtgryLclsNm: "관광지",
  hubCtgryMclsNm: "문화관광",
  hubRank: "1",
  mapX: "126.977",
  mapY: "37.578",
};

const relatedSpot: RelatedSpot = {
  rlteTatsCd: "rel-1",
  rlteTatsNm: "창덕궁",
  rlteRegnCd: "11",
  rlteRegnNm: "서울특별시",
  rlteSignguCd: "11110",
  rlteSignguNm: "종로구",
  rlteCtgryLclsNm: "관광지",
  rlteCtgryMclsNm: "역사관광",
  rlteCtgrySclsNm: "고궁",
  rlteRank: "1",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.kakao = undefined;
});

describe("SpotMap", () => {
  it("카카오 키가 없으면 지도 대신 폴백 메시지로 degrade한다", () => {
    // 키 미설정 상태를 강제(테스트 환경엔 .env가 로드되지 않지만 명시적으로 고정).
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "");
    render(<SpotMap spot={spot} related={[]} recommended={null} />);
    expect(
      screen.getByText(/지도를 불러올 수 없습니다/),
    ).toBeInTheDocument();
  });

  it("중심 관광지 마커를 누르면 닫힌 인포윈도우를 다시 연다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "test-key");
    const open = vi.fn();
    const listeners: Array<{ type: string; handler: () => void }> = [];

    class LatLng {
      constructor(
        private lat: number,
        private lng: number,
      ) {}
      getLat() {
        return this.lat;
      }
      getLng() {
        return this.lng;
      }
    }

    class LatLngBounds {
      extend = vi.fn();
    }

    class Map {
      setBounds = vi.fn();
    }

    class Marker {
      setMap = vi.fn();
    }

    class InfoWindow {
      open = open;
      close = vi.fn();
      setContent = vi.fn();
    }

    class Polyline {
      setMap = vi.fn();
    }

    class CustomOverlay {
      setMap = vi.fn();
    }

    class MarkerImage {
      constructor(
        public src: string,
        public size: Size,
      ) {}
    }

    class Size {
      constructor(
        public width: number,
        public height: number,
      ) {}
    }

    class Places {
      keywordSearch = vi.fn();
    }

    window.kakao = {
      maps: {
        load: (cb: () => void) => cb(),
        LatLng,
        LatLngBounds,
        Map,
        Marker,
        MarkerImage,
        Size,
        InfoWindow,
        Polyline,
        CustomOverlay,
        event: {
          addListener: vi.fn((_target, type, handler) => {
            listeners.push({ type, handler });
          }),
        },
        services: {
          Places,
          Status: { OK: "OK" },
        },
      },
    };

    render(<SpotMap spot={spot} related={[]} recommended={null} />);

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    const hubClick = listeners.find((l) => l.type === "click");
    expect(hubClick).toBeDefined();

    hubClick?.handler();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("연관 관광지 혼잡 시리즈가 안전하게 매칭되면 마커 이미지를 색상 핀으로 갱신한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "test-key");
    const setImage = vi.fn();
    const markerOptions: Array<{ title?: string; image?: { src: string } }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          series: [
            { baseYmd: "20260701", cnctrRate: 72 },
            { baseYmd: "20260702", cnctrRate: 40 },
          ],
          recommended: null,
        }),
      }),
    );

    class LatLng {
      constructor(
        private lat: number,
        private lng: number,
      ) {}
      getLat() {
        return this.lat;
      }
      getLng() {
        return this.lng;
      }
    }

    class LatLngBounds {
      extend = vi.fn();
    }

    class Map {
      setBounds = vi.fn();
    }

    class Marker {
      setMap = vi.fn();
      setImage = setImage;
      constructor(options: { title?: string; image?: { src: string } }) {
        markerOptions.push(options);
      }
    }

    class InfoWindow {
      open = vi.fn();
      close = vi.fn();
      setContent = vi.fn();
    }

    class Polyline {
      setMap = vi.fn();
    }

    class CustomOverlay {
      setMap = vi.fn();
    }

    class MarkerImage {
      constructor(
        public src: string,
        public size: Size,
      ) {}
    }

    class Size {
      constructor(
        public width: number,
        public height: number,
      ) {}
    }

    class Places {
      keywordSearch(
        _keyword: string,
        callback: (
          data: Array<{ x: string; y: string; place_url?: string }>,
          status: string,
        ) => void,
      ) {
        callback([{ x: "126.991", y: "37.579" }], "OK");
      }
    }

    window.kakao = {
      maps: {
        load: (cb: () => void) => cb(),
        LatLng,
        LatLngBounds,
        Map,
        Marker,
        MarkerImage,
        Size,
        InfoWindow,
        Polyline,
        CustomOverlay,
        event: {
          addListener: vi.fn(),
        },
        services: {
          Places,
          Status: { OK: "OK" },
        },
      },
    };

    render(<SpotMap spot={spot} related={[relatedSpot]} recommended={null} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/congestion?areaCd=11&signguCd=11110&spotName=%EC%B0%BD%EB%8D%95%EA%B6%81",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(markerOptions[1].image?.src).toContain("%236d7882");
    await waitFor(() => expect(setImage).toHaveBeenCalledTimes(1));
    expect(setImage.mock.calls[0][0].src).toContain("%23d1293d");
  });
});
