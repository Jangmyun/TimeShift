"use client";

import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";

const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_GRAY_5 = "#f4f5f6"; // --krds-color-light-gray-5
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90
const KRDS_PRIMARY_50 = "#256ef4"; // --krds-color-light-primary-50
const KRDS_POINT_50 = "#d63d00"; // --krds-color-light-point-50
const KRDS_SUCCESS = "#1a7f37";

export type AvoidanceEffect = {
  peakAvoidPoint: number;
  averageAvoidPoint: number;
  recommendedAvgRate: number;
  peakRate: number;
  averageRate: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function calculateAvoidanceEffect(
  series: CongestionDay[],
  recommended: RecommendedWindow | null,
): AvoidanceEffect | null {
  if (series.length === 0 || !recommended) return null;

  const peakRate = round1(Math.max(...series.map((d) => d.cnctrRate)));
  const averageRate = round1(
    series.reduce((sum, d) => sum + d.cnctrRate, 0) / series.length,
  );
  const recommendedAvgRate = round1(recommended.avgRate);

  return {
    peakAvoidPoint: Math.max(0, round1(peakRate - recommendedAvgRate)),
    averageAvoidPoint: Math.max(0, round1(averageRate - recommendedAvgRate)),
    recommendedAvgRate,
    peakRate,
    averageRate,
  };
}

function signedPoint(value: number): string {
  return value === 0 ? "0.0p" : `-${value.toFixed(1)}p`;
}

function distanceLabel(totalDistanceKm: number | null): string {
  if (totalDistanceKm === null) return "계산 중";
  if (totalDistanceKm <= 0) return "지도 데이터 없음";
  return `${totalDistanceKm.toFixed(1)}km`;
}

export function AvoidanceEffectCard({
  series,
  recommended,
  totalDistanceKm,
}: {
  series: CongestionDay[];
  recommended: RecommendedWindow | null;
  totalDistanceKm: number | null;
}) {
  const effect = calculateAvoidanceEffect(series, recommended);
  if (!effect) return null;

  const metrics = [
    {
      label: "최고 혼잡일 대비",
      value: signedPoint(effect.peakAvoidPoint),
      note: `최고 ${effect.peakRate.toFixed(1)}% 기준`,
      color: KRDS_POINT_50,
    },
    {
      label: "30일 평균 대비",
      value: signedPoint(effect.averageAvoidPoint),
      note: `평균 ${effect.averageRate.toFixed(1)}% 기준`,
      color: KRDS_PRIMARY_50,
    },
    {
      label: "추천 구간 평균 집중률",
      value: `${effect.recommendedAvgRate.toFixed(1)}%`,
      note: "가장 낮은 3일 구간",
      color: KRDS_SUCCESS,
    },
    {
      label: "추천 코스 총 이동거리",
      value: distanceLabel(totalDistanceKm),
      note:
        totalDistanceKm === null
          ? "지도 동선 산출 대기"
          : totalDistanceKm > 0
            ? "최소 이동 동선 기준"
            : "중심 관광지만 표시",
      color: KRDS_GRAY_90,
    },
  ];

  return (
    <section
      className="mt-[16px] rounded-[10px] p-[16px]"
      style={{
        backgroundColor: KRDS_GRAY_5,
        border: `1px solid ${KRDS_BORDER_DEFAULT}`,
      }}
      aria-label="혼잡 회피 효과"
    >
      <div className="flex flex-col gap-[4px] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[17px] font-bold" style={{ color: KRDS_GRAY_90 }}>
            혼잡 회피 효과
          </h3>
          <p className="mt-[2px] text-[13px]" style={{ color: KRDS_GRAY_50 }}>
            추천 방문 구간을 선택했을 때 줄어드는 집중률과 이동 부담입니다.
          </p>
        </div>
      </div>

      <dl className="mt-[14px] grid grid-cols-1 overflow-hidden rounded-[8px] border sm:grid-cols-4" style={{ borderColor: KRDS_BORDER_DEFAULT }}>
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`bg-white p-[14px] ${i > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}
            style={{ borderColor: KRDS_BORDER_DEFAULT }}
          >
            <dt className="text-[13px] font-medium" style={{ color: KRDS_GRAY_50 }}>
              {m.label}
            </dt>
            <dd
              className="mt-[6px] text-[24px] font-bold leading-none"
              style={{ color: m.color }}
            >
              {m.value}
            </dd>
            <dd className="mt-[8px] text-[12px]" style={{ color: KRDS_GRAY_50 }}>
              {m.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
