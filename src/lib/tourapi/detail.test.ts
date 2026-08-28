import { describe, it, expect, vi, beforeEach } from "vitest";
import { callTourApi } from "./client";
import { fetchRelatedSpotDetail } from "./detail";

vi.mock("./client", () => ({
  callTourApi: vi.fn(),
}));

const callTourApiMock = vi.mocked(callTourApi);

describe("fetchRelatedSpotDetail", () => {
  beforeEach(() => {
    callTourApiMock.mockReset();
  });

  it("같은 시군구 주소로 확인된 후보만 상세 보강한다", async () => {
    callTourApiMock
      .mockResolvedValueOnce([
        {
          contentid: "wrong",
          title: "광장시장",
          firstimage: "http://tong.visitkorea.or.kr/wrong.jpg",
          addr1: "대구광역시 중구 큰장로",
        },
        {
          contentid: "right",
          title: "광장시장",
          firstimage: "http://tong.visitkorea.or.kr/right.jpg",
          addr1: "서울특별시 종로구 창경궁로 88",
        },
      ])
      .mockResolvedValueOnce([
        {
          contentid: "right",
          title: "광장시장",
          addr1: "서울특별시 종로구 창경궁로 88",
          homepage: '<a href="https://example.com">홈페이지</a>',
          overview: "먹거리와 상점이 모인 전통시장입니다.",
        },
      ]);

    const detail = await fetchRelatedSpotDetail("광장시장", {
      areaNm: "서울특별시",
      signguNm: "종로구",
    });

    expect(detail).toEqual({
      contentId: "right",
      title: "광장시장",
      image: "https://tong.visitkorea.or.kr/right.jpg",
      address: "서울특별시 종로구 창경궁로 88",
      homepage: "https://example.com",
      overview: "먹거리와 상점이 모인 전통시장입니다.",
    });
    expect(callTourApiMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      "detailCommon2",
      { contentId: "right" },
    );
  });

  it("지역이 확인되지 않으면 다른 지역 동명 후보를 렌더하지 않도록 null을 반환한다", async () => {
    callTourApiMock.mockResolvedValueOnce([
      {
        contentid: "other",
        title: "중앙공원",
        firstimage: "http://tong.visitkorea.or.kr/other.jpg",
        addr1: "부산광역시 중구 대청동",
      },
    ]);

    const detail = await fetchRelatedSpotDetail("중앙공원", {
      areaNm: "서울특별시",
      signguNm: "종로구",
    });

    expect(detail).toBeNull();
    expect(callTourApiMock).toHaveBeenCalledTimes(1);
  });
});
