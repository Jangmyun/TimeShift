import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiError } from "@/lib/llm/gemini";

/**
 * F5 — LLM 코스 설명 생성 (그래프 동선 + 시간대 혼잡 반영).
 *
 * 이전 버전은 연관 관광지 "이름만" 넘겨 모델이 나열밖에 못 했다. 이제 최소 이동 동선(순서·구간
 * 거리)·추천 방문 시기(날짜 + 서울이면 시간대)·현재 혼잡을 구조화해 넘겨, "지금 혼잡하니 [시기]에
 * [최소 동선]으로 돌아보라 + 그 시간대엔 혜택"이라는 서사를 생성시킨다. LLM 실패/키 누락 시
 * 동선을 반영한 템플릿으로 degrade하며(이름 나열 아님) 항상 200으로 응답한다(PRD §8).
 */

type CourseStopBrief = {
  name: string;
  order: number;
  distanceFromPrevKm: number;
  category?: string;
  isHub?: boolean;
};

type AvoidanceEffectEvidence = {
  peakAvoidPoint: number;
  averageAvoidPoint: number;
  recommendedAvgRate: number;
  peakRate: number;
  averageRate: number;
};

type SummaryPayload = {
  spotName?: unknown;
  regionName?: unknown;
  recommended?: { startYmd?: unknown; endYmd?: unknown; avgRate?: unknown } | null;
  course?: unknown;
  totalDistanceKm?: unknown;
  avoidanceEffect?: unknown;
  currentCongestion?: { level?: unknown; message?: unknown } | null;
  bestTimeSlot?: { time?: unknown; level?: unknown } | null;
  condition?: unknown;
};

/** YYYYMMDD → "M월 D일". 형식이 아니면 원문 반환. */
function formatYmd(ymd: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

/** "YYYY-MM-DD HH:mm" → "오전/오후 h시경". 파싱 실패 시 원문. */
function formatSlot(time: string): string {
  const m = /(\d{1,2}):\d{2}/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}시경`;
}

function windowText(
  recommended: { startYmd: string; endYmd: string } | null,
): string | null {
  if (!recommended) return null;
  return recommended.startYmd === recommended.endYmd
    ? formatYmd(recommended.startYmd)
    : `${formatYmd(recommended.startYmd)}~${formatYmd(recommended.endYmd)}`;
}

/** 동선을 "① 경복궁(중심) → ② 북촌한옥마을(약 0.9km)" 형태 한 줄로. */
function courseLine(course: CourseStopBrief[]): string {
  return course
    .map((s) => {
      const label = s.isHub
        ? `${s.name}(중심)`
        : s.distanceFromPrevKm > 0
          ? `${s.name}(약 ${s.distanceFromPrevKm}km)`
          : s.name;
      return `${circledNumber(s.order)} ${label}`;
    })
    .join(" → ");
}

function circledNumber(n: number): string {
  const circled = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
  return circled[n - 1] ?? `${n}.`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatPoint(value: number): string {
  return `${value.toFixed(1)}p`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseAvoidanceEffect(
  raw: unknown,
): AvoidanceEffectEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const peakAvoidPoint = source.peakAvoidPoint;
  const averageAvoidPoint = source.averageAvoidPoint;
  const recommendedAvgRate = source.recommendedAvgRate;
  const peakRate = source.peakRate;
  const averageRate = source.averageRate;

  if (
    !isFiniteNumber(peakAvoidPoint) ||
    !isFiniteNumber(averageAvoidPoint) ||
    !isFiniteNumber(recommendedAvgRate) ||
    !isFiniteNumber(peakRate) ||
    !isFiniteNumber(averageRate)
  )
    return null;

  return {
    peakAvoidPoint: Math.max(0, round1(peakAvoidPoint)),
    averageAvoidPoint: Math.max(0, round1(averageAvoidPoint)),
    recommendedAvgRate: round1(recommendedAvgRate),
    peakRate: round1(peakRate),
    averageRate: round1(averageRate),
  };
}

function evidenceText(
  evidence: AvoidanceEffectEvidence | null,
  totalDistanceKm: number,
): string | null {
  if (!evidence) return null;
  const distance =
    totalDistanceKm > 0 ? `, 추천 코스 총 이동거리 ${totalDistanceKm.toFixed(1)}km` : "";
  return `추천 구간 평균 집중률 ${formatPercent(evidence.recommendedAvgRate)}로 최고 혼잡일 대비 ${formatPoint(evidence.peakAvoidPoint)}, 30일 평균 대비 ${formatPoint(evidence.averageAvoidPoint)} 낮습니다${distance}.`;
}

function distanceEvidenceText(totalDistanceKm: number): string {
  return totalDistanceKm > 0
    ? `, 추천 코스 총 이동거리 ${totalDistanceKm.toFixed(1)}km`
    : "";
}

export function buildFallback(
  spotName: string,
  regionName: string,
  recommended: { startYmd: string; endYmd: string; avgRate: number } | null,
  course: CourseStopBrief[],
  totalDistanceKm: number,
  currentLevel: string | null,
  bestSlot: string | null,
  avoidanceEffect: AvoidanceEffectEvidence | null = null,
): string {
  const where = regionName ? `${regionName}의 ` : "";
  const when = windowText(recommended);
  const parts: string[] = [];
  const evidence = evidenceText(avoidanceEffect, totalDistanceKm);

  // ① 현재 혼잡 + ② 추천 시기(날짜).
  const nowClause = currentLevel
    ? `${where}${spotName}은(는) 지금 '${currentLevel}' 수준으로 붐비고 있어요.`
    : `${where}${spotName}을(를) 여유롭게 둘러보고 싶으시군요.`;
  if (when) {
    parts.push(
      `${nowClause} 향후 30일 중 ${when}쯤이 가장 한적하니${bestSlot ? ` ${bestSlot} 방문을 추천드려요.` : " 이때 방문을 추천드려요."}${evidence ? ` ${evidence}` : ""}`,
    );
  } else {
    parts.push(nowClause);
  }

  // ③ 최소 동선 코스.
  const stops = course.filter((s) => !s.isHub);
  if (stops.length > 0) {
    const names = stops
      .slice(0, 3)
      .map((s) => `${s.name}(약 ${s.distanceFromPrevKm}km)`)
      .join(", ");
    parts.push(
      `${spotName}을(를) 시작으로 ${names}${stops.length > 3 ? " 등" : ""}을 잇는 최소 동선${totalDistanceKm > 0 ? `(총 ${totalDistanceKm}km)` : ""}으로 돌면 이동 부담 없이 코스로 즐길 수 있어요.`,
    );
  }

  // ④ 시간대 혜택 티저.
  parts.push(
    "추천 방문 시기에 맞춰 오시면 제휴 할인·우선입장 혜택도 함께 준비하고 있어요.",
  );

  return parts.join(" ");
}

function parseCourse(raw: unknown): CourseStopBrief[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): CourseStopBrief | null => {
      if (r && typeof r === "object" && typeof (r as CourseStopBrief).name === "string") {
        const s = r as CourseStopBrief;
        return {
          name: s.name,
          order: Number(s.order) || 0,
          distanceFromPrevKm: Number(s.distanceFromPrevKm) || 0,
          category: typeof s.category === "string" ? s.category : undefined,
          isHub: s.isHub === true,
        };
      }
      return null;
    })
    .filter((s): s is CourseStopBrief => s !== null)
    .sort((a, b) => a.order - b.order)
    .slice(0, 9);
}

export const summaryTestUtils = {
  buildFallback,
  parseAvoidanceEffect,
};

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
    rec && typeof rec.startYmd === "string" && typeof rec.endYmd === "string"
      ? {
          startYmd: rec.startYmd,
          endYmd: rec.endYmd,
          avgRate: Number(rec.avgRate) || 0,
        }
      : null;

  const course = parseCourse(payload.course);
  const totalDistanceKm = Number(payload.totalDistanceKm) || 0;
  const avoidanceEffect = parseAvoidanceEffect(payload.avoidanceEffect);
  const currentLevel =
    payload.currentCongestion &&
    typeof payload.currentCongestion.level === "string"
      ? payload.currentCongestion.level
      : null;
  const currentMsg =
    payload.currentCongestion &&
    typeof payload.currentCongestion.message === "string"
      ? payload.currentCongestion.message
      : null;
  const bestSlotRaw =
    payload.bestTimeSlot && typeof payload.bestTimeSlot.time === "string"
      ? payload.bestTimeSlot.time
      : null;
  const bestSlot = bestSlotRaw ? formatSlot(bestSlotRaw) : null;
  const bestSlotLevel =
    payload.bestTimeSlot && typeof payload.bestTimeSlot.level === "string"
      ? payload.bestTimeSlot.level
      : null;

  const fallback = buildFallback(
    spotName,
    regionName,
    recommended,
    course,
    totalDistanceKm,
    currentLevel,
    bestSlot,
    avoidanceEffect,
  );

  const when = windowText(recommended);
  const prompt = [
    "당신은 오버투어리즘 완화 서비스 'TimeShift'의 안내원입니다. 핵심은 '다른 곳으로 가라'가 아니라",
    "'같은 곳을 덜 붐비는 시간에, 최소 동선으로 돌아보라'입니다. 아래 데이터로 방문 안내를 작성하세요.",
    "",
    `- 중심 관광지: ${spotName}${regionName ? ` (${regionName})` : ""}`,
    currentLevel
      ? `- 현재 실시간 혼잡도: ${currentLevel}${currentMsg ? ` (${currentMsg})` : ""}`
      : "- 현재 실시간 혼잡도: (데이터 없음 — '지금 붐비는 편'으로 자연스럽게 표현)",
    when
      ? `- 추천 방문 날짜(가장 한적한 구간): ${when} (평균 집중률 ${recommended!.avgRate.toFixed(1)})`
      : "- 추천 방문 날짜: 데이터 없음",
    avoidanceEffect
      ? `- 수치 근거: 추천 구간 평균 집중률 ${formatPercent(avoidanceEffect.recommendedAvgRate)}, 최고 혼잡일 ${formatPercent(avoidanceEffect.peakRate)} 대비 ${formatPoint(avoidanceEffect.peakAvoidPoint)} 감소, 30일 평균 ${formatPercent(avoidanceEffect.averageRate)} 대비 ${formatPoint(avoidanceEffect.averageAvoidPoint)} 감소${distanceEvidenceText(totalDistanceKm)}`
      : "- 수치 근거: 데이터 없음(감소폭 숫자는 언급하지 말 것)",
    bestSlot
      ? `- 추천 방문 시간대(예측 최저): ${bestSlot}${bestSlotLevel ? ` (${bestSlotLevel})` : ""}`
      : "- 추천 방문 시간대: (시간대 데이터 없는 지역 — 언급하지 말 것)",
    course.length > 1
      ? `- 최소 이동 동선(순서·구간거리): ${courseLine(course)} / 총 ${totalDistanceKm}km`
      : "- 최소 이동 동선: 주변 연관 관광지 없음(동선 언급 생략)",
    condition ? `- 사용자 조건: "${condition}"` : "- 사용자 조건: 없음",
    "",
    "요구사항:",
    "- 자연스럽고 친근한 한국어 존댓말, 2~4문장, 180자 내외. 마크다운·불릿·번호기호 없이 문단 텍스트만.",
    "- 수치 근거가 있으면 최고 혼잡일 대비 감소폭, 30일 평균 대비 감소폭, 추천 구간 평균 집중률, 총 이동거리를 1문장 안에 간결히 녹일 것.",
    "- 반드시 순서대로 녹여낼 것: ① 지금 혼잡함 → ② 추천 방문 날짜(+시간대 데이터가 있으면 시간대까지) →",
    "  ③ 중심에서 시작하는 최소 동선 코스(관광지 2~3곳을 이동 순서와 대략 거리 느낌으로) → ④ 그 시간대 방문 시 제휴 혜택 한 마디.",
    "- 연관 관광지를 '나열'하지 말고 '동선(A에서 걸어서 B로)'으로 서술할 것.",
    "",
    "예시 톤:",
    "\"지금 을왕리해수욕장은 매우 붐비니, 비교적 한적한 7월 21일~23일 오전에 방문해 보세요. 해변을 둘러본 뒤 가까운 선녀바위(약 1.2km), 왕산해수욕장(약 0.9km)까지 이어 걷는 코스면 이동도 편합니다. 이 시간대에 맞춰 오시면 제휴 할인도 준비 중이에요.\"",
  ].join("\n");

  try {
    const text = await generateText(prompt, { temperature: 0.6 });
    return NextResponse.json({ summary: text, source: "llm" });
  } catch (err) {
    if (!(err instanceof GeminiError)) console.error(err);
    return NextResponse.json({ summary: fallback, source: "fallback" });
  }
}
