"use client";

// KRDS Footer 컴포넌트로 정부 서비스 하단 크롬을 구성한다. 실제 기관/연락처가 없는
// 공모전 데모이므로 식별자·출처·저작권만 표기한다.
import { Footer } from "krds-react";

export function SiteFooter() {
  return (
    <Footer
      hideQuickLinks
      links={[
        { text: "한국관광공사 TourAPI", href: "https://api.visitkorea.or.kr", target: "_blank" },
        { text: "공공데이터포털", href: "https://www.data.go.kr", target: "_blank" },
        { text: "KRDS 디자인시스템", href: "https://www.krds.go.kr", target: "_blank" },
      ]}
      contacts={[
        {
          title: "데이터 출처",
          description: "한국관광공사 관광 빅데이터 (공공데이터포털)",
        },
      ]}
      copyright="© 2026 TimeShift. 2026 관광데이터 활용 공모전 출품작."
      identifier={{ text: "타임시프트 (TimeShift)" }}
    />
  );
}
