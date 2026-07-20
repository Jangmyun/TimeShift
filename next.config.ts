import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 관광지 상세 이미지(F2 보강)는 한국관광공사 TourAPI가 visitkorea.or.kr CDN URL로 내려준다.
    remotePatterns: [
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
    ],
  },
};

export default nextConfig;
