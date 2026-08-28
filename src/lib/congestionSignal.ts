import type { CongestionDay, RecommendedWindow } from "@/lib/tourapi/congestion";

export type MapCongestionSignal = {
  level: "여유" | "보통" | "혼잡" | "매우 혼잡";
  color: string;
  bg: string;
  currentRate: number;
  peakRate: number;
  recommendedAvg?: number;
  avoidPoint?: number;
};

export function mapCongestionLevel(rate: number): Pick<
  MapCongestionSignal,
  "level" | "color" | "bg"
> {
  if (rate >= 70) {
    return { level: "매우 혼잡", color: "#d1293d", bg: "#fdecee" };
  }
  if (rate >= 50) {
    return { level: "혼잡", color: "#b54708", bg: "#fdf0e6" };
  }
  if (rate >= 30) {
    return { level: "보통", color: "#256ef4", bg: "#ecf2fe" };
  }
  return { level: "여유", color: "#1a7f37", bg: "#e7f5ec" };
}

export function buildMapCongestionSignal(
  series: CongestionDay[],
  recommended: RecommendedWindow | null,
): MapCongestionSignal | null {
  if (series.length === 0) return null;
  const currentRate = Math.round(series[0].cnctrRate * 10) / 10;
  const peakRate = Math.round(
    Math.max(...series.map((d) => d.cnctrRate)) * 10,
  ) / 10;
  const recommendedAvg =
    recommended === null ? undefined : Math.round(recommended.avgRate * 10) / 10;
  const avoidPoint =
    recommendedAvg === undefined
      ? undefined
      : Math.max(0, Math.round((peakRate - recommendedAvg) * 10) / 10);

  return {
    ...mapCongestionLevel(currentRate),
    currentRate,
    peakRate,
    recommendedAvg,
    avoidPoint,
  };
}
