import { NextRequest, NextResponse } from "next/server";
import {
  fetchCongestion,
  findRecommendedWindow,
} from "@/lib/tourapi/congestion";
import { TourApiError } from "@/lib/tourapi/client";
import { findSigungu } from "@/lib/regions";

export async function GET(request: NextRequest) {
  const areaCd = request.nextUrl.searchParams.get("areaCd");
  const signguCd = request.nextUrl.searchParams.get("signguCd");
  const spotName = request.nextUrl.searchParams.get("spotName");

  if (!areaCd || !signguCd || !spotName) {
    return NextResponse.json(
      { error: "areaCd, signguCd, spotName 쿼리 파라미터가 필요합니다." },
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
    const series = await fetchCongestion(areaCd, signguCd, spotName);
    const recommended = findRecommendedWindow(series);
    return NextResponse.json({ series, recommended });
  } catch (err) {
    if (err instanceof TourApiError) {
      return NextResponse.json(
        { error: err.message, resultCode: err.resultCode },
        { status: 502 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "집중률 예측 정보를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
