import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiError } from "@/lib/llm/gemini";

/**
 * F5 — LLM 코스 설명 생성.
 *
 * POST로 F1~F4 결과(선택 관광지, 추천 방문시기, 상위 연관 관광지, 사용자 조건)를 받아
 * Gemini에 "카드뉴스형 짧은 안내 문단"을 생성시킨다. LLM 실패/키 누락 시 템플릿 기반 정적
 * 문장으로 degrade한다(데모 안정성, PRD §8) — 항상 200으로 응답한다.
 */

type RelatedBrief = { name: string; category?: string };

type SummaryPayload = {
  spotName?: unknown;
  regionName?: unknown;
  recommended?: { startYmd?: unknown; endYmd?: unknown; avgRate?: unknown } | null;
  relatedSpots?: unknown;
  condition?: unknown;
};

/** YYYYMMDD → "M월 D일". 형식이 아니면 원문 반환. */
function formatYmd(ymd: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

function buildFallback(
  spotName: string,
  regionName: string,
  recommended: { startYmd: string; endYmd: string; avgRate: number } | null,
  related: RelatedBrief[],
): string {
  const where = regionName ? `${regionName}의 ` : "";
  const when = recommended
    ? recommended.startYmd === recommended.endYmd
      ? `${formatYmd(recommended.startYmd)}`
      : `${formatYmd(recommended.startYmd)}~${formatYmd(recommended.endYmd)}`
    : null;
  const parts: string[] = [];
  parts.push(
    when
      ? `${where}${spotName}은(는) 이 기간 중 ${when}쯤 방문하면 상대적으로 한적하게 둘러볼 수 있어요.`
      : `${where}${spotName} 방문을 계획 중이시군요.`,
  );
  if (related.length > 0) {
    const names = related.slice(0, 3).map((r) => r.name).join(", ");
    parts.push(`가까운 ${names} 같은 곳도 함께 묶어 코스로 즐겨보세요.`);
  }
  return parts.join(" ");
}

export async function POST(request: NextRequest) {
  let payload: SummaryPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 },
    );
  }

  const spotName =
    typeof payload.spotName === "string" ? payload.spotName.trim() : "";
  if (!spotName) {
    return NextResponse.json(
      { error: "spotName 필드가 필요합니다." },
      { status: 400 },
    );
  }
  const regionName =
    typeof payload.regionName === "string" ? payload.regionName.trim() : "";
  const condition =
    typeof payload.condition === "string" ? payload.condition.trim() : "";

  const rec = payload.recommended;
  const recommended =
    rec &&
    typeof rec.startYmd === "string" &&
    typeof rec.endYmd === "string"
      ? {
          startYmd: rec.startYmd,
          endYmd: rec.endYmd,
          avgRate: Number(rec.avgRate) || 0,
        }
      : null;

  const related: RelatedBrief[] = Array.isArray(payload.relatedSpots)
    ? payload.relatedSpots
        .map((r): RelatedBrief | null => {
          if (r && typeof r === "object" && typeof (r as RelatedBrief).name === "string") {
            const rb = r as RelatedBrief;
            return { name: rb.name, category: rb.category };
          }
          return null;
        })
        .filter((r): r is RelatedBrief => r !== null)
        .slice(0, 5)
    : [];

  const fallback = buildFallback(spotName, regionName, recommended, related);

  const when = recommended
    ? `${formatYmd(recommended.startYmd)}~${formatYmd(recommended.endYmd)} (평균 집중률 ${recommended.avgRate.toFixed(1)})`
    : "데이터 없음";
  const prompt = [
    "당신은 한국 관광 안내원입니다. 아래 정보를 바탕으로 방문 안내 문단을 작성하세요.",
    "",
    `- 관광지: ${spotName}${regionName ? ` (${regionName})` : ""}`,
    `- 추천 방문 시기(가장 한적한 구간): ${when}`,
    `- 주변 연관 관광지: ${related.length > 0 ? related.map((r) => r.name).join(", ") : "없음"}`,
    condition ? `- 사용자 조건: "${condition}"` : "- 사용자 조건: 없음",
    "",
    "요구사항:",
    "- 자연스럽고 친근한 한국어 존댓말, 2~3문장, 120자 내외.",
    "- '이 관광지는 지금 혼잡하니 추천 시기에 방문하고, 비슷한 주변 관광지도 고려하세요'라는 핵심 메시지.",
    "- 추천 방문 시기가 있으면 날짜를 자연스럽게 언급. 마크다운/불릿 없이 문단 텍스트만 출력.",
  ].join("\n");

  try {
    const text = await generateText(prompt, { temperature: 0.6 });
    return NextResponse.json({ summary: text, source: "llm" });
  } catch (err) {
    if (!(err instanceof GeminiError)) console.error(err);
    return NextResponse.json({ summary: fallback, source: "fallback" });
  }
}
