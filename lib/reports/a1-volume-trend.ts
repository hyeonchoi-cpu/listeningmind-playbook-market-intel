// A-1 · 메인 키워드 월별 검색량 추이·전년 대비 증감.
//
// question-frame.md 원문 스펙 그대로 "메인 키워드" 하나의 keyword_info.monthly_volume만 사용 —
// 카테고리 확장(cluster/intent) 없이 가장 저렴한 리포트다(keyword_info 1콜, LLM 없음).
// 시즌 관련 서술은 인과 단정 없이 동향·상관으로만 (컴플라이언스 공통 규율).
import { keywordInfoAll, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { A1Report, A1YoyRow, Industry, ReportInsight } from "@/types";

function prevYearMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${Number(y) - 1}-${m}`;
}

export async function generateA1Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A1Report> {
  const { industry, category, gl } = input;

  const { items, totalCost } = await keywordInfoAll([category], gl);
  const info = items[0];
  if (!info) {
    throw new Error(`"${category}" 키워드의 검색 데이터가 없습니다. 키워드 표기를 확인해주세요.`);
  }
  if (info.monthly.length === 0) {
    throw new Error(`"${category}" 키워드의 월별 검색량 시계열이 비어 있습니다. 이 시장(${gl})에서는 추이 분석이 어렵습니다.`);
  }

  const monthly = [...info.monthly].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(monthly.map((m) => [m.month, m.total]));

  const yoyAll: A1YoyRow[] = monthly
    .filter((m) => (byMonth.get(prevYearMonth(m.month)) ?? 0) > 0)
    .map((m) => {
      const prev = byMonth.get(prevYearMonth(m.month))!;
      return {
        month: m.month,
        current: m.total,
        prevYear: prev,
        deltaPct: { value: Math.round(((m.total - prev) / prev) * 1000) / 10, basis: "derived" as const },
      };
    });
  const yoy = yoyAll.slice(-12);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-1",
      category,
      gl,
      monthsCovered: monthly.length,
      generatedAt: new Date().toISOString(),
    },
    keyword: info.keyword,
    volumeAvg: { value: info.volumeAvg, basis: "measured" },
    volumeTrend: { value: info.volumeTrend, basis: "measured" },
    monthly: monthly.map((m) => ({ month: m.month, total: { value: m.total, basis: "measured" as const } })),
    yoy,
    insights: computeInsights(monthly, yoy),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "keyword_info", calls: 1, totalCost }],
  };
}

function computeInsights(monthly: { month: string; total: number }[], yoy: A1YoyRow[]): ReportInsight[] {
  const insights: ReportInsight[] = [];

  const latestYoy = yoy[yoy.length - 1];
  if (latestYoy) {
    const dir = latestYoy.deltaPct.value >= 0 ? "증가" : "감소";
    insights.push({
      kind: "yoy",
      title: `최근 YoY · ${latestYoy.month} ${latestYoy.deltaPct.value >= 0 ? "+" : ""}${latestYoy.deltaPct.value}%`,
      body: `${latestYoy.month} 검색량이 전년 동월 대비 ${Math.abs(latestYoy.deltaPct.value)}% ${dir} · 최근 수요 방향 확인용 1차 신호`,
    });
  } else {
    insights.push({
      kind: "data_gap",
      title: "전년 동월 비교 구간 없음",
      body: `시계열이 ${monthly.length}개월뿐이라 YoY 비교가 불가능합니다 · 추이 해석은 절대값 기준으로만 하세요`,
    });
  }

  const recent = monthly.slice(-24);
  if (recent.length) {
    const peak = recent.reduce((a, b) => (b.total > a.total ? b : a));
    insights.push({
      kind: "peak",
      title: `최근 24개월 피크 · ${peak.month}`,
      body: `${peak.month}에 검색량 ${peak.total.toLocaleString()}으로 최고치 · 캠페인 타이밍 검토 기준점`,
    });
  }

  // 시즌 반복 후보 — 최근 36개월에서 캘린더 월(MM)별 평균이 가장 높은 달. 인과 단정 없이 "후보"로만.
  const byCalMonth = new Map<string, { sum: number; n: number }>();
  for (const m of monthly.slice(-36)) {
    const mm = m.month.split("-")[1];
    const cur = byCalMonth.get(mm) ?? { sum: 0, n: 0 };
    cur.sum += m.total;
    cur.n += 1;
    byCalMonth.set(mm, cur);
  }
  if (byCalMonth.size >= 12) {
    const [topMm] = [...byCalMonth.entries()].reduce((a, b) => (b[1].sum / b[1].n > a[1].sum / a[1].n ? b : a));
    insights.push({
      kind: "seasonality",
      title: `시즌 피크 후보 · ${Number(topMm)}월`,
      body: `최근 36개월 평균 기준 ${Number(topMm)}월 검색량이 가장 높음 · 반복 시즌 여부는 연도별 재확인 필요 (상관·동향 서술)`,
    });
  }

  return insights;
}
