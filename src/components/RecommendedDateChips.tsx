"use client";

import type { CSSProperties } from "react";
import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";

const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_GRAY_5 = "#f4f5f6"; // --krds-color-light-gray-5
const KRDS_GRAY_30 = "#b1b8be"; // --krds-color-light-gray-30
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90
const KRDS_SUCCESS = "#1a7f37";
const KRDS_SUCCESS_BG = "#e7f5ec";
const KRDS_DANGER = "#d1293d";
const KRDS_DANGER_BG = "#fdecee";

type ChipTone = "recommended" | "peak" | "normal";

export type RecommendedDateChip = {
  baseYmd: string;
  md: string;
  rateLabel: string;
  tone: ChipTone;
  statusLabel: string;
};

function formatMd(ymd: string): string {
  return `${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 10) / 10}%`;
}

export function buildRecommendedDateChips(
  series: CongestionDay[],
  recommended: RecommendedWindow | null,
): RecommendedDateChip[] {
  if (series.length === 0) return [];

  const peakDay = series.reduce((a, b) => (b.cnctrRate > a.cnctrRate ? b : a));

  return series.map((day) => {
    const inRecommended =
      recommended !== null &&
      day.baseYmd >= recommended.startYmd &&
      day.baseYmd <= recommended.endYmd;
    const isPeak = day.baseYmd === peakDay.baseYmd;
    const tone: ChipTone = isPeak
      ? "peak"
      : inRecommended
        ? "recommended"
        : "normal";

    return {
      baseYmd: day.baseYmd,
      md: formatMd(day.baseYmd),
      rateLabel: formatRate(day.cnctrRate),
      tone,
      statusLabel:
        tone === "peak" ? "최고 혼잡일" : tone === "recommended" ? "추천 구간" : "일반",
    };
  });
}

function chipStyle(tone: ChipTone): CSSProperties {
  if (tone === "recommended") {
    return {
      borderColor: KRDS_SUCCESS,
      backgroundColor: KRDS_SUCCESS_BG,
      color: KRDS_SUCCESS,
    };
  }
  if (tone === "peak") {
    return {
      borderColor: KRDS_DANGER,
      backgroundColor: KRDS_DANGER_BG,
      color: KRDS_DANGER,
    };
  }
  return {
    borderColor: KRDS_BORDER_DEFAULT,
    backgroundColor: "#ffffff",
    color: KRDS_GRAY_90,
  };
}

export function RecommendedDateChips({
  series,
  recommended,
}: {
  series: CongestionDay[];
  recommended: RecommendedWindow | null;
}) {
  const chips = buildRecommendedDateChips(series, recommended);
  if (chips.length === 0) return null;

  return (
    <section className="mt-[16px]" aria-label="추천 구간 날짜칩">
      <div className="flex flex-col gap-[8px] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[17px] font-bold" style={{ color: KRDS_GRAY_90 }}>
            추천 구간 캘린더
          </h3>
          <p className="mt-[2px] text-[13px]" style={{ color: KRDS_GRAY_50 }}>
            향후 {chips.length}일 중 추천 구간과 최고 혼잡일을 날짜별로 비교합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-[8px] text-[12px]" aria-hidden="true">
          <span
            className="inline-flex items-center gap-[5px]"
            style={{ color: KRDS_GRAY_50 }}
          >
            <span
              className="h-[8px] w-[8px] rounded-full"
              style={{ backgroundColor: KRDS_SUCCESS }}
            />
            추천 구간
          </span>
          <span
            className="inline-flex items-center gap-[5px]"
            style={{ color: KRDS_GRAY_50 }}
          >
            <span
              className="h-[8px] w-[8px] rounded-full"
              style={{ backgroundColor: KRDS_DANGER }}
            />
            최고 혼잡일
          </span>
          <span
            className="inline-flex items-center gap-[5px]"
            style={{ color: KRDS_GRAY_50 }}
          >
            <span
              className="h-[8px] w-[8px] rounded-full"
              style={{ backgroundColor: KRDS_GRAY_30 }}
            />
            일반
          </span>
        </div>
      </div>

      <ol
        className="mt-[10px] grid grid-cols-3 gap-[8px] rounded-[10px] p-[10px] sm:grid-cols-6 lg:grid-cols-10"
        style={{
          backgroundColor: KRDS_GRAY_5,
          border: `1px solid ${KRDS_BORDER_DEFAULT}`,
        }}
      >
        {chips.map((chip) => (
          <li key={chip.baseYmd}>
            <div
              className="flex min-h-[68px] flex-col justify-between rounded-[8px] border px-[8px] py-[7px]"
              style={chipStyle(chip.tone)}
              data-tone={chip.tone}
              aria-label={`${chip.md} 집중률 ${chip.rateLabel}, ${chip.statusLabel}`}
            >
              <span className="text-[13px] font-semibold leading-none">
                {chip.md}
              </span>
              <span className="text-[16px] font-bold leading-none">
                {chip.rateLabel}
              </span>
              <span className="text-[11px] leading-none">
                {chip.statusLabel}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
