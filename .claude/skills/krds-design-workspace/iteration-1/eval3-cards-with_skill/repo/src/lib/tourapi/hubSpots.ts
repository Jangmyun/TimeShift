import { callTourApi, currentYm, shiftYm } from "./client";

export type HubSpot = {
  baseYm: string;
  areaCd: string;
  areaNm: string;
  signguCd: string;
  signguNm: string;
  hubTatsCd: string;
  hubTatsNm: string;
  hubCtgryLclsNm: string;
  hubCtgryMclsNm: string;
  hubRank: string;
  mapX: string;
  mapY: string;
};

const ENDPOINT = process.env.TOURAPI_HUB_SPOT_ENDPOINT ?? "";
const SERVICE_KEY = process.env.TOURAPI_HUB_SPOT_KEY_DECODED ?? "";

/** 데이터가 아직 집계되지 않은 최신 월(baseYm)을 건너뛰고 데이터가 있는 가장 최근 월을 찾는다. */
const MAX_LOOKBACK_MONTHS = 3;

/**
 * 지역(areaCd/signguCd)의 중심 관광지 목록을 hubRank 순으로 조회한다.
 * baseYm을 지정하지 않으면 최신 월부터 최대 {@link MAX_LOOKBACK_MONTHS}개월 전까지
 * 데이터가 존재하는 첫 번째 월을 사용한다 (집계 지연 대응).
 */
export async function fetchHubSpots(
  areaCd: string,
  signguCd: string,
  numOfRows = 30,
): Promise<{ items: HubSpot[]; baseYm: string | null }> {
  let ym = currentYm();
  for (let i = 0; i <= MAX_LOOKBACK_MONTHS; i++) {
    const items = await callTourApi<HubSpot>(
      ENDPOINT,
      SERVICE_KEY,
      "areaBasedList1",
      { areaCd, signguCd, baseYm: ym, numOfRows, pageNo: 1 },
    );
    if (items.length > 0) {
      const sorted = [...items].sort(
        (a, b) => Number(a.hubRank) - Number(b.hubRank),
      );
      return { items: sorted, baseYm: ym };
    }
    ym = shiftYm(ym, -1);
  }
  return { items: [], baseYm: null };
}
