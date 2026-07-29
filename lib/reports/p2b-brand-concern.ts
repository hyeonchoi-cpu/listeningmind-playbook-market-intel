// P-2b · 브랜드 부작용·성분 우려 — 퍼블리시스 Otrivin 케이스에서 일반화한 템플릿.
//
// C-4 페인포인트 파이프라인의 브랜드 시드 변형: 카테고리 대신 브랜드·제품 키워드를 시드로
// 클러스터를 뽑아 그 브랜드 주변의 우려·불만 인식 구조를 본다. 시드가 곧 브랜드이므로
// brand 파라미터에 시드를 그대로 넣어 브랜드 연관 페인 집계도 함께 동작한다.
import type { Gl } from "@/lib/daas";
import type { C4Report, Industry } from "@/types";
import { buildPainpointReport } from "./c4-painpoint";

export async function generateP2bReport(input: {
  industry: Industry;
  category: string; // 폼에서 "브랜드·제품 키워드"로 라벨링됨
  gl: Gl;
}): Promise<C4Report> {
  return buildPainpointReport({
    industry: input.industry,
    category: input.category,
    gl: input.gl,
    brand: input.category,
    reportCode: "P-2b",
  });
}
