// A-2 · 메인 키워드 검색자 성별·연령 분포.
//
// keyword_info.demography의 *_ratio 필드(실측 %)만 사용 — keyword_info 1콜, LLM 없음.
// 인구통계 태깅은 KR 중심 커버리지라(B-1에서 실증된 한계) demography가 없으면 전 항목을
// "0%"가 아니라 missing으로 라벨링한다.
import { keywordInfoAll, type Demography, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { A2RatioRow, A2Report, Industry, ReportInsight } from "@/types";

const GENDER_FIELDS = [
  { key: "female", label: "여성", field: "f_gender_ratio" },
  { key: "male", label: "남성", field: "m_gender_ratio" },
];

const AGE_FIELDS = [
  { key: "a13", label: "10대", field: "a13_ratio" },
  { key: "a20", label: "20대", field: "a20_ratio" },
  { key: "a25", label: "25~", field: "a25_ratio" },
  { key: "a30", label: "30대", field: "a30_ratio" },
  { key: "a40", label: "40대", field: "a40_ratio" },
  { key: "a50", label: "50대+", field: "a50_ratio" },
];

function readRatio(demo: Demography | null, field: string): number | null {
  const v = demo?.[field];
  const n = Number(v);
  return v !== undefined && v !== null && Number.isFinite(n) ? n : null;
}

function toRows(
  defs: { key: string; label: string; field: string }[],
  demo: Demography | null,
  available: boolean,
): A2RatioRow[] {
  return defs.map((d) => {
    const v = available ? readRatio(demo, d.field) : null;
    return {
      key: d.key,
      label: d.label,
      ratioPct: v !== null ? { value: Math.round(v * 10) / 10, basis: "measured" as const } : { value: 0, basis: "missing" as const },
    };
  });
}

export async function generateA2Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A2Report> {
  const { industry, category, gl } = input;

  const { items, totalCost } = await keywordInfoAll([category], gl);
  const info = items[0];
  if (!info) {
    throw new Error(`"${category}" 키워드의 검색 데이터가 없습니다. 키워드 표기를 확인해주세요.`);
  }

  const demo = info.demography;
  const allFields = [...GENDER_FIELDS, ...AGE_FIELDS].map((d) => d.field);
  const available = !!demo && allFields.some((f) => readRatio(demo, f) !== null);

  const gender = toRows(GENDER_FIELDS, demo, available);
  const age = toRows(AGE_FIELDS, demo, available);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-2",
      category,
      gl,
      demographyAvailable: available,
      generatedAt: new Date().toISOString(),
    },
    keyword: info.keyword,
    volumeAvg: { value: info.volumeAvg, basis: "measured" },
    gender,
    age,
    insights: computeInsights(gender, age, available),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "keyword_info", calls: 1, totalCost }],
  };
}

function computeInsights(gender: A2RatioRow[], age: A2RatioRow[], available: boolean): ReportInsight[] {
  if (!available) {
    return [
      {
        kind: "data_gap",
        title: "이 키워드는 인구통계 태깅 데이터가 없습니다",
        body: "ListeningMind DaaS의 성별·연령 태깅은 KR 중심 커버리지입니다. 이 카테고리·국가 조합에서는 분포를 측정할 수 없으니 아래 값을 0%가 아니라 데이터 공백으로 해석하세요 — KR 시장으로 다시 시도해보세요.",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const topGender = gender.reduce((a, b) => (b.ratioPct.value > a.ratioPct.value ? b : a));
  if (topGender.ratioPct.basis === "measured") {
    insights.push({
      kind: "gender",
      title: `성별 우세 · ${topGender.label} ${topGender.ratioPct.value}%`,
      body: `이 키워드 검색자의 ${topGender.ratioPct.value}%가 ${topGender.label} 태그 · 크리에이티브·매체 톤 우선 기준`,
    });
  }
  const topAge = age.reduce((a, b) => (b.ratioPct.value > a.ratioPct.value ? b : a));
  if (topAge.ratioPct.basis === "measured") {
    insights.push({
      kind: "age",
      title: `핵심 연령대 · ${topAge.label} ${topAge.ratioPct.value}%`,
      body: `${topAge.label} 비중이 가장 높음 · 세그먼트별 관심사 차이는 B-1 리포트로 딥다이브 가능`,
    });
  }
  const smallest = age.filter((a) => a.ratioPct.basis === "measured").reduce((a, b) => (b.ratioPct.value < a.ratioPct.value ? b : a), topAge);
  if (smallest !== topAge && smallest.ratioPct.basis === "measured") {
    insights.push({
      kind: "opportunity",
      title: `최소 세그먼트 · ${smallest.label} ${smallest.ratioPct.value}%`,
      body: `${smallest.label} 비중이 가장 낮음 · 미개척 세그먼트인지, 카테고리 무관심층인지는 별도 검증 필요`,
    });
  }
  return insights;
}
