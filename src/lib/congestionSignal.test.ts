import { describe, expect, it } from "vitest";
import { buildMapCongestionSignal, mapCongestionLevel } from "./congestionSignal";

describe("mapCongestionLevel", () => {
  it("오늘 집중률을 4단계 색상으로 매핑한다", () => {
    expect(mapCongestionLevel(20).level).toBe("여유");
    expect(mapCongestionLevel(30).level).toBe("보통");
    expect(mapCongestionLevel(50).level).toBe("혼잡");
    expect(mapCongestionLevel(70).level).toBe("매우 혼잡");
  });
});

describe("buildMapCongestionSignal", () => {
  it("빈 시리즈는 안전한 매칭 없음으로 보고 null을 반환한다", () => {
    expect(buildMapCongestionSignal([], null)).toBeNull();
  });

  it("첫날 집중률과 추천 구간 회피 효과를 계산한다", () => {
    const signal = buildMapCongestionSignal(
      [
        { baseYmd: "20260701", cnctrRate: 52.34 },
        { baseYmd: "20260702", cnctrRate: 80 },
      ],
      { startYmd: "20260701", endYmd: "20260703", avgRate: 41.25 },
    );

    expect(signal).toMatchObject({
      level: "혼잡",
      currentRate: 52.3,
      peakRate: 80,
      recommendedAvg: 41.3,
      avoidPoint: 38.7,
    });
  });
});
