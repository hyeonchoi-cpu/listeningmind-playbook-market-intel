// P-1b · 시즌 수요 지속성 (monthly 48개월) — 퍼블리시스 Theraflu 케이스에서 일반화한 템플릿.
//
// A-1이 "추이"를 본다면 P-1b는 "시즌 구조"를 본다: 캘린더 월별 시즌 지수(다년 평균/전체 평균),
// 연도×월 매트릭스, 비수기 지속성(최저월/최고월 비율). keyword_info 1콜, LLM 없음.
import { keywordInfoAll, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { Industry, P1bReport, ReportInsight } from "@/types";

const PERSISTENT_THRESHOLD = 60; // 비수기 지속형 판정 하한(%) — 가정
const SEASONAL_THRESHOLD = 30; // 시즌 집중형 판정 상한(%) — 가정

export async function generateP1bReport(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<P1bReport> {
  const { industry, category, gl } = input;

  const { items, totalCost } = await keywordInfoAll([category], gl);
  const info = items[0];
  if (!info) {
    throw new Error(`"${category}" 키워드의 검색 데이터가 없습니다. 키워드 표기를 확인해주세요.`);
  }
  if (info.monthly.length === 0) {
    throw new Error(`"${category}" 키워드의 월별 검색량 시계열이 비어 있어 시즌 분석이 불가능합니다.`);
  }

  const monthly = [...info.monthly].sort((a, b) => a.month.localeCompare(b.month));

  // 연도 × 월 매트릭스
  const byYear = new Map<string, (number | null)[]>();
  for (const m of monthly) {
    const [year, mm] = m.month.split("-");
    if (!byYear.has(year)) byYear.set(year, Array(12).fill(null));
    byYear.get(year)![Number(mm) - 1] = m.total;
  }
  const yearRows = [...byYear.entries()]
    .map(([year, row]) => ({ year, monthly: row }))
    .sort((a, b) => a.year.localeCompare(b.year));

  // 캘린더 월별 평균 → 시즌 지수
  const monthAvgs: { month: number; avg: number; n: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = yearRows.map((r) => r.monthly[m - 1]).filter((v): v is number => v !== null);
    monthAvgs.push({
      month: m,
      avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0,
      n: vals.length,
    });
  }
  const overallAvg = monthAvgs.filter((m) => m.n > 0).reduce((s, m) => s + m.avg, 0) /
    Math.max(1, monthAvgs.filter((m) => m.n > 0).length);
  const seasonalIndex = monthAvgs.map((m) => ({
    month: m.month,
    index: {
      value: m.n > 0 && overallAvg > 0 ? Math.round((m.avg / overallAvg) * 100) / 100 : 0,
      basis: (m.n > 0 ? "derived" : "missing") as "derived" | "missing",
    },
    avgVolume: Math.round(m.avg),
  }));

  const withData = seasonalIndex.filter((s) => s.index.basis === "derived");
  const peak = withData.reduce((a, b) => (b.index.value > a.index.value ? b : a), withData[0]);
  const trough = withData.reduce((a, b) => (b.index.value < a.index.value ? b : a), withData[0]);
  const offSeasonShare =
    peak && peak.avgVolume > 0 ? Math.round((trough.avgVolume / peak.avgVolume) * 1000) / 10 : 0;

  return {
    meta: {
      industry: industry.slug,
      reportCode: "P-1b",
      category,
      gl,
      monthsCovered: monthly.length,
      yearsCovered: yearRows.length,
      generatedAt: new Date().toISOString(),
    },
    keyword: info.keyword,
    seasonalIndex,
    yearRows,
    persistence: {
      peakMonth: peak?.month ?? 0,
      troughMonth: trough?.month ?? 0,
      offSeasonSharePct: { value: offSeasonShare, basis: withData.length ? "derived" : "missing" },
    },
    insights: computeInsights(peak?.month ?? 0, trough?.month ?? 0, offSeasonShare, yearRows.length, monthly.length),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "keyword_info", calls: 1, totalCost }],
  };
}

function computeInsights(
  peakMonth: number,
  troughMonth: number,
  offSeasonShare: number,
  years: number,
  months: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  if (peakMonth) {
    insights.push({
      kind: "season_peak",
      title: `시즌 피크 · ${peakMonth}월 / 최저 · ${troughMonth}월`,
      body: `${years}개 연도 평균 기준 캘린더 월 비교 · 반복 시즌 여부는 연도×월 매트릭스에서 직접 확인`,
    });
  }

  if (offSeasonShare > 0) {
    const label =
      offSeasonShare >= PERSISTENT_THRESHOLD
        ? "수요 지속형"
        : offSeasonShare <= SEASONAL_THRESHOLD
          ? "시즌 집중형"
          : "중간형";
    insights.push({
      kind: "persistence",
      title: `비수기 지속성 ${offSeasonShare}% · ${label}`,
      body: `최저월 평균이 최고월 평균의 ${offSeasonShare}% (판정 기준 ${PERSISTENT_THRESHOLD}%/${SEASONAL_THRESHOLD}%는 가정) · ${
        offSeasonShare >= PERSISTENT_THRESHOLD
          ? "비수기에도 수요가 유지되어 상시 캠페인 여지"
          : offSeasonShare <= SEASONAL_THRESHOLD
            ? "시즌 외 수요가 얇아 시즌 집중 운영이 효율적이라는 신호(단정 아님)"
            : "시즌 편중이 중간 수준 — 시즌 강화 + 비수기 유지 병행 검토"
      }`,
    });
  }

  if (years < 2) {
    insights.push({
      kind: "data_gap",
      title: `시계열 ${months}개월 (${years}개 연도)`,
      body: "2개 연도 미만이라 시즌 반복성 검증이 어렵습니다 · 시즌 지수는 참고용으로만 사용하세요",
    });
  }

  return insights;
}
