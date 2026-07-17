/**
 * Gemini 호출 얇은 래퍼 (REST fetch).
 *
 * provider 교체 대비해 SDK/HTTP 의존을 이 파일 한 곳에 격리한다. F4(조건 파싱)·F5(코스 설명)가
 * 이 모듈만 재사용한다. 반드시 서버(API Route)에서만 호출 — GEMINI_API_KEY 클라이언트 노출 금지.
 */

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// 최신 flash 계열. `gemini-flash-latest`는 항상 현행 안정 flash 모델을 가리키는 별칭이라
// 모델 폐기(deprecation)에 자동 대응한다. 필요 시 GEMINI_MODEL로 고정 버전 지정 가능.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export function isGeminiConfigured(): boolean {
  return API_KEY.length > 0;
}

type GenerateOptions = {
  /** JSON 응답 강제 (responseMimeType=application/json). */
  json?: boolean;
  /** 시스템 지시. */
  system?: string;
  temperature?: number;
};

/**
 * 프롬프트 하나를 보내고 모델의 텍스트 응답을 그대로 반환한다.
 * 키 미설정/HTTP 오류/빈 응답은 GeminiError로 던진다 — 호출자가 폴백을 결정.
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new GeminiError("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiError("Gemini 요청에 실패했습니다 (네트워크).");
  }

  if (!res.ok) {
    throw new GeminiError(`Gemini 응답 오류 (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new GeminiError("Gemini 응답이 비어 있습니다.");
  }
  return text;
}

/**
 * generateText(json:true)의 응답을 파싱해 반환한다. 모델이 코드펜스(```json)로 감싸는 경우까지
 * 벗겨낸 뒤 JSON.parse 한다. 파싱 실패는 GeminiError.
 */
export async function generateJson<T>(
  prompt: string,
  options: Omit<GenerateOptions, "json"> = {},
): Promise<T> {
  const raw = await generateText(prompt, { ...options, json: true });
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiError("Gemini JSON 파싱에 실패했습니다.");
  }
}
