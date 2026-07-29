// A-3 · 소비자 검색 목적·인텐트 (cluster_finder + CEP 7W).
//
// 두 개의 축으로 "왜 검색하는가"에 답한다:
//  1) 인텐트 플래그 집계 — keyword_info.intents의 i/n/c/t는 실측 불리언 플래그(정직성 규율상
//     퍼센트로 표현 금지). 여기서는 "플래그 보유 키워드 수 · 볼륨 합"으로만 집계한다(파생).
//  2) CEP 7W 해석 — cluster_finder 커뮤니티(볼륨 상위 12개)를 실시간 Claude로 7W 축·상황 라벨링(파생).
//     실패 시 partial 폴백 — B-1 KBF와 동일 규율(§8 결정 7).
// 호출 형태(hop=2, limit=5000)는 B-1과 동일하게 유지 — 크레딧 예상치를 코드마다 다르게 만들지 않기 위함.
import {
  clusterFinder,
  parseCommunities,
  uniqueKeywords,
  keywordInfoAll,
  indexByKeyword,
  type Gl,
} from "@/lib/daas";
import { classifyCep, type CepGroupInput } from "@/lib/llm";
import { getComplianceBlock } from "@/lib/compliance";
import type { A3CepGroup, A3IntentRow, A3Report, Industry, ReportInsight } from "@/types";

const TOP_CLUSTERS_FOR_CEP = 12;
const TOP_KEYWORDS_PER_CLUSTER = 8;

const INTENT_DEFS: { key: "i" | "n" | "c" | "t"; label: string }[] = [
  { key: "i", label: "정보 탐색" },
  { key: "n", label: "사이트 이동" },
  { key: "c", label: "상업적 검토" },
  { key: "t", label: "거래·구매" },
];

function topByVolume(keywords: string[], kw2vol: Map<string, number>, n: number): string[] {
  return [...keywords].sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0)).slice(0, n);
}

export async function generateA3Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A3Report> {
  const { industry, category, gl } = input;

  // 1) cluster_finder — 키워드 우주 + 커뮤니티 구조
  const cf = await clusterFinder(category, gl, { hop: 2, limit: 5000 });
  if (cf.result && cf.result !== "OK") {
    throw new Error(`cluster_finder 실패: ${cf.reason ?? "알 수 없는 사유"}`);
  }
  const allKws = uniqueKeywords(cf);
  const costCf = cf.cost_detail?.total_cost ?? 0;
  if (allKws.length === 0) {
    throw new Error(`"${category}" 카테고리에서 키워드를 찾지 못했습니다. 카테고리명을 확인해주세요.`);
  }

  // 2) keyword_info — 볼륨·인텐트 플래그
  const { items, totalCost: costKi } = await keywordInfoAll(allKws, gl);
  const infoByKw = indexByKeyword(items);
  const kw2vol = new Map<string, number>();
  for (const kw of allKws) kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);

  // 3) 인텐트 믹스 — 플래그 보유 키워드 수·볼륨 합 (플래그 자체는 실측, 집계는 파생)
  const intentMix: A3IntentRow[] = INTENT_DEFS.map((d) => {
    const flagged = allKws.filter((kw) => (infoByKw.get(kw)?.intents[d.key] ?? 0) > 0);
    return {
      key: d.key,
      label: d.label,
      keywordCount: flagged.length,
      volume: { value: flagged.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0), basis: "derived" },
    };
  });

  // 4) CEP 그룹 — 커뮤니티를 볼륨순 상위 N개만 LLM에 (없으면 상위 키워드 단일 그룹 폴백)
  let groupsSrc = parseCommunities(cf).filter((g) => g.length >= 2);
  if (groupsSrc.length === 0) {
    groupsSrc = [topByVolume(allKws, kw2vol, 120)];
  }
  const ranked = groupsSrc
    .map((g, idx) => ({
      id: `G${idx + 1}`,
      keywords: g,
      volume: g.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, TOP_CLUSTERS_FOR_CEP);

  const cepInput: CepGroupInput[] = ranked.map((r) => ({
    id: r.id,
    keywords: topByVolume(r.keywords, kw2vol, TOP_KEYWORDS_PER_CLUSTER).map((kw) => ({
      kw,
      vol: kw2vol.get(kw) ?? 0,
    })),
  }));
  const cls = await classifyCep(category, industry, cepInput);

  const cepGroups: A3CepGroup[] = ranked.map((r) => {
    const c = cls.groups[r.id];
    return {
      id: r.id,
      axis: c?.axis ?? "UNCLEAR",
      cepShort: c?.cepShort ?? "미분류",
      situation: c?.situation ?? "",
      keywordCount: r.keywords.length,
      volume: { value: r.volume, basis: "derived" },
      topKeywords: topByVolume(r.keywords, kw2vol, TOP_KEYWORDS_PER_CLUSTER).map((kw) => ({
        keyword: kw,
        volume: kw2vol.get(kw) ?? 0,
      })),
    };
  });

  // 5) 전체 상위 키워드 + 보유 플래그
  const topKeywords = topByVolume(allKws, kw2vol, 15).map((kw) => {
    const intents = infoByKw.get(kw)?.intents;
    const flags = INTENT_DEFS.filter((d) => (intents?.[d.key] ?? 0) > 0).map((d) => d.key);
    return { keyword: kw, volume: { value: kw2vol.get(kw) ?? 0, basis: "measured" as const }, flags };
  });

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-3",
      category,
      gl,
      totalNodes: allKws.length,
      llmModel: cls.model,
      cepClassification: cls.status,
      generatedAt: new Date().toISOString(),
    },
    intentMix,
    cepGroups,
    topKeywords,
    insights: computeInsights(intentMix, cepGroups, cls.status),
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(
  intentMix: A3IntentRow[],
  cepGroups: A3CepGroup[],
  cepStatus: "complete" | "partial",
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  const topIntent = intentMix.reduce((a, b) => (b.volume.value > a.volume.value ? b : a));
  if (topIntent.volume.value > 0) {
    insights.push({
      kind: "intent_dominance",
      title: `지배 인텐트 · ${topIntent.label}`,
      body: `${topIntent.label} 플래그 키워드가 볼륨 합 기준 최상위(${topIntent.keywordCount.toLocaleString()}개 키워드) · 콘텐츠 포맷 우선 기준`,
    });
  }

  if (cepStatus === "complete" && cepGroups.length) {
    const topCep = cepGroups[0];
    if (topCep.situation) {
      insights.push({
        kind: "cep_dominance",
        title: `최대 검색 상황 · ${topCep.cepShort}`,
        body: topCep.situation,
      });
    }
    const unclear = cepGroups.filter((g) => g.axis === "UNCLEAR").length;
    if (unclear > 0) {
      insights.push({
        kind: "data_gap",
        title: `해석 불명 군집 ${unclear}개`,
        body: `상위 ${cepGroups.length}개 군집 중 ${unclear}개는 7W 축 판단 근거가 약해 UNCLEAR로 남김 · 억지 분류보다 공백 표시가 정직성 규율에 부합`,
      });
    }
  } else if (cepStatus === "partial") {
    insights.push({
      kind: "data_gap",
      title: "CEP 해석 실패 — 재생성 필요",
      body: "실시간 LLM 분류가 재시도 후에도 실패해 7W 상황 해석이 비어 있습니다. 인텐트 믹스·키워드 데이터는 정상이니, CEP 해석이 필요하면 다시 생성해보세요.",
    });
  }

  return insights;
}
