import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "krds-react/dist/index.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
