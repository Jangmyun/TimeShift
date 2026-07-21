import { describe, it, expect } from "vitest";
import { optimizeCourse, type CourseNode } from "./graph";

const node = (name: string, lng: number, lat: number): CourseNode<string> => ({
  data: name,
  coord: { lng, lat },
});

describe("optimizeCourse", () => {
  it("연관지가 없으면 허브만 담긴 코스", () => {
    const c = optimizeCourse(node("허브", 127, 37.5), []);
    expect(c.stops).toHaveLength(1);
    expect(c.stops[0]).toMatchObject({ data: "허브", order: 1, distanceFromPrevKm: 0 });
    expect(c.totalDistanceKm).toBe(0);
  });

  it("허브를 출발점으로 고정한다", () => {
    const c = optimizeCourse(node("허브", 127.0, 37.5), [
      node("A", 127.01, 37.5),
      node("B", 127.02, 37.5),
    ]);
    expect(c.stops[0].data).toBe("허브");
    expect(c.stops[0].order).toBe(1);
  });

  it("일직선상 지점은 가까운 순으로 이어 최소 이동거리를 만든다", () => {
    // 허브(x=0)에서 동쪽으로 A(0.03) B(0.01) C(0.02)를 흩어 놓으면 최적 순서는 B→C→A.
    const hub = node("허브", 127.0, 37.5);
    const c = optimizeCourse(hub, [
      node("A", 127.03, 37.5),
      node("B", 127.01, 37.5),
      node("C", 127.02, 37.5),
    ]);
    expect(c.stops.map((s) => s.data)).toEqual(["허브", "B", "C", "A"]);
    // 되돌아가지 않는 단조 경로라 총 이동거리 ≈ 허브→A(가장 먼 점) 직선 거리(약 2.6km).
    expect(c.totalDistanceKm).toBeGreaterThan(2.4);
    expect(c.totalDistanceKm).toBeLessThan(2.9);
  });

  it("maxStops로 먼 연관지를 코스에서 제외한다", () => {
    const hub = node("허브", 127.0, 37.5);
    const c = optimizeCourse(
      hub,
      [
        node("가까움1", 127.005, 37.5),
        node("가까움2", 127.008, 37.5),
        node("멀리", 128.0, 37.5),
      ],
      2,
    );
    const names = c.stops.map((s) => s.data);
    expect(names).toContain("가까움1");
    expect(names).toContain("가까움2");
    expect(names).not.toContain("멀리");
    expect(c.stops).toHaveLength(3); // 허브 + 2
  });

  it("첫 방문지의 distanceFromPrev는 허브로부터의 거리", () => {
    const hub = node("허브", 127.0, 37.5);
    const c = optimizeCourse(hub, [node("A", 127.02, 37.5)]);
    expect(c.stops[1].distanceFromPrevKm).toBeGreaterThan(0);
    expect(c.stops[0].distanceFromPrevKm).toBe(0);
  });
});
