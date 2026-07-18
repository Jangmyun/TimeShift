import { callTourApi, currentYm, shiftYm } from "./client";
import { getFallbackRelated, type FetchSource } from "./fallback";

export type RelatedSpot = {
  rlteTatsCd: string;
  rlteTatsNm: string;
  rlteRegnCd: string;
  rlteRegnNm: string;
  rlteSignguCd: string;
  rlteSignguNm: string;
  rlteCtgryLclsNm: string;
  rlteCtgryMclsNm: string;
  rlteCtgrySclsNm: string;
  rlteRank: string;
};

type RelatedSpotApiItem = RelatedSpot & {
  baseYm: string;
  tAtsCd: string;
  tAtsNm: string;
  areaCd: string;
  areaNm: string;
  signguCd: string;
  signguNm: string;
};

const ENDPOINT = process.env.TOURAPI_RELATED_SPOT_ENDPOINT ?? "";
const SERVICE_KEY = process.env.TOURAPI_RELATED_SPOT_KEY_DECODED ?? "";
const MAX_LOOKBACK_MONTHS = 3;

/**
 * areaBasedList1(연관 관광지)도 hub spot API처럼 특정 관광지 단위 필터가 없고
 * 시/군/구 전체 기준 관광지들의 연관 목록을 한 번에 반환한다. 다행히 이 API의 tAtsCd는
 * F1 hub spot API의 hubTatsCd와 동일한 코드 체계라 이름 매칭 없이 정확히 필터링할 수 있다
 * (F2 congestion API와 달리 이름 매칭 문제가 없음).
 */
export async function fetchRelatedSpots(
  areaCd: string,
  signguCd: string,
  tAtsCd: string,
): Promise<{ items: RelatedSpot[]; baseYm: string | null; source: FetchSource }> {
  try {
    let ym = currentYm();
    for (let i = 0; i <= MAX_LOOKBACK_MONTHS; i++) {
      const items = await callTourApi<RelatedSpotApiItem>(
        ENDPOINT,
        SERVICE_KEY,
        "areaBasedList1",
        { areaCd, signguCd, baseYm: ym, numOfRows: 2000, pageNo: 1 },
      );
      const filtered = items
        .filter((item) => item.tAtsCd === tAtsCd)
        .sort((a, b) => Number(a.rlteRank) - Number(b.rlteRank));
      if (filtered.length > 0) {
        return { items: filtered, baseYm: ym, source: "live" };
      }
      ym = shiftYm(ym, -1);
    }
    return { items: [], baseYm: null, source: "live" };
  } catch (err) {
    // API 실패 시 대표 지역은 정적 캐시로 degrade(데모 안정성). 캐시 없으면 원래 에러 전파.
    const fb = getFallbackRelated(areaCd, signguCd, tAtsCd);
    if (!fb) throw err;
    return { items: fb.items, baseYm: fb.baseYm, source: "fallback" };
  }
}
