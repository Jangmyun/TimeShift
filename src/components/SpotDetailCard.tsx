"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "krds-react";
import type { SpotDetail } from "@/lib/tourapi/detail";

// krds-react design tokens (references/design-tokens.md). CongestionChart처럼 컴포넌트 로컬 상수로
// 둬 자체 완결형으로 유지한다.
const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_PRIMARY_50 = "#256ef4"; // --krds-color-light-primary-50

// 개요가 이보다 길면 "더보기" 토글을 노출한다(짧으면 3줄 안에 다 보이므로 토글 불필요).
const OVERVIEW_TOGGLE_THRESHOLD = 140;

// 상세정보 보강 카드(F2): 대표이미지 + 주소 + 개요(더보기 토글) + 홈페이지 링크.
export function SpotDetailCard({ detail }: { detail: SpotDetail }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongOverview =
    (detail.overview?.length ?? 0) > OVERVIEW_TOGGLE_THRESHOLD;
  return (
    <div className="mt-4 flex flex-col gap-[16px] sm:flex-row">
      {detail.image && (
        <Image
          src={detail.image}
          alt={detail.title}
          width={220}
          height={160}
          // 표시 크기는 모바일 전폭, 데스크톱 220px → 그에 맞는 변형만 받도록 sizes 지정.
          sizes="(max-width: 640px) 100vw, 220px"
          className="h-[160px] w-full rounded-[10px] object-cover sm:w-[220px]"
          style={{ border: `1px solid ${KRDS_BORDER_DEFAULT}` }}
        />
      )}
      <div className="flex-1">
        {detail.address && (
          <p className="text-[14px]" style={{ color: "#6d7882" }}>
            {detail.address}
          </p>
        )}
        {detail.overview && (
          <p
            className={`mt-[8px] text-[14px] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
            style={{ color: "#1e2124" }}
          >
            {detail.overview}
          </p>
        )}
        <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
          {hasLongOverview && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "접기" : "더보기"}
            </Button>
          )}
          {detail.homepage && (
            <a
              href={detail.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-medium underline"
              style={{ color: KRDS_PRIMARY_50 }}
            >
              공식 홈페이지 ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
