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

  it("스크린리더용으로 실제 데이터를 담은 role=img 라벨을 렌더한다", () => {
    render(
      <CongestionChart
        series={series}
        recommended={{ startYmd: "20260703", endYmd: "20260705", avgRate: 42.5 }}
      />,
    );
    // series는 40~51%로 증가 → 평균 46%, 최고 07/12(51%). 라벨이 이 수치를 읽어줘야 한다.
    const chart = screen.getByRole("img", {
      name: /향후 12일간 집중률 예측 꺾은선 그래프/,
    });
    expect(chart).toBeInTheDocument();
    const label = chart.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/전체 평균 집중률 46%/);
    expect(label).toMatch(/가장 붐비는 날은 07\/12로 51%/);
    expect(label).toMatch(/추천 방문 시기는 07\/03부터 07\/05까지/);
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
    // 시각적 <p> 문구는 괄호를 포함 — 같은 수치를 담은 <desc>와 구분하기 위해 괄호까지 매칭한다.
    expect(
      screen.getByText(/추천 방문 시기: 07\/03 ~ 07\/05 \(평균 집중률 42\.5%\)/),
    ).toBeInTheDocument();
  });

  it("추천 구간이 없으면 추천 문구를 렌더하지 않는다", () => {
    render(<CongestionChart series={series} recommended={null} />);
    expect(screen.queryByText(/추천 방문 시기/)).not.toBeInTheDocument();
  });
});
