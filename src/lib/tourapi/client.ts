/**
 * data.go.kr 공공데이터 API 공통 호출 헬퍼.
 *
 * 각 API는 .env의 `<PREFIX>_ENDPOINT`(오퍼레이션명 제외한 base URL)와
 * `<PREFIX>_KEY_DECODED`(URLSearchParams가 자동 인코딩하도록 디코딩된 원본 키)를 사용한다.
 * 서버 컴포넌트/라우트 핸들러에서만 호출해야 하며, 클라이언트에 키를 노출하면 안 된다.
 */

type TourApiEnvelope<T> = {
  response: {
    header: { resultCode: string; resultMsg: string };
    body?: {
      items: "" | { item: T[] | T };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

// 공공데이터 호출 타임아웃(ms). 정상 응답은 대략 4초 이내라 8초면 느린 응답도 허용하면서
// data.go.kr 지연·불통 시 undici 기본 10초 대신 더 빨리 실패하게 한다.
const REQUEST_TIMEOUT_MS = 8000;

export class TourApiError extends Error {
  constructor(
    public resultCode: string,
    resultMsg: string,
  ) {
    super(`TourAPI error ${resultCode}: ${resultMsg}`);
    this.name = "TourApiError";
  }
}

/**
 * @param endpoint base URL (예: process.env.TOURAPI_HUB_SPOT_ENDPOINT)
 * @param serviceKey 디코딩된 인증키 (예: process.env.TOURAPI_HUB_SPOT_KEY_DECODED)
 * @param operation 오퍼레이션명 (예: "areaBasedList1")
 * @param params 오퍼레이션별 쿼리 파라미터. serviceKey/_type/MobileOS/MobileApp은 자동 주입.
 */
export async function callTourApi<T>(
  endpoint: string,
  serviceKey: string,
  operation: string,
  params: Record<string, string | number | undefined>,
): Promise<T[]> {
  if (!endpoint || !serviceKey) {
    throw new Error(
      `TourAPI endpoint/key가 설정되지 않았습니다. .env를 확인하세요. (operation=${operation})`,
    );
  }

  const query = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: "TimeShift",
    _type: "json",
  });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  const url = `${endpoint.replace(/\/$/, "")}/${operation}?${query.toString()}`;
  // 명시적 타임아웃(내장 AbortSignal). 없으면 undici 기본 10초 커넥트 타임아웃까지 매달려,
  // data.go.kr가 느리거나 불통일 때 폴백 없는 지역이 10초씩 502로 지연된다(정상 응답은 ~4s라
  // 8초면 충분한 여유). 타임아웃/네트워크 오류는 throw되어 상위 fetch* 헬퍼가 폴백/502로 처리.
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`TourAPI 타임아웃(${REQUEST_TIMEOUT_MS}ms): ${operation}`);
    }
    throw err;
  }
  if (!res.ok) {
    throw new Error(`TourAPI HTTP ${res.status}: ${operation}`);
  }

  const json = (await res.json()) as TourApiEnvelope<T>;
  const { header, body } = json.response;
  if (header.resultCode !== "0000") {
    throw new TourApiError(header.resultCode, header.resultMsg);
  }
  if (!body || body.items === "") return [];
  return Array.isArray(body.items.item) ? body.items.item : [body.items.item];
}

/** YYYYMM 형식의 문자열을 delta개월만큼 이동시켜 반환한다. */
export function shiftYm(ym: string, delta: number): string {
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(4, 6));
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentYm(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}
