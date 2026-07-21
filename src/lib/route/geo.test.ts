import { describe, it, expect } from "vitest";
import { haversineKm, parseLngLat } from "./geo";

describe("haversineKm", () => {
  it("두 동일 지점은 0", () => {
    const p = { lng: 126.977, lat: 37.5796 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("경복궁↔북촌한옥마을은 대략 0.7~1.2km", () => {
    const gyeongbok = { lng: 126.977, lat: 37.5796 };
    const bukchon = { lng: 126.985, lat: 37.5826 };
    const d = haversineKm(gyeongbok, bukchon);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(1.5);
  });

  it("대칭성: a→b와 b→a가 같다", () => {
    const a = { lng: 126.9, lat: 37.5 };
    const b = { lng: 127.1, lat: 37.6 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

describe("parseLngLat", () => {
  it("정상 문자열을 파싱한다", () => {
    expect(parseLngLat("126.977", "37.5796")).toEqual({
      lng: 126.977,
      lat: 37.5796,
    });
  });

  it("숫자가 아니면 null", () => {
    expect(parseLngLat("", "")).toBeNull();
    expect(parseLngLat("abc", "37.5")).toBeNull();
    expect(parseLngLat(undefined, null)).toBeNull();
  });

  it("대한민국 범위 밖 좌표는 null (경위도 뒤바뀜 등 오염값 방어)", () => {
    // 위/경도가 뒤바뀐 경우: lng=37.5, lat=126.9 → 범위 밖.
    expect(parseLngLat("37.5", "126.9")).toBeNull();
    expect(parseLngLat("0", "0")).toBeNull();
  });
});
