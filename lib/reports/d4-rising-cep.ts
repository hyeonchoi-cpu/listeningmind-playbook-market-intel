// D-4 · 함께 검색되는 라이징 CEP·연관 아이템 (CEP WITH_WHAT + rels).
//
// "카테고리와 함께 검색되는 것 중 지금 뜨는 것"을 찾는다:
//  1) 후보 = 클러스터 키워드 중 카테고리명을 포함하지 않는 키워드 (카테고리 자신이 아니라 '연관 아이템')
//     + 볼륨 하한(노이즈 컷, 가정) 적용
//  2) volume_trend(실측) 내림차순 상위 N개 = 라이징 연관 아이템
//  3) 각 아이템을 rels 이웃과 함께 LLM에 넘겨 "함께 검색 상황"을 해석 (classifyCep 재사용 — 아이템당
//     하나의 군집으로 취급, WITH_WHAT류 축이 주로 나오지만 축 판정은 LLM에 맡김)
import {
  clusterFinder,
  parseRels,
  uniqueKeywords,
  keywordInfoAll,
  indexByKeyword,
  type Gl,
} from "@/lib/daas";
import { classifyCep, type CepGroupInput } from "@/lib/llm";
import { getComplianceBlock } from "@/lib/compliance";
import type { D4Report, D4RisingItem, Industry, ReportInsight } from "@/types";

const TOP_RISING = 12;
const MIN_VOLUME = 100; // 라이징 후보 볼륨 하한 — 극소 볼륨의 트렌드 급등은 노이즈(가정)
const NEIGHBORS_PER_ITEM = 5;

export async function generateD4Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<D4Report> {
  const { industry, category, gl } = input;
  const categoryLower = category.trim().toLowerCase();

  const cf = await clusterFinder(category, gl, { hop: 2, limit: 5000 });
  if (cf.result && cf.result !== "OK") {
    throw new Error(`cluster_finder 실패: ${cf.reason ?? "알 수 없는 사유"}`);
  }
  const allKws = uniqueKeywords(cf);
  const costCf = cf.cost_detail?.total_cost ?? 0;
  if (allKws.length === 0) {
    throw new Error(`"${category}" 카테고리에서 키워드를 찾지 못했습니다. 카테고리명을 확인해주세요.`);
  }
  const rels = parseRels(cf);
  const totalEdges = Object.values(rels).reduce((s, n) => s + n.length, 0) / 2;
  const seedNeighbors = new Set(rels[categoryLower] ?? []);

  const { items, totalCost: costKi } = await keywordInfoAll(allKws, gl);
  const infoByKw = indexByKeyword(items);
  const kw2vol = new Map<string, number>();
  const kw2trend = new Map<string, number>();
  for (const kw of allKws) {
    kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);
    kw2trend.set(kw, infoByKw.get(kw)?.volumeTrend ?? 0);
  }

  // 후보: 카테고리명 미포함(연관 아이템) + 볼륨 하한 통과 → 트렌드 내림차순
  const rising = allKws
    .filter((kw) => !kw.toLowerCase().includes(categoryLower))
    .filter((kw) => (kw2vol.get(kw) ?? 0) >= MIN_VOLUME)
    .sort((a, b) => (kw2trend.get(b) ?? 0) - (kw2trend.get(a) ?? 0))
    .slice(0, TOP_RISING);

  if (rising.length === 0) {
    throw new Error(
      `"${category}" 클러스터에서 볼륨 ${MIN_VOLUME} 이상의 연관 아이템(카테고리명 미포함 키워드)을 찾지 못했습니다.`,
    );
  }

  // 아이템별 rels 이웃과 함께 LLM 해석 (아이템 = 군집 1개 취급)
  const cepInput: CepGroupInput[] = rising.map((kw, idx) => {
    const neighbors = (rels[kw.toLowerCase()] ?? [])
      .filter((n) => kw2vol.has(n))
      .sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0))
      .slice(0, NEIGHBORS_PER_ITEM);
    return {
      id: `R${idx + 1}`,
      keywords: [kw, ...neighbors].map((k) => ({ kw: k, vol: kw2vol.get(k) ?? 0 })),
    };
  });
  const cep = await classifyCep(category, industry, cepInput);

  const risingItems: D4RisingItem[] = rising.map((kw, idx) => {
    const c = cep.groups[`R${idx + 1}`];
    return {
      keyword: kw,
      volume: { value: kw2vol.get(kw) ?? 0, basis: "measured" },
      trend: { value: kw2trend.get(kw) ?? 0, basis: "measured" },
      neighborOfSeed: seedNeighbors.has(kw.toLowerCase()),
      axis: c?.axis ?? "UNCLEAR",
      cepShort: c?.cepShort ?? "미분류",
      situation: c?.situation ?? "",
    };
  });

  return {
    meta: {
      industry: industry.slug,
      reportCode: "D-4",
      category,
      gl,
      totalNodes: allKws.length,
      totalEdges: Math.round(totalEdges),
      llmModel: cep.model,
      cepClassification: cep.status,
      generatedAt: new Date().toISOString(),
    },
    risingItems,
    insights: computeInsights(category, risingItems, cep.status),
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(
  category: string,
  items: D4RisingItem[],
  cepStatus: "complete" | "partial",
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  const top = items[0];
  if (top) {
    insights.push({
      kind: "rising_item",
      title: `최고 라이징 연관 아이템 · "${top.keyword}" (+${Math.round(top.trend.value * 1000) / 10}%)`,
      body:
        top.situation ||
        `"${category}" 클러스터 안에서 트렌드 최상위 · 볼륨 ${MIN_VOLUME} 이상 후보만 집계(가정) · 급등 원인은 별도 검증 필요`,
    });
  }

  const directNeighbors = items.filter((i) => i.neighborOfSeed);
  if (directNeighbors.length) {
    insights.push({
      kind: "co_search",
      title: `시드 직접 연결 ${directNeighbors.length}개`,
      body: `라이징 아이템 중 ${directNeighbors.length}개는 "${category}"와 관계 그래프에서 직접 연결 — 번들·크로스셀 콘텐츠 조합 후보`,
    });
  }

  if (cepStatus === "partial") {
    insights.push({
      kind: "data_gap",
      title: "함께 검색 상황 해석 실패",
      body: "실시간 LLM 해석이 실패해 상황 라벨이 비어 있습니다. 아이템·트렌드 수치는 실측이므로 유효합니다. 필요하면 다시 생성해보세요.",
    });
  }

  return insights;
}
