// 샘플 리포트 3종 — 실전 산출물(미국 TV/OLED, 2026-07 실측). 카탈로그 상단에서 결과물 형태를 먼저 보여준다.
export type SampleReport = {
  kind: string;        // 리포트 유형 (분석 단위)
  title: string;
  headline: string;    // 실측 헤드라인 한 줄
  href: string;        // public/samples/ 정적 HTML — 자립형(외부 의존 0)
};

export const sampleReports: SampleReport[] = [
  {
    kind: "카테고리 리포트",
    title: "미국 TV 시장 — 시장 지도",
    headline: "유효 수요 −10.0% · 세그먼트 역전(OLED는 LG 59% · QLED는 삼성 34%)",
    href: "/samples/us-tv-category.html",
  },
  {
    kind: "세그먼트 리포트",
    title: "미국 OLED TV — 브랜드 경쟁 심층",
    headline: "SoV LG 63%(모델 합산) · 비교 관문의 3대 불안(수명·번인·눈 편안함)",
    href: "/samples/us-oled-segment.html",
  },
  {
    kind: "신규 세그먼트 발굴",
    title: "미국 OLED TV — gaming·sports 밖의 기회",
    headline: "확정 4개 — 밝은 거실(+51%·경쟁도 1)·프로젝터 대체(+81%)·소형·오너십 케어",
    href: "/samples/us-oled-discovery.html",
  },
];
