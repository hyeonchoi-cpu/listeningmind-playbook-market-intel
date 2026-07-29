// C-1(라이징 브랜드)·C-2(SoV)가 공유하는 브랜드 지형 파이프라인.
//
// cluster_finder → keyword_info → LLM 브랜드 추출(대표명+별칭 정규화, 환각 검증 포함) → 브랜드별 집계.
// 점유율은 "감지된 브랜드 볼륨 합" 기준이며 컴플라이언스 규율상 항상 "검색량 기준 근사"로만 서술한다
// (검색 ≠ 실제 판매/점유율).
//
// 매칭 공정성 규칙 (실사례에서 나온 왜곡 방지):
//  1) 모든 브랜드를 기업/브랜드 수준 대표명 + 별칭 집합으로 통일 — 브랜드마다 토큰 수준이 다르면
//     ("삼성" vs "lg tv") 커버리지가 비대칭이 되어 점유율이 왜곡된다.
//  2) 키워드가 별칭 그 자체(단독 기업명 쿼리, 예: "삼성", "lg전자")면 집계에서 제외 — 카테고리 의도가
//     모호한 쿼리라 특정 카테고리 SoV에 넣으면 대형 기업 브랜드가 과대 측정된다(가정으로 명시).
import { clusterFinder, uniqueKeywords, keywordInfoAll, indexByKeyword, type Gl } from "@/lib/daas";
import { extractBrands } from "@/lib/llm";
import type { BrandRow, CostLogEntry, Industry } from "@/types";

const TOP_KEYWORDS_FOR_EXTRACTION = 250;
const TOP_KEYWORDS_PER_BRAND = 5;

export type BrandLandscape = {
  brands: BrandRow[];
  /** 소비자 브랜드가 아닌 기업·기관·종목명 (논브랜드 판정 제외용 — 소문자) */
  otherEntities: string[];
  totalNodes: number;
  llmModel: string;
  brandExtraction: "complete" | "partial";
  costLog: CostLogEntry[];
  /** 키워드 수준 후속 분석(D-3 등)용 내부 데이터 — 리포트 JSON에 직렬화하지 말 것 */
  allKeywords: string[];
  kw2vol: Map<string, number>;
  kw2trend: Map<string, number>;
};

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/** 볼륨 집계용 매칭 규칙 — 부분 문자열 포함 + 단독 기업명 쿼리 제외.
 *  SoV처럼 "이 볼륨을 어느 브랜드 수요로 셀 것인가"에 쓴다 (단독 기업명 쿼리는 카테고리 의도가
 *  모호해 대기업 과대 측정을 만들므로 집계에서 뺀다). */
export function matchesBrand(keyword: string, aliases: string[]): boolean {
  const kl = keyword.toLowerCase();
  if (!aliases.some((a) => kl.includes(a))) return false;
  const kn = normalize(keyword);
  if (aliases.some((a) => normalize(a) === kn)) return false;
  return true;
}

/** 분류용 판정 규칙 — 부분 문자열 포함만 본다 (단독 기업명 쿼리도 브랜드 연관으로 취급).
 *  "이 키워드가 브랜드와 무관한가"(D-3 논브랜드 기회, D-1 논브랜드 비중)에 쓴다 — 여기서
 *  matchesBrand를 쓰면 단독 "삼성" 쿼리가 논브랜드로 새는 실사례가 있었음. */
export function containsBrandToken(keyword: string, aliases: string[]): boolean {
  const kl = keyword.toLowerCase();
  return aliases.some((a) => kl.includes(a));
}

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
  const cleanMustInclude = mustInclude.map((b) => b.trim()).filter(Boolean);
  const extraction = await extractBrands(category, industry, topKws, cleanMustInclude);

  // mustInclude(자사 브랜드 등)는 LLM이 누락해도 항상 포함 — 별칭이 없으면 입력 표기 하나로라도
  const brandDefs = [...extraction.brands];
  for (const must of cleanMustInclude) {
    const mustLower = must.toLowerCase();
    const exists = brandDefs.some(
      (b) => b.name.toLowerCase() === mustLower || b.aliases.includes(mustLower),
    );
    if (!exists) brandDefs.push({ name: must, aliases: [mustLower] });
  }

  const rows: BrandRow[] = brandDefs.map((def) => {
    const aliases = def.aliases.length ? def.aliases : [def.name.toLowerCase()];
    // 매칭 규칙(부분 문자열 + 단독 기업명 쿼리 제외)은 matchesBrand 단일 소스 사용
    const matched = allKws.filter((kw) => matchesBrand(kw, aliases));
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
      name: def.name,
      aliases,
      keywordCount: matched.length,
      totalVolume: { value: totalVolume, basis: "derived" as const },
      sharePct: { value: 0, basis: "derived" as const },
      weightedTrend: { value: Math.round(weightedTrend * 1000) / 1000, basis: "derived" as const },
      topKeywords: top,
    };
  });

  // 매칭 키워드가 하나도 없는 브랜드는 제거 — 단 mustInclude는 데이터 공백 표시를 위해 남긴다
  // (LLM이 대표명을 정규화했을 수 있으므로 별칭까지 확인)
  const mustLower = new Set(cleanMustInclude.map((b) => b.toLowerCase()));
  const isMust = (r: BrandRow) =>
    mustLower.has(r.name.toLowerCase()) || r.aliases.some((a) => mustLower.has(a));
  const kept = rows.filter((r) => r.keywordCount > 0 || isMust(r));

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
    otherEntities: extraction.otherEntities,
    totalNodes: allKws.length,
    llmModel: extraction.model,
    brandExtraction: extraction.status,
    costLog: [
      { endpoint: "cluster_finder", calls: 1, totalCost: costCf },
      { endpoint: "keyword_info", calls: Math.ceil(allKws.length / 1000), totalCost: costKi },
    ],
    allKeywords: allKws,
    kw2vol,
    kw2trend,
  };
}
