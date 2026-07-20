import { describe, it, expect } from "vitest";
import { findRecommendedWindow, type CongestionDay } from "./congestion";

const day = (ymd: string, rate: number): CongestionDay => ({
  baseYmd: ymd,
  cnctrRate: rate,
});

describe("findRecommendedWindow", () => {
  it("빈 시리즈면 null을 반환한다", () => {
    expect(findRecommendedWindow([])).toBeNull();
  });

  it("평균 집중률이 가장 낮은 3일 구간(점이 아니라 구간)을 고른다", () => {
    // 07/03~07/05 구간(10,10,10)의 평균이 가장 낮다. 단일 최저점(07/07의 5)이 아니라
    // 연속 구간 평균 기준임을 확인한다.
    const series = [
      day("20260701", 90),
      day("20260702", 80),
      day("20260703", 10),
      day("20260704", 10),
      day("20260705", 10),
      day("20260706", 60),
      day("20260707", 5),
      day("20260708", 95),
      day("20260709", 95),
    ];
    const rec = findRecommendedWindow(series);
    expect(rec).toEqual({ startYmd: "20260703", endYmd: "20260705", avgRate: 10 });
  });

  it("시리즈가 windowSize보다 짧으면 전체 구간을 평균낸다", () => {
    const rec = findRecommendedWindow([day("20260701", 20), day("20260702", 40)]);
    expect(rec).toEqual({ startYmd: "20260701", endYmd: "20260702", avgRate: 30 });
  });

  it("avgRate는 소수점 첫째 자리로 반올림한다", () => {
    const rec = findRecommendedWindow([
      day("20260701", 10),
      day("20260702", 11),
      day("20260703", 12),
    ]);
    // (10+11+12)/3 = 11
    expect(rec?.avgRate).toBe(11);
  });
});
