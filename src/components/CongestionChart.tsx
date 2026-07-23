"use client";

import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };

// krds-react design tokens (references/design-tokens.md) — kept as raw hex since these
// render inside an <svg>, where CSS custom properties defined on an ancestor still apply
// via `fill`/`stroke`, but literal values keep this component copy-paste portable.
const KRDS_PRIMARY_50 = "#256ef4";
const KRDS_PRIMARY_60 = "#0b50d0";
const KRDS_GRAY_10 = "#e6e8ea";
const KRDS_GRAY_30 = "#b1b8be";
const KRDS_GRAY_40 = "#8a949e";

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

  // 스크린리더용: SVG 도형은 보조기술에 보이지 않으므로, 실제 데이터를 문장으로 요약해
  // aria-label/desc에 담는다. 평균·최고 집중률과 추천(최저) 구간을 함께 읽어준다.
  const avgRate = Math.round(
    series.reduce((sum, d) => sum + d.cnctrRate, 0) / series.length,
  );
  const maxDay = series.reduce((a, b) => (b.cnctrRate > a.cnctrRate ? b : a));
  const recSentence = recommended
    ? `가장 한적한 추천 방문 시기는 ${formatMd(recommended.startYmd)}부터 ${formatMd(
        recommended.endYmd,
      )}까지로 평균 집중률 ${recommended.avgRate}%입니다.`
    : "추천 방문 구간이 없습니다.";
  const chartDesc =
    `향후 ${series.length}일간 집중률 예측 꺾은선 그래프. ` +
    `전체 평균 집중률 ${avgRate}%, 가장 붐비는 날은 ${formatMd(maxDay.baseYmd)}로 ${maxDay.cnctrRate}%입니다. ` +
    recSentence;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label={chartDesc}
      >
        <title>{`향후 ${series.length}일 집중률 예측`}</title>
        <desc>{chartDesc}</desc>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={KRDS_GRAY_10}
              strokeWidth={1}
            />
            <text x={4} y={y(tick) + 4} fontSize={10} fill={KRDS_GRAY_40}>
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
            fill={KRDS_PRIMARY_50}
            fillOpacity={0.1}
          />
        )}

        <path d={linePath} fill="none" stroke={KRDS_PRIMARY_50} strokeWidth={2} />

        {series.map((d, i) => {
          const isRecommended = i >= recStartIdx && i <= recEndIdx && recStartIdx >= 0;
          if (i % 3 !== 0 && !isRecommended) return null;
          return (
            <circle
              key={d.baseYmd}
              cx={x(i)}
              cy={y(d.cnctrRate)}
              r={isRecommended ? 3 : 2}
              fill={isRecommended ? KRDS_PRIMARY_60 : KRDS_GRAY_30}
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
              fill={KRDS_GRAY_40}
              textAnchor="middle"
            >
              {formatMd(d.baseYmd)}
            </text>
          ) : null,
        )}
      </svg>

      {recommended && (
        <p
          className="mt-2 text-sm font-medium"
          style={{ color: KRDS_PRIMARY_60 }}
        >
          추천 방문 시기: {formatMd(recommended.startYmd)} ~{" "}
          {formatMd(recommended.endYmd)} (평균 집중률 {recommended.avgRate}%)
        </p>
      )}
    </div>
  );
}
