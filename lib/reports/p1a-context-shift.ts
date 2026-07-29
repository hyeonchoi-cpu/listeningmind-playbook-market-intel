// P-1a · 소비 맥락 이동 (time_point 대조) — 퍼블리시스 Theraflu 케이스에서 일반화한 템플릿.
//
// cluster_finder를 curr와 12m 두 시점으로 호출해 그래프 구성 변화를 본다:
//  떠오른 맥락 = 현재 커뮤니티 중 신규(12m에 없던) 키워드 비중이 절반 이상인 군집(가정) → LLM 상황 해석
//  빠진 키워드 = 12m 그래프에는 있었지만 현재 그래프에서 빠진 키워드 (현재 볼륨순 — 볼륨이 여전히
//               있는데 그래프에서 빠졌다면 다른 맥락으로 이동했다는 해석 후보)
// 주의: cluster_finder 2회 + keyword_info(두 시점 합집합)라 크레딧이 다른 코드의 약 2배.
// 시점 비교는 상관·동향 서술만 — 변화 원인 인과 단정 금지(컴플라이언스 공통 규율).
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
import type { Industry, P1aReport, P1aShiftGroup, ReportInsight } from "@/types";

const NEW_SHARE_THRESHOLD = 0.5; // 군집을 "떠오른 맥락"으로 볼 신규 키워드 비중 하한 — 가정
const TOP_EMERGING = 8;
const TOP_KEYWORDS_PER_GROUP = 8;
const TOP_FADED = 15;

export async function generateP1aReport(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<P1aReport> {
  const { industry, category, gl } = input;

  const [cfCurr, cfPast] = await Promise.all([
    clusterFinder(category, gl, { hop: 2, limit: 5000, timePoint: "curr" }),
    clusterFinder(category, gl, { hop: 2, limit: 5000, timePoint: "12m" }),
  ]);
  for (const [label, cf] of [
    ["curr", cfCurr],
    ["12m", cfPast],
  ] as const) {
    if (cf.result && cf.result !== "OK") {
      throw new Error(`cluster_finder(${label}) 실패: ${cf.reason ?? "알 수 없는 사유"}`);
    }
  }
  const currKws = uniqueKeywords(cfCurr);
  const pastKws = uniqueKeywords(cfPast);
  if (currKws.length === 0) {
    throw new Error(`"${category}" 카테고리에서 현재 시점 키워드를 찾지 못했습니다.`);
  }
  if (pastKws.length === 0) {
    throw new Error(`"${category}" 카테고리의 12m 시점 그래프가 비어 있어 맥락 이동 대조가 불가능합니다.`);
  }
  const costCf = (cfCurr.cost_detail?.total_cost ?? 0) + (cfPast.cost_detail?.total_cost ?? 0);

  const currSet = new Set(currKws.map((k) => k.toLowerCase()));
  const pastSet = new Set(pastKws.map((k) => k.toLowerCase()));
  const newKwSet = new Set(currKws.filter((k) => !pastSet.has(k.toLowerCase())).map((k) => k.toLowerCase()));
  const goneKws = pastKws.filter((k) => !currSet.has(k.toLowerCase()));

  // 볼륨은 현재 기준 — 두 시점 합집합으로 조회
  const unionKws = [...new Set([...currKws, ...goneKws])];
  const { items, totalCost: costKi } = await keywordInfoAll(unionKws, gl);
  const infoByKw = indexByKeyword(items);
  const kw2vol = new Map<string, number>();
  for (const kw of unionKws) kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);

  // 떠오른 맥락 — 현재 커뮤니티 중 신규 비중 높은 군집
  const emergingCandidates = parseCommunities(cfCurr)
    .filter((g) => g.length >= 2)
    .map((g, idx) => {
      const newCount = g.filter((kw) => newKwSet.has(kw.toLowerCase())).length;
      return {
        id: `S${idx + 1}`,
        keywords: g,
        newShare: newCount / g.length,
        volume: g.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0),
      };
    })
    .filter((g) => g.newShare >= NEW_SHARE_THRESHOLD)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, TOP_EMERGING);

  const byVol = (a: string, b: string) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0);
  const cepInput: CepGroupInput[] = emergingCandidates.map((g) => ({
    id: g.id,
    keywords: [...g.keywords].sort(byVol).slice(0, TOP_KEYWORDS_PER_GROUP).map((kw) => ({
      kw,
      vol: kw2vol.get(kw) ?? 0,
    })),
  }));
  const cep = await classifyCep(category, industry, cepInput);

  const emergingGroups: P1aShiftGroup[] = emergingCandidates.map((g) => {
    const c = cep.groups[g.id];
    return {
      id: g.id,
      axis: c?.axis ?? "UNCLEAR",
      cepShort: c?.cepShort ?? "미분류",
      situation: c?.situation ?? "",
      newSharePct: { value: Math.round(g.newShare * 1000) / 10, basis: "derived" },
      volume: { value: g.volume, basis: "derived" },
      topKeywords: [...g.keywords].sort(byVol).slice(0, TOP_KEYWORDS_PER_GROUP).map((kw) => ({
        keyword: kw,
        volume: kw2vol.get(kw) ?? 0,
      })),
    };
  });

  const fadedKeywords = [...goneKws].sort(byVol).slice(0, TOP_FADED).map((kw) => ({
    keyword: kw,
    volume: { value: kw2vol.get(kw) ?? 0, basis: "measured" as const },
  }));

  return {
    meta: {
      industry: industry.slug,
      reportCode: "P-1a",
      category,
      gl,
      currNodes: currKws.length,
      pastNodes: pastKws.length,
      newCount: newKwSet.size,
      goneCount: goneKws.length,
      llmModel: cep.model,
      cepClassification: cep.status,
      generatedAt: new Date().toISOString(),
    },
    emergingGroups,
    fadedKeywords,
    insights: computeInsights(category, emergingGroups, fadedKeywords, newKwSet.size, goneKws.length, cep.status),
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 2, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(unionKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(
  category: string,
  emerging: P1aShiftGroup[],
  faded: { keyword: string; volume: { value: number } }[],
  newCount: number,
  goneCount: number,
  cepStatus: "complete" | "partial",
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  insights.push({
    kind: "shift_scale",
    title: `그래프 교체율 · 신규 ${newCount.toLocaleString()}개 / 이탈 ${goneCount.toLocaleString()}개`,
    body: `12m 시점 대비 "${category}" 그래프 구성 변화 규모 · 시점 간 변화는 상관·동향으로만 해석(원인 인과 단정 금지)`,
  });

  const top = emerging.find((g) => g.situation);
  if (top) {
    insights.push({
      kind: "emerging_context",
      title: `떠오른 맥락 · ${top.cepShort} (신규 ${top.newSharePct.value}%)`,
      body: top.situation,
    });
  } else if (emerging.length === 0) {
    insights.push({
      kind: "data_gap",
      title: "떠오른 맥락 군집 없음",
      body: `신규 키워드 비중 ${NEW_SHARE_THRESHOLD * 100}% 이상 군집이 없습니다(가정 기준) · 맥락 구조가 12m 전과 크게 다르지 않다는 신호`,
    });
  }

  if (faded.length && faded[0].volume.value > 0) {
    insights.push({
      kind: "faded",
      title: `이동 의심 쿼리 · "${faded[0].keyword}"`,
      body: "현재도 검색 볼륨이 있는데 카테고리 그래프에서 빠진 최대 쿼리 — 다른 맥락으로 이동했을 가능성 검토(해석 후보일 뿐 단정 아님)",
    });
  }

  if (cepStatus === "partial") {
    insights.push({
      kind: "data_gap",
      title: "맥락 해석 실패",
      body: "실시간 LLM 해석이 실패해 상황 라벨이 비어 있습니다. 신규/이탈 키워드 수치는 유효합니다. 필요하면 다시 생성해보세요.",
    });
  }

  return insights;
}
