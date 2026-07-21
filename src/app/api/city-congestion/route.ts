import { NextRequest, NextResponse } from "next/server";
import { fetchCityCongestion } from "@/lib/seoul/cityCongestion";

/**
 * 서울 핫스팟 시간대별 혼잡(실시간 + 12h 예측) 조회.
 *
 * hub의 좌표(mapX/mapY)로 대응 서울 구역을 찾아 citydata_ppltn을 조회한다. 순수 보강이라
 * 미커버(서울 밖·비핫스팟)·실패 시에도 항상 200 `{ hourly: null }`로 응답한다(spot-detail 패턴).
 * 시간대 데이터가 없으면 클라이언트는 날짜 축(집중률)만으로 자연스럽게 degrade한다.
 */
export async function GET(request: NextRequest) {
  const mapX = request.nextUrl.searchParams.get("mapX");
  const mapY = request.nextUrl.searchParams.get("mapY");

  if (!mapX || !mapY) {
    return NextResponse.json({ hourly: null });
  }

  try {
    const { hourly, source } = await fetchCityCongestion(mapX, mapY);
    return NextResponse.json(
      { hourly, source },
      {
        // 실시간성이 있지만 2시간 단위 예측이라 수 분 캐싱은 무해(재선택 재요청 회피).
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
        },
      },
    );
  } catch {
    return NextResponse.json({ hourly: null });
  }
}
