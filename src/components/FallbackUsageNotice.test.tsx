import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FallbackUsageNotice } from "./FallbackUsageNotice";

describe("FallbackUsageNotice", () => {
  it("라이브 데이터만 있을 때는 표시하지 않는다", () => {
    render(
      <FallbackUsageNotice
        sources={[
          { label: "중심 관광지", source: "live" },
          { label: "혼잡 예측", source: null },
        ]}
      />,
    );

    expect(
      screen.queryByRole("status", { name: "폴백 데이터 사용 안내" }),
    ).not.toBeInTheDocument();
  });

  it("폴백 데이터가 있을 때 시연용 안내와 사용 중인 항목을 표시한다", () => {
    render(
      <FallbackUsageNotice
        sources={[
          { label: "중심 관광지", source: "fallback" },
          { label: "혼잡 예측", source: "live" },
          { label: "연관 관광지", source: "fallback" },
        ]}
      />,
    );

    expect(
      screen.getByRole("status", { name: "폴백 데이터 사용 안내" }),
    ).toBeInTheDocument();
    expect(screen.getByText("시연 안정화")).toBeInTheDocument();
    expect(
      screen.getByText("백업 데이터로 화면을 이어가는 중"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("사용 중: 중심 관광지, 연관 관광지"),
    ).toBeInTheDocument();
  });
});
