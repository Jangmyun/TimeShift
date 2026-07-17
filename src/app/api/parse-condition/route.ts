import { NextRequest, NextResponse } from "next/server";
import { generateJson, GeminiError } from "@/lib/llm/gemini";

/**
 * F4 — 자유 텍스트 조건 파싱.
 *
 * POST { text: string, availableCategories: string[] }
 *   → Gemini에 "주어진 카테고리 중 조건에 맞는 것을 고르고 부가 키워드를 뽑아라"는 구조화 프롬프트
 *   → { categories: string[], keywords: string[] }
 *
 * Gemini 실패/키 누락/모호한 입력은 에러가 아니라 빈 결과(200)로 폴백한다. 클라이언트는 빈 결과를
 * 받으면 기존 카테고리 버튼 필터로 자연스럽게 되돌아간다(데모 안정성, PRD §8).
 */

type ParseResult = { categories: string[]; keywords: string[] };

const EMPTY: ParseResult = { categories: [], keywords: [] };

export async function POST(request: NextRequest) {
  let payload: { text?: unknown; availableCategories?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 },
    );
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const availableCategories = Array.isArray(payload.availableCategories)
    ? payload.availableCategories.filter(
        (c): c is string => typeof c === "string",
      )
    : [];

  if (!text) {
    return NextResponse.json(
      { error: "text 필드가 필요합니다." },
      { status: 400 },
    );
  }

  const prompt = [
    "당신은 한국 관광 추천 서비스의 조건 파서입니다.",
    "사용자의 자유로운 자연어 조건을 아래 카테고리 목록과 부가 키워드로 변환하세요.",
    "",
    `사용 가능한 카테고리(대분류): ${JSON.stringify(availableCategories)}`,
    `사용자 조건: "${text}"`,
    "",
    "규칙:",
    "- categories: 위 목록에 존재하는 값만, 조건에 맞는 것만 골라 담습니다. 확신이 없으면 비웁니다.",
    "- keywords: 관광지 이름/성격을 좁힐 수 있는 한국어 핵심 키워드 0~5개(예: 한적, 실내, 아이, 전통).",
    "- 반드시 다음 형태의 JSON만 출력: {\"categories\": string[], \"keywords\": string[]}",
  ].join("\n");

  try {
    const parsed = await generateJson<Partial<ParseResult>>(prompt, {
      temperature: 0.2,
    });
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.filter(
          (c): c is string =>
            typeof c === "string" && availableCategories.includes(c),
        )
      : [];
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    return NextResponse.json({ categories, keywords });
  } catch (err) {
    if (!(err instanceof GeminiError)) console.error(err);
    return NextResponse.json(EMPTY);
  }
}
