"use client";

import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };

function formatMd(ymd: string) {
  return `${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
}

export function CongestionChart({
  series,
  recommended,
}: {
  series: CongestionDay[];
  recommended: RecommendedWindow | null;
}) {
  if (series.length === 0) return null;

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;
  const xStep = plotW / Math.max(series.length - 1, 1);

  const x = (i: number) => PADDING.left + i * xStep;
  const y = (rate: number) => PADDING.top + plotH * (1 - rate / 100);

  const linePath = series
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.cnctrRate)}`)
    .join(" ");

  const recStartIdx = recommended
    ? series.findIndex((d) => d.baseYmd === recommended.startYmd)
    : -1;
  const recEndIdx = recommended
    ? series.findIndex((d) => d.baseYmd === recommended.endYmd)
    : -1;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label="향후 30일 집중률 예측 그래프"
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={4} y={y(tick) + 4} fontSize={10} fill="#9ca3af">
              {tick}
            </text>
          </g>
        ))}

        {recStartIdx >= 0 && recEndIdx >= 0 && (
          <rect
            x={x(recStartIdx) - xStep / 2}
            y={PADDING.top}
            width={x(recEndIdx) - x(recStartIdx) + xStep}
            height={plotH}
            fill="#2563eb"
            fillOpacity={0.08}
          />
        )}

        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} />

        {series.map((d, i) => {
          const isRecommended = i >= recStartIdx && i <= recEndIdx && recStartIdx >= 0;
          if (i % 3 !== 0 && !isRecommended) return null;
          return (
            <circle
              key={d.baseYmd}
              cx={x(i)}
              cy={y(d.cnctrRate)}
              r={isRecommended ? 3 : 2}
              fill={isRecommended ? "#1d4ed8" : "#93c5fd"}
            />
          );
        })}

        {series.map((d, i) =>
          i % 5 === 0 ? (
            <text
              key={`label-${d.baseYmd}`}
              x={x(i)}
              y={HEIGHT - 8}
              fontSize={10}
              fill="#6b7280"
              textAnchor="middle"
            >
              {formatMd(d.baseYmd)}
            </text>
          ) : null,
        )}
      </svg>

      {recommended && (
        <p className="mt-2 text-sm text-blue-700">
          추천 방문 시기: {formatMd(recommended.startYmd)} ~{" "}
          {formatMd(recommended.endYmd)} (평균 집중률 {recommended.avgRate}%)
        </p>
      )}
    </div>
  );
}
