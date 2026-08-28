import { NextRequest, NextResponse } from "next/server";
import { fetchRelatedSpotDetail } from "@/lib/tourapi/detail";
import { findRegion, findSigungu } from "@/lib/regions";

// F3 연관 관광지 상위 카드 보강. 좌표가 없는 데이터라 지역 코드로 후보 주소를 보수적으로
// 확인하고, 실패/미매칭은 항상 `{ detail: null }`로 degrade한다.
export async function GET(request: NextRequest) {
  const spotName = request.nextUrl.searchParams.get("spotName");
  const areaCd = request.nextUrl.searchParams.get("areaCd");
  const signguCd = request.nextUrl.searchParams.get("signguCd");

  if (!spotName || !areaCd || !signguCd) {
    return NextResponse.json(
      { error: "spotName, areaCd, signguCd 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const region = findRegion(areaCd);
  const sigungu = findSigungu(areaCd, signguCd);
  if (!region || !sigungu) {
    return NextResponse.json(
      { error: "알 수 없는 지역 코드입니다." },
      { status: 400 },
    );
  }

  const detail = await fetchRelatedSpotDetail(spotName, {
    areaNm: region.areaNm,
    signguNm: sigungu.name,
  });

  return NextResponse.json(
    { detail },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
