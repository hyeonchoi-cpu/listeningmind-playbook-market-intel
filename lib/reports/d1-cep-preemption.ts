// D-1 · 카테고리 선점 CEP (cluster_finder + CEP 7W 전체).
//
// A-3의 CEP 해석에 "선점 여지" 축을 더한다: 각 CEP 군집의 볼륨과 함께
// "브랜드 미포함(논브랜드) 볼륨 비중"을 계산 — 수요는 크지만 아직 특정 브랜드에 붙지 않은
// 검색 상황일수록 선점 기회가 크다는 가정. 산식(정규화 볼륨 × 논브랜드 비중)은 가정으로 명시한다.
// LLM 2회 호출: classifyCep(상황 해석) + extractBrands(브랜드 별칭) — 병렬 실행.
import {
  clusterFinder,
  parseCommunities,
  uniqueKeywords,
  keywordInfoAll,
  indexByKeyword,
  type Gl,
} from "@/lib/daas";
import { classifyCep, extractBrands, type CepGroupInput } from "@/lib/llm";
import { getComplianceBlock } from "@/lib/compliance";
import { containsBrandToken } from "./brands-shared";
import { isNonConsumerKeyword } from "./consumer-filter";
import type { D1CepOpportunity, D1Report, Industry, ReportInsight } from "@/types";

const TOP_CLUSTERS = 12;
const TOP_KEYWORDS_PER_CLUSTER = 8;
const TOP_KEYWORDS_FOR_EXTRACTION = 250;

function topByVolume(keywords: string[], kw2vol: Map<string, number>, n: number): string[] {
  return [...keywords].sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0)).slice(0, n);
}

export async function generateD1Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<D1Report> {
  const { industry, category, gl } = input;

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
  for (const kw of allKws) kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);

  let groupsSrc = parseCommunities(cf).filter((g) => g.length >= 2);
  if (groupsSrc.length === 0) groupsSrc = [topByVolume(allKws, kw2vol, 120)];
  const ranked = groupsSrc
    .map((g, idx) => ({
      id: `G${idx + 1}`,
      keywords: g,
      volume: g.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, TOP_CLUSTERS);

  const cepInput: CepGroupInput[] = ranked.map((r) => ({
    id: r.id,
    keywords: topByVolume(r.keywords, kw2vol, TOP_KEYWORDS_PER_CLUSTER).map((kw) => ({
      kw,
      vol: kw2vol.get(kw) ?? 0,
    })),
  }));
  const topKwsForBrands = topByVolume(allKws, kw2vol, TOP_KEYWORDS_FOR_EXTRACTION);

  const [cep, brandExtraction] = await Promise.all([
    classifyCep(category, industry, cepInput),
    extractBrands(category, industry, topKwsForBrands),
  ]);
  // 논브랜드 비중 판정은 "포함" 기준 — 단독 기업명 쿼리·기타 기업(공급망·주식 맥락)명이 붙은
  // 키워드도 브랜드/엔티티 연관 수요로 취급해야 선점 여지가 과대 측정되지 않는다.
  // 비소비 맥락(주식·취업 등) 키워드도 같은 이유로 "선점 가능한 논브랜드 수요"가 아니므로 branded 취급.
  const aliasSets = brandExtraction.brands.map((b) => b.aliases);
  const isBranded = (kw: string) => {
    if (aliasSets.some((aliases) => containsBrandToken(kw, aliases))) return true;
    if (isNonConsumerKeyword(kw, industry.slug)) return true;
    const kl = kw.toLowerCase();
    return brandExtraction.otherEntities.some((e) => kl.includes(e));
  };

  const maxGroupVolume = Math.max(1, ...ranked.map((r) => r.volume));
  const opportunities: D1CepOpportunity[] = ranked
    .map((r) => {
      const c = cep.groups[r.id];
      const brandedVolume = r.keywords.reduce(
        (s, kw) => s + (isBranded(kw) ? kw2vol.get(kw) ?? 0 : 0),
        0,
      );
      const unbrandedShare = r.volume > 0 ? 1 - brandedVolume / r.volume : 0;
      const score = Math.round((r.volume / maxGroupVolume) * unbrandedShare * 100);
      // 브랜드 추출 실패 시 논브랜드 비중 계산 자체가 불가 — missing으로 명시
      const brandBasisOk = brandExtraction.status === "complete";
      return {
        id: r.id,
        axis: c?.axis ?? "UNCLEAR",
        cepShort: c?.cepShort ?? "미분류",
        situation: c?.situation ?? "",
        keywordCount: r.keywords.length,
        volume: { value: r.volume, basis: "derived" as const },
        unbrandedSharePct: {
          value: brandBasisOk ? Math.round(unbrandedShare * 1000) / 10 : 0,
          basis: (brandBasisOk ? "derived" : "missing") as "derived" | "missing",
        },
        opportunityScore: {
          value: brandBasisOk ? score : 0,
          basis: (brandBasisOk ? "assumption" : "missing") as "assumption" | "missing",
        },
        topKeywords: topByVolume(r.keywords, kw2vol, TOP_KEYWORDS_PER_CLUSTER).map((kw) => ({
          keyword: kw,
          volume: kw2vol.get(kw) ?? 0,
          branded: isBranded(kw),
        })),
      };
    })
    .sort((a, b) => b.opportunityScore.value - a.opportunityScore.value);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "D-1",
      category,
      gl,
      totalNodes: allKws.length,
      llmModel: cep.model,
      cepClassification: cep.status,
      brandExtraction: brandExtraction.status,
      generatedAt: new Date().toISOString(),
    },
    opportunities,
    insights: computeInsights(opportunities, cep.status, brandExtraction.status),
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(
  opportunities: D1CepOpportunity[],
  cepStatus: "complete" | "partial",
  brandStatus: "complete" | "partial",
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  if (cepStatus === "partial" || brandStatus === "partial") {
    insights.push({
      kind: "data_gap",
      title: "일부 LLM 분류 실패 — 재생성 권장",
      body: `${cepStatus === "partial" ? "CEP 해석" : ""}${cepStatus === "partial" && brandStatus === "partial" ? "·" : ""}${brandStatus === "partial" ? "브랜드 추출" : ""}이 실패해 선점 점수가 불완전합니다. 다시 생성해보세요.`,
    });
    if (cepStatus === "partial" && brandStatus === "partial") return insights;
  }

  const top = opportunities.find((o) => o.opportunityScore.basis === "assumption" && o.situation);
  if (top) {
    insights.push({
      kind: "preemption",
      title: `최우선 선점 후보 · ${top.cepShort} (점수 ${top.opportunityScore.value})`,
      body: `${top.situation} — 볼륨 대비 논브랜드 비중 ${top.unbrandedSharePct.value}% · 점수 산식(정규화 볼륨×논브랜드 비중)은 가정이므로 우선순위 참고용`,
    });
  }

  const saturated = [...opportunities]
    .filter((o) => o.unbrandedSharePct.basis === "derived")
    .sort((a, b) => a.unbrandedSharePct.value - b.unbrandedSharePct.value)[0];
  if (saturated && saturated.unbrandedSharePct.value < 50) {
    insights.push({
      kind: "saturated",
      title: `브랜드 포화 상황 · ${saturated.cepShort} (논브랜드 ${saturated.unbrandedSharePct.value}%)`,
      body: "이미 브랜드 검색이 지배하는 상황 — 후발 진입 시 차별화 근거 없이는 선점 효율이 낮다는 신호(단정 아님)",
    });
  }

  return insights;
}
