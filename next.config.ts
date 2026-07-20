import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 관광지 상세 이미지(F2 보강)는 한국관광공사 TourAPI가 visitkorea.or.kr CDN(tong. 등)으로
    // 내려준다. 서브도메인 전체를 허용하되, 여기 없는 호스트가 <Image>에 들어가면 렌더가
    // 크래시하므로 src/lib/tourapi/detail.ts의 safeImage가 이 허용 범위 밖 호스트를 null로 거른다.
    remotePatterns: [
      { protocol: "https", hostname: "**.visitkorea.or.kr" },
    ],
  },
};

export default nextConfig;
