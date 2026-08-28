import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpotMap } from "./SpotMap";
import type { HubSpot } from "@/lib/tourapi/hubSpots";

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

afterEach(() => {
  vi.unstubAllEnvs();
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
});
