import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DataSourcePanel } from "./DataSourcePanel";

const requiredSources = [
  ["중심 관광지", "한국관광공사 중심 관광지 API"],
  ["혼잡 예측", "한국관광공사 관광지 집중률 방문자 추이 예측 API"],
  ["연관 관광지", "한국관광공사 관광지별 연관 관광지 API"],
  ["상세정보", "TourAPI 국문 관광정보"],
  ["시간대 혼잡", "서울 실시간 도시데이터"],
] as const;

describe("DataSourcePanel", () => {
  it("시연용 데이터 출처와 활용 근거를 모두 표시한다", () => {
    render(<DataSourcePanel />);

    expect(
      screen.getByRole("heading", { name: "데이터 출처와 활용 근거" }),
    ).toBeInTheDocument();
    expect(screen.getByText("공모전 심사 근거")).toBeInTheDocument();

    const panel = screen.getByRole("region", {
      name: "데이터 출처와 활용 근거",
    });
    for (const [use, source] of requiredSources) {
      expect(within(panel).getByText(use)).toBeInTheDocument();
      expect(within(panel).getByText(source)).toBeInTheDocument();
    }
  });
});
