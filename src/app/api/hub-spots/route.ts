import { NextRequest, NextResponse } from "next/server";
import { fetchHubSpots } from "@/lib/tourapi/hubSpots";
import { TourApiError } from "@/lib/tourapi/client";
import { findSigungu } from "@/lib/regions";

export async function GET(request: NextRequest) {
  const areaCd = request.nextUrl.searchParams.get("areaCd");
  const signguCd = request.nextUrl.searchParams.get("signguCd");

  if (!areaCd || !signguCd) {
    return NextResponse.json(
      { error: "areaCd, signguCd 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }
  if (!findSigungu(areaCd, signguCd)) {
    return NextResponse.json(
      { error: "알 수 없는 지역 코드입니다." },
      { status: 400 },
    );
  }

  try {
    const { items, baseYm, source } = await fetchHubSpots(areaCd, signguCd);
    // 중심 관광지 목록은 baseYm(월 단위)로 갱신되는 느린 데이터 → 브라우저 캐싱으로 지역
    // 재선택 시 재요청을 피한다. stale-while-revalidate로 만료 후에도 즉시 응답 + 백그라운드 갱신.
    return NextResponse.json(
      { items, baseYm, source },
      {
        headers: {
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    if (err instanceof TourApiError) {
      return NextResponse.json(
        { error: err.message, resultCode: err.resultCode },
        { status: 502 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "중심 관광지 정보를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
