"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Select,
  Badge,
  Button,
  Spinner,
  CriticalAlert,
  TextInput,
  ContextualHelp,
} from "krds-react";
import { REGIONS } from "@/lib/regions";
import type { HubSpot } from "@/lib/tourapi/hubSpots";
import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";
import type { SpotDetail } from "@/lib/tourapi/detail";
import { CongestionChart } from "@/components/CongestionChart";
import { SpotMap } from "@/components/SpotMap";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; items: HubSpot[]; baseYm: string };

type CongestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | {
      status: "success";
      series: CongestionDay[];
      recommended: RecommendedWindow | null;
    };

type RelatedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; items: RelatedSpot[] };

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; text: string; source: "llm" | "fallback" };

// 상세정보 보강(F2): 순수 부가 정보라 로딩/실패 상태는 UI를 막지 않는다(있으면 표시, 없으면 생략).
type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; detail: SpotDetail | null };

// krds-react design tokens (.claude/skills/krds-design/references/design-tokens.md).
// Card containers have no krds-react component equivalent, so their border/background
// colors are pulled from the real KRDS palette instead of default Tailwind grays/blues.
const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_BORDER_HOVER = "#86aff9"; // --krds-color-light-primary-30
const KRDS_BORDER_SELECTED = "#256ef4"; // --krds-color-light-primary-50
const KRDS_BG_SELECTED = "#ecf2fe"; // --krds-color-light-primary-5
const KRDS_PRIMARY_50 = "#256ef4"; // --krds-color-light-primary-50

// STEP2 목록은 처음에 상위 TOP_N개만 보여주고 "더 보기"로 확장한다(긴 목록 스크롤 부담 완화).
const TOP_N = 8;

export default function Home() {
  const [areaCd, setAreaCd] = useState<string>("");
  const [signguCd, setSignguCd] = useState<string>("");
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [selectedSpot, setSelectedSpot] = useState<HubSpot | null>(null);
  const [congestion, setCongestion] = useState<CongestionState>({
    status: "idle",
  });
  const [related, setRelated] = useState<RelatedState>({ status: "idle" });
  // F3/F4 공유 필터 (RelatedSpotList에서 끌어올림): 카테고리 버튼과 F4 자유 텍스트 파싱이
  // 같은 필터 상태를 조작한다.
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [conditionText, setConditionText] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [summary, setSummary] = useState<SummaryState>({ status: "idle" });
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });
  // STEP2 목록 "상위 8개만 / 전체" 토글.
  const [showAllSpots, setShowAllSpots] = useState(false);

  const sigunguOptions = useMemo(
    () => REGIONS.find((r) => r.areaCd === areaCd)?.sigungu ?? [],
    [areaCd],
  );

  async function handleSearch(nextAreaCd: string, nextSignguCd: string) {
    setState({ status: "loading" });
    setSelectedSpot(null);
    setCongestion({ status: "idle" });
    setShowAllSpots(false);
    try {
      const res = await fetch(
        `/api/hub-spots?areaCd=${nextAreaCd}&signguCd=${nextSignguCd}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "조회 실패" });
        return;
      }
      if (!data.baseYm || data.items.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "success", items: data.items, baseYm: data.baseYm });
    } catch {
      setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
    }
  }

  async function handleSelectSpot(spot: HubSpot) {
    setSelectedSpot(spot);
    setCongestion({ status: "loading" });
    setRelated({ status: "loading" });
    setDetail({ status: "loading" });
    // 새 관광지를 고르면 이전 F4 조건/필터·F5 요약을 초기화.
    setCategoryFilter("");
    setKeywords([]);
    setConditionText("");
    setSummary({ status: "idle" });

    // 상세정보 보강(F2): 이미지·개요·홈페이지. 실패해도 코어 플로우 무영향 → done+null로 흡수.
    void (async () => {
      try {
        const res = await fetch(
          `/api/spot-detail?spotName=${encodeURIComponent(spot.hubTatsNm)}&mapX=${encodeURIComponent(spot.mapX)}&mapY=${encodeURIComponent(spot.mapY)}`,
        );
        const data = await res.json();
        setDetail({ status: "done", detail: res.ok ? data.detail : null });
      } catch {
        setDetail({ status: "done", detail: null });
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/congestion?areaCd=${spot.areaCd}&signguCd=${spot.signguCd}&spotName=${encodeURIComponent(spot.hubTatsNm)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setCongestion({ status: "error", message: data.error ?? "조회 실패" });
          return;
        }
        if (data.series.length === 0) {
          setCongestion({ status: "empty" });
          return;
        }
        setCongestion({
          status: "success",
          series: data.series,
          recommended: data.recommended,
        });
      } catch {
        setCongestion({
          status: "error",
          message: "네트워크 오류가 발생했습니다.",
        });
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/related-spots?areaCd=${spot.areaCd}&signguCd=${spot.signguCd}&tAtsCd=${spot.hubTatsCd}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setRelated({ status: "error", message: data.error ?? "조회 실패" });
          return;
        }
        if (data.items.length === 0) {
          setRelated({ status: "empty" });
          return;
        }
        setRelated({ status: "success", items: data.items });
      } catch {
        setRelated({
          status: "error",
          message: "네트워크 오류가 발생했습니다.",
        });
      }
    })();
  }

  // F4 — 자유 텍스트 조건을 Gemini로 파싱해 F3 필터에 반영. 실패/모호 시 빈 결과 → 기존
  // 카테고리 버튼 필터로 자연스럽게 폴백(입력 유지).
  async function handleParseCondition() {
    const text = conditionText.trim();
    if (!text || related.status !== "success") return;
    const availableCategories = Array.from(
      new Set(related.items.map((i) => i.rlteCtgryLclsNm)),
    );
    setParsing(true);
    try {
      const res = await fetch("/api/parse-condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, availableCategories }),
      });
      const data = await res.json();
      setCategoryFilter(
        Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories[0]
          : "",
      );
      setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
    } catch {
      // 폴백: 기존 버튼 필터 유지, 아무 것도 바꾸지 않음.
    } finally {
      setParsing(false);
    }
  }

  // F5 — 집중률·연관 데이터가 모두 도착하면(또는 F4 조건이 적용되면) Gemini 코스 요약 생성.
  // 두 fetch가 독립적으로 끝나므로 effect로 "둘 다 준비됨"을 감지해 한 번만 호출한다.
  const congestionSettled =
    congestion.status === "success" || congestion.status === "empty";
  const relatedSettled =
    related.status === "success" || related.status === "empty";
  const appliedCondition = keywords.length > 0 ? keywords.join(", ") : "";

  useEffect(() => {
    if (!selectedSpot || !congestionSettled || !relatedSettled) return;

    const recommended =
      congestion.status === "success" ? congestion.recommended : null;
    const relatedSpots =
      related.status === "success"
        ? related.items.slice(0, 5).map((i) => ({
            name: i.rlteTatsNm,
            category: i.rlteCtgryLclsNm,
          }))
        : [];

    let cancelled = false;
    // 데이터가 모두 도착한 시점에 로딩 표시로 전환하는 의도적 set-state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary({ status: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spotName: selectedSpot.hubTatsNm,
            regionName: `${selectedSpot.areaNm} ${selectedSpot.signguNm}`,
            recommended,
            relatedSpots,
            condition: appliedCondition,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSummary({ status: "error", message: data.error ?? "요약 생성 실패" });
          return;
        }
        setSummary({
          status: "success",
          text: data.summary,
          source: data.source,
        });
      } catch {
        if (!cancelled)
          setSummary({ status: "error", message: "네트워크 오류가 발생했습니다." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedSpot,
    congestion,
    related,
    congestionSettled,
    relatedSettled,
    appliedCondition,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-[24px] px-[20px] py-[32px]">
      {/* 페이지 타이틀 영역 (KRDS page title 패턴). */}
      <section>
        <span
          className="text-[14px] font-semibold"
          style={{ color: KRDS_PRIMARY_50 }}
        >
          관광 혼잡 완화 · 방문 시간 재배치
        </span>
        <h1
          className="mt-[8px] text-[30px] font-bold leading-tight"
          style={{ color: "#1e2124" /* --krds-color-light-gray-90 */ }}
        >
          같은 장소, 덜 붐비는 시간을 데이터로
        </h1>
        <p
          className="mt-[10px] text-[16px] leading-relaxed"
          style={{ color: "#6d7882" /* --krds-color-light-gray-50 */ }}
        >
          다른 곳을 추천하는 대신, 가려던 곳을 <b>언제</b> 가야 덜 붐비는지 향후 30일
          집중률 예측으로 알려드립니다.
        </p>
      </section>

      {/* 지역 선택 필터 패널 (흰색 카드). */}
      <section
        className="rounded-[12px] bg-white p-[24px]"
        style={{ border: `1px solid ${KRDS_BORDER_DEFAULT}` }}
      >
        <h2 className="text-[18px] font-bold" style={{ color: "#1e2124" }}>
          <span style={{ color: KRDS_PRIMARY_50 }}>STEP 1.</span> 방문할 지역
          선택
        </h2>
        <p className="mt-[4px] text-[14px]" style={{ color: "#6d7882" }}>
          시/도와 시/군/구를 선택하면 해당 지역의 중심 관광지를 불러옵니다.
        </p>
        <div className="mt-[16px] flex w-full flex-col gap-[16px] sm:flex-row">
          <div className="flex-1">
            <Select
              label="시/도"
              value={areaCd}
              onChange={(value: string) => {
                setAreaCd(value);
                setSignguCd("");
                setState({ status: "idle" });
              }}
              options={[
                { label: "시/도 선택", value: "" },
                ...REGIONS.map((r) => ({ label: r.areaNm, value: r.areaCd })),
              ]}
            />
          </div>
          <div className="flex-1">
            <Select
              label="시/군/구"
              value={signguCd}
              disabled={!areaCd}
              onChange={(value: string) => {
                setSignguCd(value);
                if (value) void handleSearch(areaCd, value);
              }}
              options={[
                { label: "시/군/구 선택", value: "" },
                ...sigunguOptions.map((s) => ({ label: s.name, value: s.code })),
              ]}
            />
          </div>
        </div>
      </section>

      {/* 지역 미선택 시 이용 안내 (빈 화면 방지 + 서비스 흐름 설명). */}
      {state.status === "idle" && (
        <section
          className="rounded-[12px] p-[24px]"
          style={{
            backgroundColor: KRDS_BG_SELECTED,
            border: `1px solid ${KRDS_BORDER_DEFAULT}`,
          }}
        >
          <h2 className="text-[16px] font-bold" style={{ color: "#1e2124" }}>
            이용 안내
          </h2>
          <ol className="mt-[12px] flex flex-col gap-[10px]">
            {[
              "지역(시/도·시/군/구)을 선택합니다.",
              "중심 관광지를 고르면 향후 30일 집중률과 가장 한적한 방문 시기를 확인합니다.",
              "조건을 자유롭게 입력해 주변 연관 관광지를 좁히고, AI 추천 코스를 받아봅니다.",
            ].map((text, i) => (
              <li
                key={i}
                className="flex items-start gap-[10px] text-[14px]"
                style={{ color: "#1e2124" }}
              >
                <span
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                  style={{ backgroundColor: KRDS_PRIMARY_50 }}
                >
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="w-full">
        {state.status === "loading" && (
          <div className="flex justify-center py-4">
            <Spinner label="중심 관광지를 불러오는 중..." />
          </div>
        )}
        {state.status === "error" && (
          <CriticalAlert alerts={[{ variant: "danger", message: state.message }]} />
        )}
        {state.status === "empty" && (
          <CriticalAlert
            alerts={[
              {
                variant: "info",
                message: "이 지역은 아직 데이터가 준비중입니다. 다른 지역을 선택해 주세요.",
              },
            ]}
          />
        )}
        {state.status === "success" && (
          <>
            <h2 className="text-[18px] font-bold" style={{ color: "#1e2124" }}>
              <span style={{ color: KRDS_PRIMARY_50 }}>STEP 2.</span> 중심 관광지
              선택
            </h2>
            {selectedSpot ? (
              // 관광지를 고르면 30개 그리드를 접고, 선택된 관광지 요약 바만 남긴다.
              // 결과(집중률·연관·요약)가 바로 아래에 붙어 스크롤 거리를 없앤다.
              <div
                className="mt-[8px] flex flex-col gap-[12px] rounded-[12px] border p-[16px] sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: KRDS_BORDER_SELECTED,
                  backgroundColor: KRDS_BG_SELECTED,
                }}
              >
                <div className="flex items-center gap-[12px]">
                  <Badge variant="filled" color="primary" size="small" rounded>
                    {selectedSpot.hubRank}위
                  </Badge>
                  <div className="flex flex-wrap items-baseline gap-x-[8px]">
                    <span
                      className="text-[17px] font-semibold"
                      style={{ color: "#1e2124" }}
                    >
                      {selectedSpot.hubTatsNm}
                    </span>
                    <span className="text-[13px]" style={{ color: "#6d7882" }}>
                      {selectedSpot.hubCtgryLclsNm} · {selectedSpot.hubCtgryMclsNm}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setSelectedSpot(null)}
                >
                  다른 관광지 선택
                </Button>
              </div>
            ) : (
              <>
                <p
                  className="mb-4 mt-[4px] text-[14px]"
                  style={{ color: "#6d7882" }}
                >
                  기준월 {state.baseYm} · 중심 관광지 {state.items.length}곳 ·
                  카드를 누르면 집중률 예측이 열립니다.
                </p>
                <ul className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                  {(showAllSpots
                    ? state.items
                    : state.items.slice(0, TOP_N)
                  ).map((spot) => (
                    <li key={spot.hubTatsCd}>
                      <button
                        type="button"
                        onClick={() => handleSelectSpot(spot)}
                        className="w-full rounded-[12px] border p-[20px] text-left transition-colors"
                        style={{
                          borderColor: KRDS_BORDER_DEFAULT,
                          backgroundColor: "#ffffff",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = KRDS_BORDER_HOVER;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = KRDS_BORDER_DEFAULT;
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="filled"
                            color="primary"
                            size="small"
                            rounded
                          >
                            {spot.hubRank}위
                          </Badge>
                          <Badge variant="outline" color="gray" size="small">
                            {spot.hubCtgryLclsNm} · {spot.hubCtgryMclsNm}
                          </Badge>
                        </div>
                        <h3 className="mt-2 text-[19px] font-semibold">
                          {spot.hubTatsNm}
                        </h3>
                        <p className="text-[14px] text-gray-500">
                          {spot.areaNm} {spot.signguNm}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                {state.items.length > TOP_N && (
                  <div className="mt-[16px] flex justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAllSpots((v) => !v)}
                    >
                      {showAllSpots
                        ? "접기"
                        : `관광지 ${state.items.length - TOP_N}곳 더 보기`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selectedSpot && (
        <div
          className="w-full rounded-[12px] border bg-white p-[24px]"
          style={{ borderColor: KRDS_BORDER_DEFAULT }}
        >
          <h2 className="text-[19px] font-semibold">
            {selectedSpot.hubTatsNm} · 향후 30일 집중률 예측
          </h2>
          {/* 상세정보 보강(F2): 대표이미지·개요·홈페이지. 데이터가 있을 때만 렌더(없으면 생략). */}
          {detail.status === "done" && detail.detail && (
            <SpotDetailCard detail={detail.detail} />
          )}
          {congestion.status === "loading" && (
            <div className="mt-4 flex justify-center">
              <Spinner label="집중률 데이터를 불러오는 중..." />
            </div>
          )}
          {congestion.status === "error" && (
            <div className="mt-4">
              <CriticalAlert
                alerts={[{ variant: "danger", message: congestion.message }]}
              />
            </div>
          )}
          {congestion.status === "empty" && (
            <div className="mt-4">
              <CriticalAlert
                alerts={[
                  {
                    variant: "info",
                    message: "이 관광지는 아직 집중률 데이터가 준비중입니다.",
                  },
                ]}
              />
            </div>
          )}
          {congestion.status === "success" && (
            <div className="mt-4">
              <CongestionChart
                series={congestion.series}
                recommended={congestion.recommended}
              />
              {/* F6 — 인센티브 배지 목업(정적). 추천 방문 구간이 있을 때만, 그 구간에
                  방문 시 제휴 혜택을 준다는 티저를 보여준다. 실제 발급/결제 로직 없음
                  (PRD Out-of-scope) — ContextualHelp 팝오버로 "시연용"임을 명확히 안내. */}
              {congestion.recommended && (
                <div
                  className="mt-[16px] flex flex-wrap items-center gap-x-[10px] gap-y-[8px] rounded-[10px] p-[14px]"
                  style={{
                    backgroundColor: "#f4f5f6" /* --krds-color-light-gray-5 */,
                    border: "1px solid #e6e8ea" /* --krds-color-light-gray-10 */,
                  }}
                >
                  <Badge variant="filled" color="point" size="small" rounded>
                    혜택 예정
                  </Badge>
                  <span className="text-[14px]" style={{ color: "#1e2124" }}>
                    이 추천 방문 시기에 맞춰 방문하면 제휴 할인·우선입장 혜택을 드릴
                    예정이에요.
                  </span>
                  <ContextualHelp
                    label="자세히"
                    title="제휴 혜택 안내"
                    position="top"
                    alignment="right"
                  >
                    <p className="text-[14px] leading-relaxed">
                      현재는 시연용 화면으로, 실제 쿠폰 발급이나 결제 기능은 포함되어
                      있지 않습니다. 향후 지자체·지역 상점과 제휴하여 혼잡이 낮은 추천
                      시간대 방문객에게 실제 할인·우선입장 등의 혜택으로 확장할
                      예정입니다.
                    </p>
                  </ContextualHelp>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedSpot && (
        <div
          className="w-full rounded-[12px] border bg-white p-[24px]"
          style={{ borderColor: KRDS_BORDER_DEFAULT }}
        >
          <h2 className="text-[19px] font-semibold">
            {selectedSpot.hubTatsNm} 주변 연관 관광지
          </h2>
          {related.status === "success" && (
            <div className="mt-4 flex flex-col gap-[8px] sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextInput
                  label="어떤 곳을 찾으세요?"
                  hint='예: "아이랑 갈만한 한적한 곳", "실내에서 즐기는 전통 체험"'
                  value={conditionText}
                  onChange={(value: string) => setConditionText(value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleParseCondition();
                  }}
                  showClearButton
                />
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleParseCondition()}
                disabled={parsing || !conditionText.trim()}
              >
                {parsing ? "분석 중..." : "조건 적용"}
              </Button>
            </div>
          )}
          {related.status === "loading" && (
            <div className="mt-4 flex justify-center">
              <Spinner label="연관 관광지를 불러오는 중..." />
            </div>
          )}
          {related.status === "error" && (
            <div className="mt-4">
              <CriticalAlert
                alerts={[{ variant: "danger", message: related.message }]}
              />
            </div>
          )}
          {related.status === "empty" && (
            <div className="mt-4">
              <CriticalAlert
                alerts={[
                  {
                    variant: "info",
                    message: "아직 연관 관광지 데이터가 준비중입니다.",
                  },
                ]}
              />
            </div>
          )}
          {related.status === "success" && (
            <RelatedSpotList
              items={related.items}
              categoryFilter={categoryFilter}
              onCategoryChange={(cat) => {
                setCategoryFilter(cat);
                setKeywords([]);
              }}
              keywords={keywords}
              onClearKeywords={() => setKeywords([])}
            />
          )}
        </div>
      )}

      {/* F7 — 카카오맵 시각화. 중심 관광지(정확 좌표) + 연관 관광지(이름 지오코딩) 마커.
          연관 목록이 도착했을 때만 렌더(중심 좌표만으론 지도의 정보량이 부족). */}
      {selectedSpot && related.status === "success" && (
        <div
          className="w-full rounded-[12px] border bg-white p-[24px]"
          style={{ borderColor: KRDS_BORDER_DEFAULT }}
        >
          <h2 className="text-[19px] font-semibold">
            {selectedSpot.hubTatsNm} · 주변 지도
          </h2>
          <p className="mb-4 mt-[4px] text-[14px]" style={{ color: "#6d7882" }}>
            파란 마커가 중심 관광지, 나머지는 주변 연관 관광지입니다. 마커를 누르면
            상세 정보가 열립니다.
          </p>
          <SpotMap
            spot={selectedSpot}
            related={related.items}
            recommended={
              congestion.status === "success" ? congestion.recommended : null
            }
            summary={summary.status === "success" ? summary.text : null}
          />
        </div>
      )}

      {selectedSpot && summary.status !== "idle" && (
        <div
          className="w-full rounded-[12px] border p-[24px]"
          style={{
            borderColor: KRDS_BORDER_SELECTED,
            backgroundColor: KRDS_BG_SELECTED,
          }}
        >
          <div className="flex items-center gap-[8px]">
            <Badge variant="filled" color="primary" size="small" rounded>
              AI 추천 코스
            </Badge>
            {summary.status === "success" && summary.source === "fallback" && (
              <Badge variant="outline" color="gray" size="small">
                기본 안내
              </Badge>
            )}
          </div>
          {summary.status === "loading" && (
            <div className="mt-4 flex justify-center">
              <Spinner label="AI가 방문 코스를 정리하는 중..." />
            </div>
          )}
          {summary.status === "error" && (
            <div className="mt-4">
              <CriticalAlert
                alerts={[{ variant: "danger", message: summary.message }]}
              />
            </div>
          )}
          {summary.status === "success" && (
            <p
              className="mt-3 text-[16px] leading-relaxed"
              style={{ color: "#1e2124" /* --krds-color-light-gray-90 */ }}
            >
              {summary.text}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

// 상세정보 보강 카드(F2): 대표이미지 + 주소 + 개요(더보기 토글) + 홈페이지 링크.
function SpotDetailCard({ detail }: { detail: SpotDetail }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongOverview = (detail.overview?.length ?? 0) > 140;
  return (
    <div className="mt-4 flex flex-col gap-[16px] sm:flex-row">
      {detail.image && (
        <Image
          src={detail.image}
          alt={detail.title}
          width={220}
          height={160}
          className="h-[160px] w-full rounded-[10px] object-cover sm:w-[220px]"
          style={{ border: `1px solid ${KRDS_BORDER_DEFAULT}` }}
        />
      )}
      <div className="flex-1">
        {detail.address && (
          <p className="text-[14px]" style={{ color: "#6d7882" }}>
            {detail.address}
          </p>
        )}
        {detail.overview && (
          <p
            className={`mt-[8px] text-[14px] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
            style={{ color: "#1e2124" }}
          >
            {detail.overview}
          </p>
        )}
        <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
          {hasLongOverview && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "접기" : "더보기"}
            </Button>
          )}
          {detail.homepage && (
            <a
              href={detail.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-medium underline"
              style={{ color: KRDS_PRIMARY_50 }}
            >
              공식 홈페이지 ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedSpotList({
  items,
  categoryFilter,
  onCategoryChange,
  keywords,
  onClearKeywords,
}: {
  items: RelatedSpot[];
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
  keywords: string[];
  onClearKeywords: () => void;
}) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.rlteCtgryLclsNm))),
    [items],
  );
  const filtered = useMemo(() => {
    let list = categoryFilter
      ? items.filter((i) => i.rlteCtgryLclsNm === categoryFilter)
      : items;
    // F4 키워드: 중/소분류·이름에 부분일치(하나라도 맞으면 통과). 매칭 결과가 0이면 너무
    // 좁힌 것이므로 카테고리 필터 결과로 되돌린다(데모에서 빈 목록 방지).
    if (keywords.length > 0) {
      const byKeyword = list.filter((i) => {
        const haystack =
          `${i.rlteTatsNm} ${i.rlteCtgryMclsNm} ${i.rlteCtgrySclsNm}`.toLowerCase();
        return keywords.some((k) => haystack.includes(k.toLowerCase()));
      });
      if (byKeyword.length > 0) list = byKeyword;
    }
    return list;
  }, [items, categoryFilter, keywords]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-[8px]">
        <Button
          type="button"
          variant={categoryFilter === "" ? "primary" : "secondary"}
          size="small"
          onClick={() => onCategoryChange("")}
        >
          전체
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            type="button"
            variant={categoryFilter === cat ? "primary" : "secondary"}
            size="small"
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </Button>
        ))}
        {keywords.length > 0 && (
          <button
            type="button"
            onClick={onClearKeywords}
            className="ml-1 inline-flex items-center gap-1"
          >
            <Badge variant="filled" color="secondary" size="small" rounded>
              키워드: {keywords.join(", ")} ✕
            </Badge>
          </button>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-[12px] sm:grid-cols-2">
        {filtered.map((spot) => (
          <li
            key={spot.rlteTatsCd}
            className="rounded-lg border p-[16px]"
            style={{ borderColor: KRDS_BORDER_DEFAULT }}
          >
            <div className="flex items-center justify-between">
              <Badge variant="filled" color="secondary" size="small" rounded>
                연관 {spot.rlteRank}위
              </Badge>
              <Badge variant="outline" color="gray" size="small">
                {spot.rlteCtgryLclsNm} · {spot.rlteCtgryMclsNm}
              </Badge>
            </div>
            <h3 className="mt-2 font-semibold">{spot.rlteTatsNm}</h3>
            <p className="text-[14px] text-gray-500">
              {spot.rlteRegnNm} {spot.rlteSignguNm}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
