import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RelatedSpotList } from "./RelatedSpotList";
import type { RelatedSpot } from "@/lib/tourapi/relatedSpots";

function rel(
  cd: string,
  name: string,
  lcls: string,
  extra: Partial<RelatedSpot> = {},
): RelatedSpot {
  return {
    rlteTatsCd: cd,
    rlteTatsNm: name,
    rlteRegnCd: "11",
    rlteRegnNm: "서울특별시",
    rlteSignguCd: "11110",
    rlteSignguNm: "종로구",
    rlteCtgryLclsNm: lcls,
    rlteCtgryMclsNm: "",
    rlteCtgrySclsNm: "",
    rlteRank: "1",
    ...extra,
  };
}

const items: RelatedSpot[] = [
  rel("a", "경복궁", "관광지"),
  rel("b", "북촌한옥마을", "관광지"),
  rel("c", "광장시장", "음식"),
  rel("d", "포시즌스호텔", "숙박"),
];

const noop = () => {};

describe("RelatedSpotList", () => {
  it("전체 필터에서 모든 항목과 카테고리 버튼을 렌더한다", () => {
    render(
      <RelatedSpotList
        items={items}
        categoryFilter=""
        onCategoryChange={noop}
        keywords={[]}
        onClearKeywords={noop}
      />,
    );
    for (const nm of ["경복궁", "북촌한옥마을", "광장시장", "포시즌스호텔"]) {
      expect(screen.getByText(nm)).toBeInTheDocument();
    }
    // "전체" + 고유 대분류(관광지/음식/숙박) 버튼.
    for (const label of ["전체", "관광지", "음식", "숙박"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("카테고리 필터가 걸리면 해당 대분류 항목만 보인다", () => {
    render(
      <RelatedSpotList
        items={items}
        categoryFilter="음식"
        onCategoryChange={noop}
        keywords={[]}
        onClearKeywords={noop}
      />,
    );
    expect(screen.getByText("광장시장")).toBeInTheDocument();
    expect(screen.queryByText("경복궁")).not.toBeInTheDocument();
    expect(screen.queryByText("포시즌스호텔")).not.toBeInTheDocument();
  });

  it("카테고리 버튼 클릭 시 해당 카테고리로 onCategoryChange를 호출한다", async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RelatedSpotList
        items={items}
        categoryFilter=""
        onCategoryChange={onCategoryChange}
        keywords={[]}
        onClearKeywords={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: "숙박" }));
    expect(onCategoryChange).toHaveBeenCalledWith("숙박");
    await user.click(screen.getByRole("button", { name: "전체" }));
    expect(onCategoryChange).toHaveBeenLastCalledWith("");
  });

  it("키워드가 이름/분류에 부분일치하면 그 항목만 보인다", () => {
    render(
      <RelatedSpotList
        items={items}
        categoryFilter=""
        onCategoryChange={noop}
        keywords={["한옥"]}
        onClearKeywords={noop}
      />,
    );
    expect(screen.getByText("북촌한옥마을")).toBeInTheDocument();
    expect(screen.queryByText("경복궁")).not.toBeInTheDocument();
  });

  it("키워드 매칭 결과가 0이면 카테고리 결과로 되돌린다(빈 목록 방지)", () => {
    render(
      <RelatedSpotList
        items={items}
        categoryFilter=""
        onCategoryChange={noop}
        keywords={["존재하지않는키워드zzz"]}
        onClearKeywords={noop}
      />,
    );
    // 매칭 0 → 전체(카테고리 필터 결과)로 폴백되어 4개 모두 보인다.
    for (const nm of ["경복궁", "북촌한옥마을", "광장시장", "포시즌스호텔"]) {
      expect(screen.getByText(nm)).toBeInTheDocument();
    }
  });

  it("키워드 칩을 클릭하면 onClearKeywords를 호출한다", async () => {
    const onClearKeywords = vi.fn();
    const user = userEvent.setup();
    render(
      <RelatedSpotList
        items={items}
        categoryFilter=""
        onCategoryChange={noop}
        keywords={["한옥"]}
        onClearKeywords={onClearKeywords}
      />,
    );
    await user.click(screen.getByRole("button", { name: /키워드: 한옥/ }));
    expect(onClearKeywords).toHaveBeenCalledTimes(1);
  });
});
