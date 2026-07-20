import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./SiteFooter";

// krds-react 컴포넌트(Footer)가 테스트 환경(jsdom)에서 정상 렌더되는지도 함께 검증한다.
describe("SiteFooter", () => {
  it("저작권·식별자 문구를 렌더한다", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/© 2026 TimeShift/)).toBeInTheDocument();
    expect(screen.getByText(/타임시프트 \(TimeShift\)/)).toBeInTheDocument();
  });

  it("외부 링크를 올바른 href로 렌더한다", () => {
    render(<SiteFooter />);
    const link = screen.getByText("공공데이터포털").closest("a");
    expect(link).toHaveAttribute("href", "https://www.data.go.kr");
  });
});
