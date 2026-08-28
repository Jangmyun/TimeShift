import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RecommendedDateChips,
  buildRecommendedDateChips,
} from "./RecommendedDateChips";
import type { CongestionDay } from "@/lib/tourapi/congestion";

const series: CongestionDay[] = [
  { baseYmd: "20260701", cnctrRate: 61.2 },
  { baseYmd: "20260702", cnctrRate: 58.4 },
  { baseYmd: "20260703", cnctrRate: 34.1 },
  { baseYmd: "20260704", cnctrRate: 31.8 },
  { baseYmd: "20260705", cnctrRate: 33.6 },
  { baseYmd: "20260706", cnctrRate: 72.5 },
];

const recommended = {
  startYmd: "20260703",
  endYmd: "20260705",
  avgRate: 33.2,
};

describe("buildRecommendedDateChips", () => {
  it("추천 구간은 recommended, 최고 혼잡일은 peak, 나머지는 normal로 분류한다", () => {
    expect(buildRecommendedDateChips(series, recommended)).toEqual([
      {
        baseYmd: "20260701",
        md: "07/01",
        rateLabel: "61.2%",
        tone: "normal",
        statusLabel: "일반",
      },
      {
        baseYmd: "20260702",
        md: "07/02",
        rateLabel: "58.4%",
        tone: "normal",
        statusLabel: "일반",
      },
      {
        baseYmd: "20260703",
        md: "07/03",
        rateLabel: "34.1%",
        tone: "recommended",
        statusLabel: "추천 구간",
      },
      {
        baseYmd: "20260704",
        md: "07/04",
        rateLabel: "31.8%",
        tone: "recommended",
        statusLabel: "추천 구간",
      },
      {
        baseYmd: "20260705",
        md: "07/05",
        rateLabel: "33.6%",
        tone: "recommended",
        statusLabel: "추천 구간",
      },
      {
        baseYmd: "20260706",
        md: "07/06",
        rateLabel: "72.5%",
        tone: "peak",
        statusLabel: "최고 혼잡일",
      },
    ]);
  });

  it("추천 구간과 최고 혼잡일이 겹치면 최고 혼잡일을 우선 표시한다", () => {
    const [chip] = buildRecommendedDateChips(
      [{ baseYmd: "20260701", cnctrRate: 40 }],
      { startYmd: "20260701", endYmd: "20260701", avgRate: 40 },
    );

    expect(chip.tone).toBe("peak");
    expect(chip.statusLabel).toBe("최고 혼잡일");
  });
});

describe("RecommendedDateChips", () => {
  it("빈 시리즈면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <RecommendedDateChips series={[]} recommended={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("각 날짜칩에 MM/DD와 집중률 퍼센트를 표시한다", () => {
    render(<RecommendedDateChips series={series} recommended={recommended} />);

    expect(
      screen.getByRole("region", { name: "추천 구간 날짜칩" }),
    ).toBeInTheDocument();
    expect(screen.getByText("추천 구간 캘린더")).toBeInTheDocument();
    expect(
      screen.getByLabelText("07/03 집중률 34.1%, 추천 구간"),
    ).toHaveAttribute("data-tone", "recommended");
    expect(
      screen.getByLabelText("07/06 집중률 72.5%, 최고 혼잡일"),
    ).toHaveAttribute("data-tone", "peak");
    expect(screen.getByText("향후 6일 중 추천 구간과 최고 혼잡일을 날짜별로 비교합니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("07/01 집중률 61.2%, 일반")).toHaveAttribute(
      "data-tone",
      "normal",
    );
  });
});
