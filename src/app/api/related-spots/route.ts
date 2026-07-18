import { NextRequest, NextResponse } from "next/server";
import { fetchRelatedSpots } from "@/lib/tourapi/relatedSpots";
import { TourApiError } from "@/lib/tourapi/client";
import { findSigungu } from "@/lib/regions";

export async function GET(request: NextRequest) {
  const areaCd = request.nextUrl.searchParams.get("areaCd");
  const signguCd = request.nextUrl.searchParams.get("signguCd");
  const tAtsCd = request.nextUrl.searchParams.get("tAtsCd");

  if (!areaCd || !signguCd || !tAtsCd) {
    return NextResponse.json(
      { error: "areaCd, signguCd, tAtsCd 쿼리 파라미터가 필요합니다." },
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
    const { items, baseYm, source } = await fetchRelatedSpots(
      areaCd,
      signguCd,
      tAtsCd,
    );
    return NextResponse.json({ items, baseYm, source });
  } catch (err) {
    if (err instanceof TourApiError) {
      return NextResponse.json(
        { error: err.message, resultCode: err.resultCode },
        { status: 502 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "연관 관광지 정보를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
