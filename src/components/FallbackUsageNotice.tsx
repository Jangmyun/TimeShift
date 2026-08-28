"use client";

import { Badge } from "krds-react";
import type { FetchSource } from "@/lib/tourapi/fallback";

type SourceEntry = {
  label: string;
  source: FetchSource | null;
};

const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_GRAY_5 = "#f4f5f6"; // --krds-color-light-gray-5
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90

export function FallbackUsageNotice({ sources }: { sources: SourceEntry[] }) {
  const fallbackLabels = sources
    .filter((entry) => entry.source === "fallback")
    .map((entry) => entry.label);

  if (fallbackLabels.length === 0) return null;

  return (
    <div
      className="mt-[12px] flex flex-col gap-[8px] rounded-[10px] p-[12px] sm:flex-row sm:items-center sm:justify-between"
      style={{
        backgroundColor: KRDS_GRAY_5,
        border: `1px solid ${KRDS_BORDER_DEFAULT}`,
      }}
      role="status"
      aria-label="폴백 데이터 사용 안내"
    >
      <div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <Badge variant="light" color="gray" size="small" rounded>
            시연 안정화
          </Badge>
          <span className="text-[14px] font-semibold" style={{ color: KRDS_GRAY_90 }}>
            백업 데이터로 화면을 이어가는 중
          </span>
        </div>
        <p className="mt-[4px] text-[13px] leading-relaxed" style={{ color: KRDS_GRAY_50 }}>
          공공데이터 API가 불안정할 때도 시연 흐름이 끊기지 않도록 저장된
          데모 데이터를 사용합니다.
        </p>
      </div>
      <span
        className="text-[13px] font-semibold sm:text-right"
        style={{ color: KRDS_GRAY_90 }}
      >
        사용 중: {fallbackLabels.join(", ")}
      </span>
    </div>
  );
}
