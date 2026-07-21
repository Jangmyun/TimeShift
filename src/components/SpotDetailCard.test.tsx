import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotDetailCard } from "./SpotDetailCard";
import type { SpotDetail } from "@/lib/tourapi/detail";

// next/image는 Next 런타임 밖에서 최적화 로더가 필요하므로, 단위 테스트에선 평범한 <img>로 목킹해
// SpotDetailCard 자체 로직(조건부 렌더·토글)에 집중한다.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const base: SpotDetail = {
  contentId: "126508",
  title: "경복궁",
  image: "https://tong.visitkorea.or.kr/x.jpg",
  address: "서울특별시 종로구 사직로 161",
  homepage: "https://royal.khs.go.kr/",
  overview: "짧은 개요",
};

describe("SpotDetailCard", () => {
  it("이미지·주소·개요·홈페이지 링크를 렌더한다", () => {
    render(<SpotDetailCard detail={base} />);
    expect(screen.getByAltText("경복궁")).toBeInTheDocument();
    expect(
      screen.getByText("서울특별시 종로구 사직로 161"),
    ).toBeInTheDocument();
    expect(screen.getByText("짧은 개요")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /공식 홈페이지/ });
    expect(link).toHaveAttribute("href", "https://royal.khs.go.kr/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("image가 null이면 이미지를 렌더하지 않는다", () => {
    render(<SpotDetailCard detail={{ ...base, image: null }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("homepage가 null이면 홈페이지 링크를 렌더하지 않는다", () => {
    render(<SpotDetailCard detail={{ ...base, homepage: null }} />);
    expect(
      screen.queryByRole("link", { name: /공식 홈페이지/ }),
    ).not.toBeInTheDocument();
  });

  it("짧은 개요면 더보기 토글을 노출하지 않는다", () => {
    render(<SpotDetailCard detail={base} />);
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });

  it("긴 개요면 더보기 토글이 나오고 클릭 시 접기로 바뀐다", async () => {
    const user = userEvent.setup();
    const longOverview = "가".repeat(200);
    render(<SpotDetailCard detail={{ ...base, overview: longOverview }} />);
    const toggle = screen.getByRole("button", { name: "더보기" });
    expect(toggle).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "접기" })).toBeInTheDocument();
  });
});
