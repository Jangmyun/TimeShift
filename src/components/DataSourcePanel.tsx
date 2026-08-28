"use client";

import {
  Badge,
  StructuredList,
  StructuredListBody,
  StructuredListContent,
  StructuredListDescription,
  StructuredListItem,
  StructuredListTitle,
} from "krds-react";

const KRDS_BORDER_DEFAULT = "#cdd1d5"; // --krds-color-light-gray-20
const KRDS_GRAY_5 = "#f4f5f6"; // --krds-color-light-gray-5
const KRDS_GRAY_50 = "#6d7882"; // --krds-color-light-gray-50
const KRDS_GRAY_90 = "#1e2124"; // --krds-color-light-gray-90
const KRDS_PRIMARY_50 = "#256ef4"; // --krds-color-light-primary-50

const DATA_SOURCES = [
  {
    use: "중심 관광지",
    source: "한국관광공사 중심 관광지 API",
  },
  {
    use: "혼잡 예측",
    source: "한국관광공사 관광지 집중률 방문자 추이 예측 API",
  },
  {
    use: "연관 관광지",
    source: "한국관광공사 관광지별 연관 관광지 API",
  },
  {
    use: "상세정보",
    source: "TourAPI 국문 관광정보",
  },
  {
    use: "시간대 혼잡",
    source: "서울 실시간 도시데이터",
  },
];

export function DataSourcePanel() {
  return (
    <section
      aria-labelledby="data-source-panel-title"
      className="rounded-[12px] bg-white p-[20px]"
      style={{ border: `1px solid ${KRDS_BORDER_DEFAULT}` }}
    >
      <div className="flex flex-col gap-[8px] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="data-source-panel-title"
            className="text-[16px] font-bold"
            style={{ color: KRDS_GRAY_90 }}
          >
            데이터 출처와 활용 근거
          </h2>
          <p className="mt-[4px] text-[14px]" style={{ color: KRDS_GRAY_50 }}>
            시연 화면의 추천 결과는 공공 관광·도시 데이터 조합으로 구성됩니다.
          </p>
        </div>
        <Badge variant="light" color="primary" size="small" rounded>
          공모전 심사 근거
        </Badge>
      </div>

      <StructuredList className="mt-[14px] grid grid-cols-1 gap-[8px] sm:grid-cols-2">
        {DATA_SOURCES.map((item) => (
          <StructuredListItem key={item.use}>
            <div
              className="rounded-[8px] border p-[12px]"
              style={{
                backgroundColor: KRDS_GRAY_5,
                borderColor: KRDS_BORDER_DEFAULT,
              }}
            >
              <StructuredListBody>
                <StructuredListContent>
                  <StructuredListTitle className="text-[14px] font-semibold">
                    <span style={{ color: KRDS_PRIMARY_50 }}>{item.use}</span>
                  </StructuredListTitle>
                  <StructuredListDescription className="mt-[3px] text-[13px] leading-relaxed">
                    {item.source}
                  </StructuredListDescription>
                </StructuredListContent>
              </StructuredListBody>
            </div>
          </StructuredListItem>
        ))}
      </StructuredList>
    </section>
  );
}
