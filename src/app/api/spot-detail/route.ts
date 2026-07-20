import { NextRequest, NextResponse } from "next/server";
import { fetchSpotDetail } from "@/lib/tourapi/detail";

// 중심 관광지 상세정보·이미지 보강(F2 섹션). 순수 보강이라 fetchSpotDetail이 실패를 이미
// null로 흡수하므로, 이 라우트는 항상 200 `{ detail: SpotDetail | null }`로 응답해 클라이언트가
// 데이터가 있으면 렌더, 없으면 조용히 생략하도록 한다.
export async function GET(request: NextRequest) {
  const spotName = request.nextUrl.searchParams.get("spotName");
  const mapX = request.nextUrl.searchParams.get("mapX");
  const mapY = request.nextUrl.searchParams.get("mapY");

  if (!spotName || !mapX || !mapY) {
    return NextResponse.json(
      { error: "spotName, mapX, mapY 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const detail = await fetchSpotDetail(spotName, mapX, mapY);
  return NextResponse.json({ detail });
}
