// Claude 기반 실시간 KBF(핵심 구매요인) 분류 — 서버 전용.
// web/lib/llm.ts의 fetch 기반 Anthropic 호출 패턴을 그대로 따름(SDK 의존성 추가 안 함).
//
// 설계 배경 (docs/market-intelligence-webapp-design.md §6, §8 결정 1/5/7):
//  - lima-agents Python MVP는 정규식 사전(KBF_PATTERNS) 기반 분류였음 — 식품 카테고리에만 맞춰진 하드코딩이라
//    다른 업권(화장품·금융 등)엔 그대로 못 씀. 이 파일이 그걸 대체한다.
//  - 매 리포트 생성마다 실시간 호출(정규식/캐시 없음) — §8 결정 1.
//  - playbook 전용 Anthropic API 키를 쓴다 — §8 결정 5.
//  - 스키마 불일치/타임아웃 시 최대 2회 재시도, 그래도 실패하면 리포트 전체를 죽이지 않고
//    "partial" 상태로 빈 분류를 반환해 호출부가 [재분류 필요] 배지로 표시하게 한다 — §8 결정 7.
import type { Industry } from "@/types";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_ATTEMPTS = 3; // 최초 시도 1회 + 재시도 최대 2회
const MAX_KEYWORDS_PER_CALL = 250; // 프롬프트 크기 방어 상한

export function llmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type KbfClassification = {
  /** 이번 생성에서 Claude가 스스로 정의한 이 카테고리용 KBF 라벨 집합 */
  taxonomy: string[];
  /** keyword → 해당하는 KBF 라벨들 (없으면 빈 배열) */
  labels: Record<string, string[]>;
  /** 재시도까지 모두 실패해 빈 분류로 대체된 경우 "partial" */
  status: "complete" | "partial";
  model: string;
};

function buildSystemPrompt(category: string, industry: Industry): string {
  const guardrails = industry.guardrailSummary.map((g) => `- ${g}`).join("\n");
  return `당신은 "${category}" 카테고리(${industry.label} 업권) 검색 키워드를 핵심구매요인(KBF)으로 분류하는 분석가입니다.

업권 참고: ${industry.entityDictionaryLabel}.

이 업권 리포트에는 아래 컴플라이언스 가드레일이 항상 적용됩니다 — 만들어내는 KBF 라벨명 자체가 이 규칙을 위반하는 단정·권유 표현이 되지 않도록 주의하세요:
${guardrails}

작업 순서:
1) 이 카테고리에 맞는 KBF(핵심 구매요인) 라벨을 5~8개 스스로 정의하세요. 한국어, 2~6자 내외 명사구 (예: "가격·가성비", "성분·효능", "안전·부작용").
2) 입력된 키워드 각각이 어떤 KBF 라벨에 해당하는지 분류하세요. 한 키워드가 여러 라벨에 해당할 수 있습니다. 근거가 약하면 억지로 분류하지 말고 빈 배열로 두세요 — 잘못된 분류보다 "미분류"가 낫습니다.

출력은 오직 아래 JSON 형식으로만 (설명·마크다운·코드펜스 금지):
{"taxonomy":["라벨1","라벨2"],"labels":{"키워드1":["라벨1"],"키워드2":[]}}
입력 키워드를 빠짐없이 labels의 키로 포함하세요.`;
}

function parseJson(text: string): { taxonomy?: unknown; labels?: unknown } {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function isValid(parsed: { taxonomy?: unknown; labels?: unknown }, keywords: string[]): boolean {
  if (!Array.isArray(parsed.taxonomy) || parsed.taxonomy.length === 0) return false;
  if (!parsed.labels || typeof parsed.labels !== "object") return false;
  const labelKeys = Object.keys(parsed.labels as object);
  // 최소 80%의 입력 키워드가 응답에 포함돼야 "완전한" 분류로 간주 — 그 이하는 재시도 대상
  const covered = keywords.filter((k) => labelKeys.includes(k)).length;
  return covered >= keywords.length * 0.8;
}

async function callClaude(system: string, userPayload: string, model: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY 미설정 (서버 환경변수 확인)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userPayload }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((c) => c.type === "text")?.text ?? "";
}

/**
 * 키워드 목록을 카테고리·업권 맥락에 맞춰 KBF로 분류한다.
 * 호출부가 이미 세그먼트별 상위 키워드로 규모를 줄여서 넘기는 것을 전제로 한다
 * (전체 키워드 우주를 그대로 넘기면 비용·지연시간이 커짐 — 상세: 설계 문서 §6).
 */
export async function classifyKbf(
  category: string,
  industry: Industry,
  keywords: string[],
): Promise<KbfClassification> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const distinct = [...new Set(keywords.filter(Boolean))].slice(0, MAX_KEYWORDS_PER_CALL);
  if (distinct.length === 0) {
    return { taxonomy: [], labels: {}, status: "complete", model };
  }

  const system = buildSystemPrompt(category, industry);
  const userPayload = JSON.stringify({ category, keywords: distinct });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callClaude(system, userPayload, model);
      const parsed = parseJson(text);
      if (isValid(parsed, distinct)) {
        const labels: Record<string, string[]> = {};
        for (const kw of distinct) {
          const v = (parsed.labels as Record<string, unknown>)[kw];
          labels[kw] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        }
        return {
          taxonomy: (parsed.taxonomy as string[]).filter((x) => typeof x === "string"),
          labels,
          status: "complete",
          model,
        };
      }
      lastError = new Error("응답이 스키마 검증(80% 키워드 커버리지)을 통과하지 못함");
    } catch (e) {
      lastError = e;
    }
  }

  // 재시도까지 모두 실패 — 리포트 전체를 죽이지 않고 partial로 빈 분류 반환
  console.error(`[llm.classifyKbf] ${MAX_ATTEMPTS}회 시도 후 실패:`, lastError);
  return {
    taxonomy: [],
    labels: Object.fromEntries(distinct.map((k) => [k, []])),
    status: "partial",
    model,
  };
}
