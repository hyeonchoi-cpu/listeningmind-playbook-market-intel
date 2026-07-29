// C-4 · 자사·경쟁 페인포인트·부정 키워드 (CEP HOW_FEEL 부정 서브그룹).
//
// cluster_finder → keyword_info → 실시간 Claude 페인포인트 분류(부정·우려 키워드만, 중립은 미분류).
// 브랜드는 선택 입력 — 넣으면 각 페인 그룹에서 브랜드 포함 키워드 수를 함께 집계한다.
import { clusterFinder, uniqueKeywords, keywordInfoAll, indexByKeyword, type Gl } from "@/lib/daas";
import { classifyPainpoints } from "@/lib/llm";
import { getComplianceBlock } from "@/lib/compliance";
import type { C4PainGroup, C4Report, Industry, ReportInsight } from "@/types";

const TOP_KEYWORDS_FOR_CLASSIFICATION = 250;
const TOP_KEYWORDS_PER_GROUP = 6;

/** C-4(카테고리 시드)와 P-2b(브랜드 시드)가 공유하는 페인포인트 파이프라인 코어 */
export async function buildPainpointReport(input: {
  industry: Industry;
  category: string;
  gl: Gl;
  brand?: string;
  reportCode: "C-4" | "P-2b";
}): Promise<C4Report> {
  const { industry, category, gl, reportCode } = input;
  const brand = input.brand?.trim() || null;
  const brandLower = brand?.toLowerCase() ?? null;

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

  const topKws = [...allKws]
    .sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0))
    .slice(0, TOP_KEYWORDS_FOR_CLASSIFICATION);
  const cls = await classifyPainpoints(category, industry, topKws);

  const agg = new Map<string, { volume: number; kws: string[]; brandCount: number }>();
  for (const kw of topKws) {
    for (const label of cls.labels[kw] ?? []) {
      const cur = agg.get(label) ?? { volume: 0, kws: [], brandCount: 0 };
      cur.volume += kw2vol.get(kw) ?? 0;
      cur.kws.push(kw);
      if (brandLower && kw.toLowerCase().includes(brandLower)) cur.brandCount += 1;
      agg.set(label, cur);
    }
  }

  const painGroups: C4PainGroup[] = [...agg.entries()]
    .map(([label, v]) => ({
      label,
      keywordCount: v.kws.length,
      volume: { value: v.volume, basis: "derived" as const },
      topKeywords: v.kws
        .sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0))
        .slice(0, TOP_KEYWORDS_PER_GROUP)
        .map((kw) => ({ keyword: kw, volume: kw2vol.get(kw) ?? 0 })),
      brandKeywordCount: v.brandCount,
    }))
    .sort((a, b) => b.volume.value - a.volume.value);

  // 페인 비중 — 분류 대상(상위 키워드) 볼륨 합 대비. 전체 우주가 아니라 샘플 기준 근사임을 명시.
  const sampleVolume = topKws.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0) || 1;
  const painVolume = [...new Set([...agg.values()].flatMap((v) => v.kws))].reduce(
    (s, kw) => s + (kw2vol.get(kw) ?? 0),
    0,
  );
  const painSharePct = {
    value: cls.status === "complete" ? Math.round((painVolume / sampleVolume) * 1000) / 10 : 0,
    basis: (cls.status === "complete" ? "derived" : "missing") as "derived" | "missing",
  };

  return {
    meta: {
      industry: industry.slug,
      reportCode,
      category,
      gl,
      brand,
      totalNodes: allKws.length,
      llmModel: cls.model,
      painClassification: cls.status,
      generatedAt: new Date().toISOString(),
    },
    painGroups,
    painSharePct,
    insights: computeInsights(painGroups, painSharePct.value, brand, cls.status),
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(
  groups: C4PainGroup[],
  painSharePct: number,
  brand: string | null,
  status: "complete" | "partial",
): ReportInsight[] {
  if (status === "partial") {
    return [
      {
        kind: "data_gap",
        title: "페인포인트 분류 실패 — 재생성 필요",
        body: "실시간 LLM 분류가 재시도 후에도 실패했습니다. 다시 생성해보세요.",
      },
    ];
  }
  if (groups.length === 0) {
    return [
      {
        kind: "data_gap",
        title: "분류된 페인 키워드 없음",
        body: "상위 키워드에서 우려·불만 신호가 확인되지 않았습니다. 부정 인식이 실제로 적을 수도 있고, 상위 볼륨 샘플(250개) 밖 롱테일에 있을 수도 있습니다 — 단정하지 말 것.",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const top = groups[0];
  insights.push({
    kind: "pain_dominance",
    title: `최대 페인 · ${top.label}`,
    body: `'${top.label}' 그룹이 페인 볼륨 최상위(키워드 ${top.keywordCount}개) · 콘텐츠·CS·상품개선 우선 검토 대상`,
  });
  insights.push({
    kind: "pain_share",
    title: `페인 비중 · 샘플 볼륨의 ${painSharePct}%`,
    body: `분류 대상 상위 키워드 볼륨 중 페인 키워드가 차지하는 비중(샘플 기준 근사) · 카테고리 전체로 일반화 금지`,
  });

  if (brand) {
    const brandTotal = groups.reduce((s, g) => s + g.brandKeywordCount, 0);
    if (brandTotal > 0) {
      const topBrandGroup = groups.reduce((a, b) => (b.brandKeywordCount > a.brandKeywordCount ? b : a));
      insights.push({
        kind: "brand_pain",
        title: `"${brand}" 연관 페인 ${brandTotal}건 · 최다 그룹 "${topBrandGroup.label}"`,
        body: `브랜드명을 포함한 페인 키워드가 '${topBrandGroup.label}'에 가장 많음 · 해당 우려에 대한 근거 기반 대응 콘텐츠 검토`,
      });
    } else {
      insights.push({
        kind: "brand_pain",
        title: `"${brand}" 직접 연관 페인 키워드 없음`,
        body: "브랜드명을 포함한 페인 키워드가 상위 샘플에서 확인되지 않았습니다 · 부정 인식이 없다는 단정은 금물(커버리지 한계)",
      });
    }
  }

  return insights;
}

export async function generateC4Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
  brand?: string;
}): Promise<C4Report> {
  return buildPainpointReport({ ...input, reportCode: "C-4" });
}
