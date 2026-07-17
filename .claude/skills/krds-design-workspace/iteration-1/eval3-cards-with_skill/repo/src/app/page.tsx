"use client";

import { useMemo, useState } from "react";
import { Badge, Select } from "krds-react";
import { REGIONS } from "@/lib/regions";
import type { HubSpot } from "@/lib/tourapi/hubSpots";
import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";
import { CongestionChart } from "@/components/CongestionChart";

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

export default function Home() {
  const [areaCd, setAreaCd] = useState<string>("");
  const [signguCd, setSignguCd] = useState<string>("");
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [selectedSpot, setSelectedSpot] = useState<HubSpot | null>(null);
  const [congestion, setCongestion] = useState<CongestionState>({
    status: "idle",
  });
  const [related, setRelated] = useState<RelatedState>({ status: "idle" });

  const sigunguOptions = useMemo(
    () => REGIONS.find((r) => r.areaCd === areaCd)?.sigungu ?? [],
    [areaCd],
  );

  async function handleSearch(nextAreaCd: string, nextSignguCd: string) {
    setState({ status: "loading" });
    setSelectedSpot(null);
    setCongestion({ status: "idle" });
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

  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">타임시프트 (TimeShift)</h1>
        <p className="mt-2 text-gray-600">
          같은 곳을 언제 가면 덜 붐비는지 데이터로 알려주는 시간 재배치 추천 서비스
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
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

      <div className="w-full max-w-3xl">
        {state.status === "loading" && (
          <p className="text-center text-gray-500">중심 관광지를 불러오는 중...</p>
        )}
        {state.status === "error" && (
          <p className="text-center text-red-600">{state.message}</p>
        )}
        {state.status === "empty" && (
          <p className="text-center text-gray-500">
            이 지역은 아직 데이터가 준비중입니다. 다른 지역을 선택해 주세요.
          </p>
        )}
        {state.status === "success" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              기준월 {state.baseYm} · 중심 관광지 {state.items.length}곳
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.items.map((spot) => {
                const isSelected = selectedSpot?.hubTatsCd === spot.hubTatsCd;
                return (
                  <li key={spot.hubTatsCd}>
                    <button
                      type="button"
                      onClick={() => handleSelectSpot(spot)}
                      className={`krds-card w-full rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[--krds-color-light-primary-50] bg-[--krds-color-light-primary-5]"
                          : "border-[--krds-color-light-gray-20] hover:border-[--krds-color-light-primary-30]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="filled" color="primary" size="small" rounded>
                          {spot.hubRank}위
                        </Badge>
                        <Badge variant="outline" color="gray" size="small">
                          {spot.hubCtgryLclsNm} · {spot.hubCtgryMclsNm}
                        </Badge>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold">
                        {spot.hubTatsNm}
                      </h2>
                      <p className="text-sm text-[--krds-color-light-gray-50]">
                        {spot.areaNm} {spot.signguNm}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {selectedSpot && (
        <div className="w-full max-w-3xl rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">
            {selectedSpot.hubTatsNm} · 향후 30일 집중률 예측
          </h2>
          {congestion.status === "loading" && (
            <p className="mt-4 text-center text-gray-500">
              집중률 데이터를 불러오는 중...
            </p>
          )}
          {congestion.status === "error" && (
            <p className="mt-4 text-center text-red-600">
              {congestion.message}
            </p>
          )}
          {congestion.status === "empty" && (
            <p className="mt-4 text-center text-gray-500">
              이 관광지는 아직 집중률 데이터가 준비중입니다.
            </p>
          )}
          {congestion.status === "success" && (
            <div className="mt-4">
              <CongestionChart
                series={congestion.series}
                recommended={congestion.recommended}
              />
            </div>
          )}
        </div>
      )}

      {selectedSpot && (
        <div className="w-full max-w-3xl rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">
            {selectedSpot.hubTatsNm} 주변 연관 관광지
          </h2>
          {related.status === "loading" && (
            <p className="mt-4 text-center text-gray-500">
              연관 관광지를 불러오는 중...
            </p>
          )}
          {related.status === "error" && (
            <p className="mt-4 text-center text-red-600">
              {related.message}
            </p>
          )}
          {related.status === "empty" && (
            <p className="mt-4 text-center text-gray-500">
              아직 연관 관광지 데이터가 준비중입니다.
            </p>
          )}
          {related.status === "success" && (
            <RelatedSpotList items={related.items} />
          )}
        </div>
      )}
    </main>
  );
}

function RelatedSpotList({ items }: { items: RelatedSpot[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.rlteCtgryLclsNm))),
    [items],
  );
  const filtered = useMemo(
    () =>
      categoryFilter
        ? items.filter((i) => i.rlteCtgryLclsNm === categoryFilter)
        : items,
    [items, categoryFilter],
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={`rounded-full border px-3 py-1 text-sm ${
            categoryFilter === ""
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 text-gray-600"
          }`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full border px-3 py-1 text-sm ${
              categoryFilter === cat
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((spot) => (
          <li
            key={spot.rlteTatsCd}
            className="krds-card rounded-lg border border-[--krds-color-light-gray-20] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="light" color="primary" size="small" rounded>
                연관 {spot.rlteRank}
              </Badge>
              <Badge variant="outline" color="gray" size="small">
                {spot.rlteCtgryLclsNm} · {spot.rlteCtgryMclsNm}
              </Badge>
            </div>
            <h3 className="mt-2 font-semibold">{spot.rlteTatsNm}</h3>
            <p className="text-sm text-[--krds-color-light-gray-50]">
              {spot.rlteRegnNm} {spot.rlteSignguNm}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
