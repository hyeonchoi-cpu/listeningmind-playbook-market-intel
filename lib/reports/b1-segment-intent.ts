// B-1 · 연령별·성별 관심사·KBF 차이 — lima-agents Python prepare.py를 TS로 이식.
//
// 원본과의 차이 (정직성 규율상 반드시 methodology에 명시해야 함):
//  1) KBF 분류: 정규식 사전(식품 카테고리 전용 하드코딩) → 업권 파라미터화된 실시간 Claude 분류로 교체.
//  2) KBF 분류 대상: 원본은 세그먼트 전체 키워드를 정규식으로 훑었지만, 웹 파이프라인은 비용·지연시간을
//     묶어두기 위해 "세그먼트별 검색량 상위 30개 키워드" 샘플만 LLM에 넘긴다 — 전체 볼륨 가중 집계가 아니라
//     샘플 기반 근사치다. 세그먼트 volume/share(§3) 자체는 여전히 전체 키워드 기준 실측이며 영향 없음.
import { clusterFinder, uniqueKeywords, keywordInfoAll, indexByKeyword, type Gl, type KeywordInfo } from "@/lib/daas";
import { classifyKbf } from "@/lib/llm";
import { getComplianceBlock } from "@/lib/compliance";
import type { B1CrossCell, B1Insight, B1KbfEntry, B1Report, B1Segment, B1TopKeyword, Industry } from "@/types";

const TOP_N_KEYWORDS_PER_SEGMENT = 10; // UI 표시용 상위 키워드
const TOP_N_FOR_KBF_SAMPLE = 30; // KBF 분류에 넘길 세그먼트당 샘플 크기 (스코프 축소, 상단 주석 참고)

type SegmentDef = {
  key: string;
  label: string;
  kind: "gender" | "age";
  flag: string;
  ratio: string;
};

const SEGMENT_DEFS: SegmentDef[] = [
  { key: "female", label: "여성", kind: "gender", flag: "m_f_gender_ratio", ratio: "f_gender_ratio" },
  { key: "male", label: "남성", kind: "gender", flag: "m_m_gender_ratio", ratio: "m_gender_ratio" },
  { key: "a13", label: "10대", kind: "age", flag: "m_a13", ratio: "a13_ratio" },
  { key: "a20", label: "20대", kind: "age", flag: "m_a20", ratio: "a20_ratio" },
  { key: "a25", label: "25~", kind: "age", flag: "m_a25", ratio: "a25_ratio" },
  { key: "a30", label: "30대", kind: "age", flag: "m_a30", ratio: "a30_ratio" },
  { key: "a40", label: "40대", kind: "age", flag: "m_a40", ratio: "a40_ratio" },
  { key: "a50", label: "50대+", kind: "age", flag: "m_a50", ratio: "a50_ratio" },
];

// 사내 태깅(flag)이 없거나 sparse할 때의 ratio 폴백 임계값 — 원본 Python과 동일
const RATIO_FALLBACK_THRESHOLD: Record<"gender" | "age", number> = { gender: 55, age: 25 };

function belongsTo(seg: SegmentDef, demo: KeywordInfo["demography"]): boolean {
  if (!demo) return false;
  const flagVal = demo[seg.flag];
  if (flagVal !== undefined && flagVal !== null) {
    const n = Number(flagVal);
    if (Number.isFinite(n) && n > 0) return true;
  }
  const ratioVal = demo[seg.ratio];
  if (ratioVal === undefined || ratioVal === null) return false;
  const n = Number(ratioVal);
  return Number.isFinite(n) && n >= RATIO_FALLBACK_THRESHOLD[seg.kind];
}

function topByVolume(keywords: string[], kw2vol: Map<string, number>, n: number): string[] {
  return [...keywords].sort((a, b) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0)).slice(0, n);
}

export async function generateB1Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<B1Report> {
  const { industry, category, gl } = input;

  // 1) cluster_finder — 키워드 우주 확보
  const cf = await clusterFinder(category, gl, { hop: 2, limit: 5000 });
  if (cf.result && cf.result !== "OK") {
    throw new Error(`cluster_finder 실패: ${cf.reason ?? "알 수 없는 사유"}`);
  }
  const allKws = uniqueKeywords(cf);
  const costCf = cf.cost_detail?.total_cost ?? 0;
  if (allKws.length === 0) {
    throw new Error(`"${category}" 카테고리에서 키워드를 찾지 못했습니다. 카테고리명을 확인해주세요.`);
  }

  // 2) keyword_info(all) — 볼륨·인구통계
  const { items, totalCost: costKi } = await keywordInfoAll(allKws, gl);
  const infoByKw = indexByKeyword(items);

  const kw2vol = new Map<string, number>();
  for (const kw of allKws) kw2vol.set(kw, infoByKw.get(kw)?.volumeAvg ?? 0);

  // 3) 세그먼트별 노드·볼륨 (실측 keyword_info 기반, 집계는 파생)
  const segNodes = new Map<string, string[]>();
  const segmentsOut: B1Segment[] = SEGMENT_DEFS.map((seg) => {
    const nodes = allKws.filter((kw) => belongsTo(seg, infoByKw.get(kw)?.demography ?? null));
    segNodes.set(seg.key, nodes);
    const totalVol = nodes.reduce((sum, kw) => sum + (kw2vol.get(kw) ?? 0), 0);
    return {
      key: seg.key,
      label: seg.label,
      kind: seg.kind,
      keywordCount: nodes.length,
      totalVolume: { value: totalVol, basis: "derived" },
      sharePct: { value: 0, basis: "derived" },
    };
  });
  for (const kind of ["gender", "age"] as const) {
    const kindTotal =
      segmentsOut.filter((s) => s.kind === kind).reduce((sum, s) => sum + s.totalVolume.value, 0) || 1;
    for (const s of segmentsOut) {
      if (s.kind === kind) s.sharePct.value = Math.round((s.totalVolume.value / kindTotal) * 1000) / 10;
    }
  }

  // 4) 세그먼트별 상위 키워드 (UI 표시용, 전부 실측)
  const topBySeg: Record<string, B1TopKeyword[]> = {};
  for (const seg of SEGMENT_DEFS) {
    const nodes = segNodes.get(seg.key) ?? [];
    topBySeg[seg.key] = topByVolume(nodes, kw2vol, TOP_N_KEYWORDS_PER_SEGMENT).map((kw) => ({
      keyword: kw,
      volume: { value: kw2vol.get(kw) ?? 0, basis: "measured" },
      trend: { value: infoByKw.get(kw)?.volumeTrend ?? 0, basis: "measured" },
    }));
  }

  // 5) KBF 분류 — 세그먼트당 상위 샘플만 실시간 Claude 호출 (§8 결정 1/7)
  const segTopForKbf = new Map<string, string[]>();
  const kbfInputKeywords = new Set<string>();
  for (const seg of SEGMENT_DEFS) {
    const top = topByVolume(segNodes.get(seg.key) ?? [], kw2vol, TOP_N_FOR_KBF_SAMPLE);
    segTopForKbf.set(seg.key, top);
    top.forEach((kw) => kbfInputKeywords.add(kw));
  }
  const classification = await classifyKbf(category, industry, [...kbfInputKeywords]);

  const kbfBySeg: Record<string, B1KbfEntry[]> = {};
  for (const seg of SEGMENT_DEFS) {
    const agg = new Map<string, { volume: number; count: number }>();
    for (const kw of segTopForKbf.get(seg.key) ?? []) {
      const vol = kw2vol.get(kw) ?? 0;
      for (const label of classification.labels[kw] ?? []) {
        const cur = agg.get(label) ?? { volume: 0, count: 0 };
        cur.volume += vol;
        cur.count += 1;
        agg.set(label, cur);
      }
    }
    kbfBySeg[seg.key] = [...agg.entries()]
      .map(([label, v]) => ({ label, volume: { value: v.volume, basis: "derived" as const }, keywordCount: v.count }))
      .sort((a, b) => b.volume.value - a.volume.value);
  }

  // 6) 성별 × 연령 교차 매트릭스
  const cross: B1CrossCell[] = [];
  for (const g of ["female", "male"]) {
    const gSet = new Set(segNodes.get(g) ?? []);
    for (const a of ["a13", "a20", "a25", "a30", "a40", "a50"]) {
      const aSet = new Set(segNodes.get(a) ?? []);
      const inter = [...gSet].filter((kw) => aSet.has(kw));
      const interSorted = topByVolume(inter, kw2vol, 20);
      cross.push({
        gender: g,
        age: a,
        volume: { value: inter.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0), basis: "derived" },
        keywordCount: inter.length,
        topKeywords: interSorted.map((kw) => ({ keyword: kw, volume: kw2vol.get(kw) ?? 0 })),
      });
    }
  }

  // 7) 인사이트
  const insights = computeInsights(segmentsOut, kbfBySeg);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "B-1",
      category,
      gl,
      totalNodes: allKws.length,
      totalKeywordsWithDemo: allKws.filter((kw) => infoByKw.get(kw)?.demography).length,
      generatedAt: new Date().toISOString(),
      llmModel: classification.model,
      kbfClassification: classification.status,
    },
    segments: segmentsOut,
    topKeywordsBySegment: topBySeg,
    kbfBySegment: kbfBySeg,
    crossMatrix: cross,
    insights,
    compliance: getComplianceBlock(industry),
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
  };
}

function computeInsights(segments: B1Segment[], kbfBySeg: Record<string, B1KbfEntry[]>): B1Insight[] {
  const insights: B1Insight[] = [];

  const genderSegs = segments.filter((s) => s.kind === "gender");
  if (genderSegs.length) {
    const top = genderSegs.reduce((a, b) => (b.totalVolume.value > a.totalVolume.value ? b : a));
    insights.push({
      kind: "segment_dominance",
      title: `성별 지배 · ${top.label} ${top.sharePct.value}%`,
      body: `${top.label} 검색이 성별 태그 노드 볼륨의 ${top.sharePct.value}%를 차지 · 크리에이티브·인플루언서 우선 타겟 검토`,
    });
  }

  const ageSegs = segments.filter((s) => s.kind === "age");
  if (ageSegs.length) {
    const top = ageSegs.reduce((a, b) => (b.totalVolume.value > a.totalVolume.value ? b : a));
    insights.push({
      kind: "segment_dominance",
      title: `핵심 연령대 · ${top.label} ${top.sharePct.value}%`,
      body: `${top.label}이 연령 태그 노드 볼륨 상위 · 이 세그먼트 KBF·인텐트 딥다이브 우선`,
    });
    const ageTotal = ageSegs.reduce((s, a) => s + a.totalVolume.value, 0) || 1;
    const small = ageSegs.filter((s) => s.totalVolume.value > 0 && s.totalVolume.value < ageTotal * 0.05);
    if (small.length) {
      const s = small.reduce((a, b) => (b.totalVolume.value < a.totalVolume.value ? b : a));
      insights.push({
        kind: "opportunity",
        title: `미커버 세그먼트 · ${s.label}`,
        body: `${s.label} 볼륨이 전체 5% 미만 · 대형 브랜드가 놓친 진입 기회 검토 대상`,
      });
    }
  }

  const kbfAgg = new Map<string, number>();
  for (const entries of Object.values(kbfBySeg)) {
    for (const e of entries) kbfAgg.set(e.label, (kbfAgg.get(e.label) ?? 0) + e.volume.value);
  }
  if (kbfAgg.size) {
    const [label] = [...kbfAgg.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    insights.push({
      kind: "kbf_gap",
      title: `KBF 지배 · ${label}`,
      body: `'${label}' 편익이 전체 KBF 볼륨 상위 · 크리에이티브 소구점 우선 후보`,
    });
  }

  return insights;
}
