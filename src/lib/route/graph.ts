/**
 * 그래프 기반 최소 이동 동선(TSP) — TimeShift 컨셉의 "관광지 간 이동 동선 최적화".
 *
 * 노드 = 중심(허브) 관광지 + 좌표를 확보한 연관 관광지. 엣지 = haversine 거리.
 * 허브를 **고정 출발점**으로, 나머지를 방문하는 순서 중 총 이동거리가 최소인 순서를 찾는다
 * (경로형 TSP, 회귀 없음). 노드 수가 작아(기본 최대 8) 순열 완전탐색으로 최적해를 구한다.
 */
import { haversineKm, type LngLat } from "./geo";

export type CourseNode<T> = { data: T; coord: LngLat };
export type CourseStop<T> = {
  data: T;
  order: number; // 1-based, 허브 = 1
  distanceFromPrevKm: number; // 직전 방문지로부터의 거리(km), 허브는 0
};
export type Course<T> = {
  stops: CourseStop<T>[];
  totalDistanceKm: number;
};

/** 배열의 모든 순열. n ≤ 8이라 팩토리얼 폭발 전(≤40320) 안전하게 완전탐색에 쓴다. */
function permutations<X>(arr: X[]): X[][] {
  if (arr.length <= 1) return [arr];
  const result: X[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) result.push([arr[i], ...p]);
  }
  return result;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 허브에서 출발해 연관 관광지들을 도는 최소 이동거리 순서를 계산한다.
 * others가 maxStops보다 많으면 허브에서 가까운 순으로 maxStops개만 코스에 포함한다
 * (멀리 떨어진 연관지는 동선 최적화 대상에서 제외 — 실제 "묶어서 도는 코스"에 부적합).
 */
export function optimizeCourse<T>(
  hub: CourseNode<T>,
  others: CourseNode<T>[],
  maxStops = 8,
): Course<T> {
  const hubStop: CourseStop<T> = {
    data: hub.data,
    order: 1,
    distanceFromPrevKm: 0,
  };

  const selected = [...others]
    .sort(
      (a, b) => haversineKm(hub.coord, a.coord) - haversineKm(hub.coord, b.coord),
    )
    .slice(0, Math.max(0, maxStops));

  if (selected.length === 0) {
    return { stops: [hubStop], totalDistanceKm: 0 };
  }

  let bestOrder: CourseNode<T>[] = selected;
  let bestTotal = Infinity;
  for (const perm of permutations(selected)) {
    let total = 0;
    let prev = hub.coord;
    for (const n of perm) {
      total += haversineKm(prev, n.coord);
      prev = n.coord;
    }
    if (total < bestTotal) {
      bestTotal = total;
      bestOrder = perm;
    }
  }

  const stops: CourseStop<T>[] = [hubStop];
  let prev = hub.coord;
  bestOrder.forEach((n, i) => {
    stops.push({
      data: n.data,
      order: i + 2,
      distanceFromPrevKm: round1(haversineKm(prev, n.coord)),
    });
    prev = n.coord;
  });

  return { stops, totalDistanceKm: round1(bestTotal) };
}
