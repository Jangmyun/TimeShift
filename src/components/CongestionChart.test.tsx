import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CongestionChart } from "./CongestionChart";
import type { CongestionDay } from "@/lib/tourapi/congestion";

const series: CongestionDay[] = Array.from({ length: 12 }, (_, i) => ({
  baseYmd: `202607${String(i + 1).padStart(2, "0")}`,
  cnctrRate: 40 + i,
}));

describe("CongestionChart", () => {
  it("빈 시리즈면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <CongestionChart series={[]} recommended={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("접근성 있는 그래프(role=img)를 렌더한다", () => {
    render(<CongestionChart series={series} recommended={null} />);
    expect(
      screen.getByRole("img", { name: /집중률 예측 그래프/ }),
    ).toBeInTheDocument();
  });

  it("추천 방문 시기가 있으면 날짜·평균 집중률 문구를 보여준다", () => {
    render(
      <CongestionChart
        series={series}
        recommended={{
          startYmd: "20260703",
          endYmd: "20260705",
          avgRate: 42.5,
        }}
      />,
    );
    expect(
      screen.getByText(/추천 방문 시기: 07\/03 ~ 07\/05/),
    ).toBeInTheDocument();
    expect(screen.getByText(/평균 집중률 42\.5%/)).toBeInTheDocument();
  });

  it("추천 구간이 없으면 추천 문구를 렌더하지 않는다", () => {
    render(<CongestionChart series={series} recommended={null} />);
    expect(screen.queryByText(/추천 방문 시기/)).not.toBeInTheDocument();
  });
});
