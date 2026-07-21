"use client";

import { useMemo } from "react";
import { Button, Badge } from "krds-react";
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
