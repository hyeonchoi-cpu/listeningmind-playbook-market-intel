// C-1(라이징 브랜드)·C-2(SoV)가 공유하는 브랜드 지형 파이프라인.
//
// cluster_finder → keyword_info → LLM 브랜드 추출(환각 검증 포함) → 브랜드별 볼륨·트렌드 집계.
// 점유율은 "감지된 브랜드 볼륨 합" 기준이며 컴플라이언스 규율상 항상 "검색량 기준 근사"로만 서술한다
// (검색 ≠ 실제 판매/점유율).
import { clusterFinder, uniqueKeywords, keywordInfoAll, indexByKeyword, type Gl } from "@/lib/daas";
import { extractBrands } from "@/lib/llm";
import type { BrandRow, CostLogEntry, Industry } from "@/types";

const TOP_KEYWORDS_FOR_EXTRACTION = 250;
const TOP_KEYWORDS_PER_BRAND = 5;

export type BrandLandscape = {
  brands: BrandRow[];
  totalNodes: number;
  llmModel: string;
  brandExtraction: "complete" | "partial";
  costLog: CostLogEntry[];
};

export async function buildBrandLandscape(input: {
  industry: Industry;
  category: string;
  gl: Gl;
  /** C-2 자사 브랜드 등 — LLM 추출 결과에 없어도 반드시 집계에 포함 */
  mustInclude?: string[];
}): Promise<BrandLandscape> {
  const { industry, category, gl, mustInclude = [] } = input;

  const cf = await clusterFinder(category, gl, { hop: 2, limit: 5000 });
  if (cf.result && cf.result !== "OK") {
    throw new Error(`cluster_finder 실패: ${cf.reason ?? "알 수 없는 사유"}`);
  }
  const allKws = uniqueKeywords(cf);
  const costCf = cf.cost_detail?.total_cost ?? 0;
  if (allKws.length === 0) {
    throw new Error(`"${category}" 카테고리에서 키워드를 찾지 못했습니다. 카테고리명을 확인해주세요.`);
  }

  const { items, totalCost: costKi } = await keywordInfoAll(allKws, gl);
  const infoByKw = indexByKeyword(items);
  const kw2vol = new Map<string, number>();
  const kw2trend = new Map<string, number>();
  for (const kw of allKws) {
    kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);
    kw2trend.set(kw, infoByKw.get(kw)?.volumeTrend ?? 0);
  }

  const topKws = [...allKws]
    .sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0))
    .slice(0, TOP_KEYWORDS_FOR_EXTRACTION);
  const extraction = await extractBrands(category, industry, topKws);

  // mustInclude(자사 브랜드 등)는 추출 결과와 무관하게 항상 포함
  const brandNames = [...new Set([...mustInclude.map((b) => b.trim()).filter(Boolean), ...extraction.brands])];

  const rows: BrandRow[] = brandNames.map((name) => {
    const lower = name.toLowerCase();
    const matched = allKws.filter((kw) => kw.toLowerCase().includes(lower));
    const totalVolume = matched.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0);
    const weightedTrend =
      totalVolume > 0
        ? matched.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0) * (kw2trend.get(kw) ?? 0), 0) / totalVolume
        : 0;
    const top = [...matched]
      .sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0))
      .slice(0, TOP_KEYWORDS_PER_BRAND)
      .map((kw) => ({ keyword: kw, volume: kw2vol.get(kw) ?? 0, trend: kw2trend.get(kw) ?? 0 }));
    return {
      name,
      keywordCount: matched.length,
      totalVolume: { value: totalVolume, basis: "derived" as const },
      sharePct: { value: 0, basis: "derived" as const },
      weightedTrend: { value: Math.round(weightedTrend * 1000) / 1000, basis: "derived" as const },
      topKeywords: top,
    };
  });

  // 매칭 키워드가 하나도 없는 브랜드는 제거 — 단 mustInclude는 데이터 공백 표시를 위해 남긴다
  const mustLower = new Set(mustInclude.map((b) => b.trim().toLowerCase()));
  const kept = rows.filter((r) => r.keywordCount > 0 || mustLower.has(r.name.toLowerCase()));

  const brandTotal = kept.reduce((s, r) => s + r.totalVolume.value, 0) || 1;
  for (const r of kept) {
    r.sharePct.value = Math.round((r.totalVolume.value / brandTotal) * 1000) / 10;
    if (r.keywordCount === 0) {
      r.totalVolume.basis = "missing";
      r.sharePct.basis = "missing";
      r.weightedTrend.basis = "missing";
    }
  }
  kept.sort((a, b) => b.totalVolume.value - a.totalVolume.value);

  return {
    brands: kept,
    totalNodes: allKws.length,
    llmModel: extraction.model,
    brandExtraction: extraction.status,
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}
