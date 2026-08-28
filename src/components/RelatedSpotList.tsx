"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button, Badge } from "krds-react";
import type { SpotDetail } from "@/lib/tourapi/detail";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";

const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20

// F3 연관 관광지 목록 + 카테고리 버튼 필터. F4 키워드 필터(page.tsx에서 lift한 상태)와 같은
// 목록을 클라이언트에서 좁힌다(별도 카테고리 API 호출 없음).
export function RelatedSpotList({
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
  const [detailState, setDetailState] = useState<{
    targetKey: string;
    values: Record<string, SpotDetail>;
  }>({ targetKey: "", values: {} });
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
  const detailTargets = useMemo(() => items.slice(0, 3), [items]);
  const detailTargetKey = useMemo(
    () => detailTargets.map((spot) => spot.rlteTatsCd).join("|"),
    [detailTargets],
  );
  const details =
    detailState.targetKey === detailTargetKey ? detailState.values : {};

  useEffect(() => {
    if (detailTargets.length === 0) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      const entries = await Promise.all(
        detailTargets.map(async (spot) => {
          try {
            const params = new URLSearchParams({
              spotName: spot.rlteTatsNm,
              areaCd: spot.rlteRegnCd,
              signguCd: spot.rlteSignguCd,
            });
            const res = await fetch(`/api/related-spot-detail?${params}`, {
              signal: controller.signal,
            });
            if (!res.ok) return null;
            const data = (await res.json()) as { detail?: SpotDetail | null };
            return data.detail
              ? ([spot.rlteTatsCd, data.detail] as const)
              : null;
          } catch {
            return null;
          }
        }),
      );
      if (controller.signal.aborted) return;
      setDetailState({
        targetKey: detailTargetKey,
        values: Object.fromEntries(entries.filter((entry) => entry !== null)),
      });
    })();

    return () => controller.abort();
  }, [detailTargetKey, detailTargets]);

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
        {filtered.map((spot) => {
          const detail = details[spot.rlteTatsCd];
          return (
            <li
              key={spot.rlteTatsCd}
              className="rounded-lg border p-[16px]"
              style={{ borderColor: KRDS_BORDER_DEFAULT }}
            >
              <div className="flex gap-[12px]">
                {detail?.image && (
                  <Image
                    src={detail.image}
                    alt={detail.title}
                    width={96}
                    height={72}
                    sizes="96px"
                    className="h-[72px] w-[96px] shrink-0 rounded-[8px] object-cover"
                    style={{ border: `1px solid ${KRDS_BORDER_DEFAULT}` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-[6px]">
                    <Badge variant="filled" color="secondary" size="small" rounded>
                      연관 {spot.rlteRank}위
                    </Badge>
                    <Badge variant="outline" color="gray" size="small">
                      {spot.rlteCtgryLclsNm} · {spot.rlteCtgryMclsNm}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{spot.rlteTatsNm}</h3>
                  <p className="text-[14px] text-gray-500">
                    {detail?.address ?? `${spot.rlteRegnNm} ${spot.rlteSignguNm}`}
                  </p>
                  {detail?.overview && (
                    <p className="mt-[8px] line-clamp-2 text-[14px] leading-relaxed text-gray-700">
                      {detail.overview}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
