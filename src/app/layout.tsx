import type { Metadata } from "next";
// KRDS CSS는 globals.css 안에서 cascade layer(krds)로 import한다(레이어 순서로 Tailwind 여백
// 유틸리티가 KRDS 리셋을 이기게 하기 위함 — 자세한 이유는 globals.css 상단 주석 참고).
// 폰트는 KRDS의 Pretendard GOV를 그대로 쓰므로 별도 웹폰트(Geist)는 두지 않는다.
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "타임시프트 | TimeShift",
  description:
    "혼잡 신호 기반 여행 시간 재배치 추천 서비스 - 같은 곳을 언제 가면 덜 붐비는지 알려드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      {/* 페이지 배경은 gray-5(#f4f5f6)로 두고, 콘텐츠 카드는 흰색으로 띄워 정부 서비스의
          면 분리감을 준다. */}
      <body
        className="flex min-h-full flex-col"
        style={{ backgroundColor: "#f4f5f6" /* --krds-color-light-gray-5 */ }}
      >
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
