import { describe, expect, it } from "vitest";
import { summaryTestUtils } from "./route";

const course = [
  {
    name: "경복궁",
    order: 1,
    distanceFromPrevKm: 0,
    isHub: true,
  },
  {
    name: "북촌한옥마을",
    order: 2,
    distanceFromPrevKm: 0.8,
  },
  {
    name: "국립현대미술관 서울",
    order: 3,
    distanceFromPrevKm: 1.1,
  },
];

const recommended = {
  startYmd: "20260703",
  endYmd: "20260705",
  avgRate: 32.1,
};

describe("summary fallback numeric evidence", () => {
  it("혼잡 감소폭, 추천 구간 평균, 총 이동거리를 포함한다", () => {
    const summary = summaryTestUtils.buildFallback(
      "경복궁",
      "서울 종로구",
      recommended,
      course,
      2.8,
      "붐빔",
      "오전 9시경",
      {
        peakAvoidPoint: 26.3,
        averageAvoidPoint: 7.3,
        recommendedAvgRate: 32.1,
        peakRate: 58.4,
        averageRate: 39.4,
      },
    );

    expect(summary).toContain("추천 구간 평균 집중률 32.1%");
    expect(summary).toContain("최고 혼잡일 대비 26.3p");
    expect(summary).toContain("30일 평균 대비 7.3p");
    expect(summary).toContain("추천 코스 총 이동거리 2.8km");
  });

  it("잘못된 수치 근거 payload는 null로 버린다", () => {
    expect(
      summaryTestUtils.parseAvoidanceEffect({
        peakAvoidPoint: "26.3",
        averageAvoidPoint: 7.3,
        recommendedAvgRate: 32.1,
        peakRate: 58.4,
        averageRate: 39.4,
      }),
    ).toBeNull();
  });
});
