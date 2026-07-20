import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
