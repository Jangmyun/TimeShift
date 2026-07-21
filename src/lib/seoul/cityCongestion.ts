/**
 * 서울시 실시간 도시데이터 — 시간대별 혼잡 축 (TimeShift "붐비지 않는 시간대").
 *
 * `citydata_ppltn`(서울열린데이터광장)은 KT 통신신호 기반으로 서울 주요 116곳의 실시간 혼잡도
 * (4단계)와 AI 기반 향후 12시간(2시간 단위) 예측을 제공한다. 한국관광공사 집중률(전국·일 단위)이
 * "어느 날이 한적한가"를 준다면, 이 API는 서울 핫스팟에 한해 "그 날 몇 시가 한적한가 + 지금 얼마나
 * 붐비는가"를 준다. 서버 전용(키 노출 금지). 순수 보강이라 실패/미커버 시 null로 degrade한다.
 *
 * 엔드포인트 형식(키가 쿼리가 아니라 경로 세그먼트라 callTourApi와 다름):
 *   {ENDPOINT}/{KEY}/json/citydata_ppltn/{start}/{end}/{AREA_NM}
 */
import { resolveCityArea } from "./cityAreas";
import { parseLngLat } from "@/lib/route/geo";
import type { FetchSource } from "@/lib/tourapi/fallback";

export type CongestLevel = "여유" | "보통" | "약간 붐빔" | "붐빔";

export type CityForecast = {
  time: string; // "YYYY-MM-DD HH:mm"
  level: CongestLevel;
  min: number;
  max: number;
};

export type CityCongestion = {
  areaNm: string;
  current: {
    level: CongestLevel;
    message: string;
    min: number;
    max: number;
    time: string;
  };
  forecast: CityForecast[];
  /** 예측 구간 중 가장 한적한 시간대(동률이면 이른 시각). 없으면 null. */
  bestSlot: CityForecast | null;
};

const ENDPOINT =
  process.env.SEOUL_CITYDATA_ENDPOINT ?? "http://openapi.seoul.go.kr:8088";
const SERVICE_KEY = process.env.SEOUL_CITYDATA_KEY ?? "";
const REQUEST_TIMEOUT_MS = 8000;

const LEVELS: CongestLevel[] = ["여유", "보통", "약간 붐빔", "붐빔"];
/** 혼잡도 4단계 → 정렬/비교용 가중치(낮을수록 한적). */
export function congestWeight(level: string): number {
  const idx = LEVELS.indexOf(level as CongestLevel);
  return idx === -1 ? 2 : idx; // 알 수 없으면 "보통"급으로.
}

function normalizeLevel(raw: unknown): CongestLevel {
  const s = typeof raw === "string" ? raw.trim() : "";
  return (LEVELS as string[]).includes(s) ? (s as CongestLevel) : "보통";
}

type PpltnRow = {
  AREA_NM?: string;
  AREA_CONGEST_LVL?: string;
  AREA_CONGEST_MSG?: string;
  AREA_PPLTN_MIN?: string;
  AREA_PPLTN_MAX?: string;
  PPLTN_TIME?: string;
  FCST_PPLTN?: Array<{
    FCST_TIME?: string;
    FCST_CONGEST_LVL?: string;
    FCST_PPLTN_MIN?: string;
    FCST_PPLTN_MAX?: string;
  }>;
};

function parseRow(row: PpltnRow): CityCongestion {
  const forecast: CityForecast[] = Array.isArray(row.FCST_PPLTN)
    ? row.FCST_PPLTN.filter((f) => f && f.FCST_TIME).map((f) => ({
        time: String(f.FCST_TIME),
        level: normalizeLevel(f.FCST_CONGEST_LVL),
        min: Number(f.FCST_PPLTN_MIN) || 0,
        max: Number(f.FCST_PPLTN_MAX) || 0,
      }))
    : [];

  let bestSlot: CityForecast | null = null;
  for (const f of forecast) {
    if (
      !bestSlot ||
      congestWeight(f.level) < congestWeight(bestSlot.level) ||
      (congestWeight(f.level) === congestWeight(bestSlot.level) &&
        f.time < bestSlot.time)
    ) {
      bestSlot = f;
    }
  }

  return {
    areaNm: String(row.AREA_NM ?? ""),
    current: {
      level: normalizeLevel(row.AREA_CONGEST_LVL),
      message: String(row.AREA_CONGEST_MSG ?? ""),
      min: Number(row.AREA_PPLTN_MIN) || 0,
      max: Number(row.AREA_PPLTN_MAX) || 0,
      time: String(row.PPLTN_TIME ?? ""),
    },
    forecast,
    bestSlot,
  };
}

/**
 * hub 좌표에 대응하는 서울 핫스팟의 실시간+시간대 혼잡을 조회한다.
 * - 좌표가 서울 핫스팟 반경 밖 → null (시간대 데이터 없음, 정직한 폴백).
 * - 키 미설정/호출 실패 → null (순수 보강이라 코어 플로우 무영향).
 */
export async function fetchCityCongestion(
  mapX: string,
  mapY: string,
): Promise<{ hourly: CityCongestion | null; source: FetchSource }> {
  const coord = parseLngLat(mapX, mapY);
  if (!coord) return { hourly: null, source: "live" };

  const area = resolveCityArea(coord);
  if (!area) return { hourly: null, source: "live" };

  if (!SERVICE_KEY) return { hourly: null, source: "live" };

  const url = `${ENDPOINT.replace(/\/$/, "")}/${SERVICE_KEY}/json/citydata_ppltn/1/5/${encodeURIComponent(area.areaNm)}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return { hourly: null, source: "live" };
    const json = (await res.json()) as Record<string, unknown>;
    // 이 엔드포인트는 `SeoulRtd.citydata_ppltn`를 **배열로 직접** 반환한다(실호출 검증).
    // 다른 서울 OpenAPI가 쓰는 `{ row: [...] }` 래퍼 형태도 방어적으로 함께 허용한다.
    const body = json["SeoulRtd.citydata_ppltn"];
    let row: PpltnRow | undefined;
    if (Array.isArray(body)) {
      row = body[0] as PpltnRow | undefined;
    } else if (body && typeof body === "object") {
      const rowRaw = (body as { row?: PpltnRow[] | PpltnRow }).row;
      row = Array.isArray(rowRaw) ? rowRaw[0] : rowRaw;
    }
    if (!row) return { hourly: null, source: "live" };
    return { hourly: parseRow(row), source: "live" };
  } catch {
    // 시간대 축은 순수 보강 → 실패는 조용히 null(코어 플로우 무영향).
    return { hourly: null, source: "live" };
  }
}
