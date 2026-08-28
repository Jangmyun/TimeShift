import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AvoidanceEffectCard,
  calculateAvoidanceEffect,
} from "./AvoidanceEffectCard";
import type { CongestionDay } from "@/lib/tourapi/congestion";

const series: CongestionDay[] = [
  { baseYmd: "20260701", cnctrRate: 58.4 },
  { baseYmd: "20260702", cnctrRate: 42.2 },
  { baseYmd: "20260703", cnctrRate: 32.1 },
  { baseYmd: "20260704", cnctrRate: 30.8 },
  { baseYmd: "20260705", cnctrRate: 33.4 },
];

const recommended = {
  startYmd: "20260703",
  endYmd: "20260705",
  avgRate: 32.1,
};

describe("calculateAvoidanceEffect", () => {
  it("최고 혼잡일·30일 평균 대비 회피 포인트를 계산한다", () => {
    expect(calculateAvoidanceEffect(series, recommended)).toEqual({
      peakAvoidPoint: 26.3,
      averageAvoidPoint: 7.3,
      recommendedAvgRate: 32.1,
      peakRate: 58.4,
      averageRate: 39.4,
    });
  });

  it("시리즈나 추천 구간이 없으면 null을 반환한다", () => {
    expect(calculateAvoidanceEffect([], recommended)).toBeNull();
    expect(calculateAvoidanceEffect(series, null)).toBeNull();
  });
});

describe("AvoidanceEffectCard", () => {
  it("심사용 핵심 지표 4개를 렌더한다", () => {
    render(
      <AvoidanceEffectCard
        series={series}
        recommended={recommended}
        totalDistanceKm={2.8}
      />,
    );

    expect(screen.getByText("혼잡 회피 효과")).toBeInTheDocument();
    expect(screen.getByText("-26.3p")).toBeInTheDocument();
    expect(screen.getByText("-7.3p")).toBeInTheDocument();
    expect(screen.getByText("32.1%")).toBeInTheDocument();
    expect(screen.getByText("2.8km")).toBeInTheDocument();
  });

  it("동선 계산 전에는 대기 상태를 표시한다", () => {
    render(
      <AvoidanceEffectCard
        series={series}
        recommended={recommended}
        totalDistanceKm={null}
      />,
    );

    expect(screen.getByText("계산 중")).toBeInTheDocument();
    expect(screen.getByText("지도 동선 산출 대기")).toBeInTheDocument();
  });
});
