"use client";

// 정부 서비스 상단 크롬. Masthead(공식 전자정부 배너)는 krds-react 컴포넌트를 그대로 쓰고,
// 그 아래 브랜딩 바는 이 서비스에 맞는 커스텀 마크업이라 KRDS 디자인 토큰
// (.claude/skills/krds-design/references/design-tokens.md)으로 직접 스타일링한다.
import Link from "next/link";
import { Masthead } from "krds-react";

const KRDS_GRAY_10 = "#e6e8ea"; // --krds-color-light-gray-10
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90
const KRDS_PRIMARY_50 = "#256ef4"; // --krds-color-light-primary-50
const KRDS_PRIMARY_5 = "#ecf2fe"; // --krds-color-light-primary-5
const KRDS_PRIMARY_60 = "#0b50d0"; // --krds-color-light-primary-60

export function SiteHeader() {
  return (
    <header>
      <Masthead text="이 누리집은 대한민국 공식 전자정부 누리집입니다." />
      <div
        className="w-full bg-white"
        style={{ borderBottom: `1px solid ${KRDS_GRAY_10}` }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-[16px] px-[20px] py-[16px]">
          <Link href="/" className="flex items-center gap-[12px]">
            <span
              className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] text-[18px] font-bold text-white"
              style={{ backgroundColor: KRDS_PRIMARY_50 }}
              aria-hidden
            >
              TS
            </span>
            <span className="flex flex-col leading-tight">
              <span
                className="text-[20px] font-bold"
                style={{ color: KRDS_GRAY_90 }}
              >
                타임시프트
              </span>
              <span className="text-[12px]" style={{ color: KRDS_GRAY_50 }}>
                관광 혼잡 시간재배치 추천 서비스
              </span>
            </span>
          </Link>
          <span
            className="hidden rounded-full px-[12px] py-[6px] text-[12px] font-medium sm:inline-block"
            style={{ backgroundColor: KRDS_PRIMARY_5, color: KRDS_PRIMARY_60 }}
          >
            2026 관광데이터 활용 공모전
          </span>
        </div>
      </div>
    </header>
  );
}
