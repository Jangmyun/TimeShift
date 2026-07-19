"use client";

// 정부 서비스 상단 크롬. 브랜딩 바는 이 서비스에 맞는 커스텀 마크업이라 KRDS 디자인 토큰
// (.claude/skills/krds-design/references/design-tokens.md)으로 직접 스타일링한다.
import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo_timeshift.png";

const KRDS_GRAY_10 = "#e6e8ea"; // --krds-color-light-gray-10
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90
const KRDS_PRIMARY_5 = "#ecf2fe"; // --krds-color-light-primary-5
const KRDS_PRIMARY_60 = "#0b50d0"; // --krds-color-light-primary-60

export function SiteHeader() {
  return (
    <header>
      <div
        className="w-full bg-white"
        style={{ borderBottom: `1px solid ${KRDS_GRAY_10}` }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-[16px] px-[20px] py-[16px]">
          {/* 로고·타이틀을 하나의 클릭 영역으로 묶는다. 자식(이미지/텍스트)은 각자
              기본 커서(auto/text)를 갖는데, 이들 위를 오갈 때 커서가 pointer↔text로
              깜빡이므로 pointer-events를 링크로 위임(pointer-events-none)해 hover 시
              커서를 pointer 하나로 통일한다. select-none으로 텍스트 드래그도 방지. */}
          <Link
            href="/"
            className="flex cursor-pointer select-none items-center gap-[12px] [&_*]:pointer-events-none"
          >
            <Image
              src={logo}
              alt="타임시프트 로고"
              width={40}
              height={40}
              priority
              draggable={false}
              className="h-[40px] w-[40px] rounded-[10px]"
            />
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
