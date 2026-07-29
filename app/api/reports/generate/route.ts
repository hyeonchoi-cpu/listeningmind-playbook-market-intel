// POST /api/reports/generate — 실시간 DaaS 호출 + Claude 분류로 리포트를 생성한다.
//
// web/app/api/geo/route.ts와 동일하게 동기 처리한다 (Job Queue+폴링이 아니라 단일 요청-응답).
// 이유: 이 저장소의 실제 선례(geo 파이프라인, DaaS 다중 호출 + Claude 보강)가 같은 조합으로
// ~50초 안에 끝나 Vercel maxDuration=300s 안에 여유 있게 들어온다 — B-1도 동일 규모라 같은 패턴을
// 따르는 게 검증된 접근이다. 완성된 리포트는 그래도 Blob에, 잡 기록은 KV에 남겨(§8 결정 2)
// GET /api/reports/[jobId]로 재조회·공유할 수 있게 한다. 향후 Phase 3에서 더 무거운 리포트 코드가
// 300초를 넘기게 되면 그때 진짜 비동기 폴링을 도입한다 — 지금은 검증되지 않은 인프라를 미리 짓지 않는다.
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { DaasError, type Gl } from "@/lib/daas";
import { industryBySlug } from "@/data/industries";
import { reportCodeByCode } from "@/data/report-codes";
import { getReportGenerator } from "@/lib/reports/registry";
import { kvGet, kvSet, blobPutJson, blobGetJson } from "@/lib/store";
import type { IndustrySlug, ReportGl, ReportJobRecord } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GLS: ReportGl[] = ["kr", "us", "jp"];
const IDEMPOTENCY_TTL_SECONDS = 6 * 60 * 60; // 6시간 — 이 창 안에서는 같은 요청을 재사용해 중복 과금 방지
const JOB_TTL_SECONDS = 30 * 24 * 60 * 60; // 30일 — 공유 링크가 그동안 살아있게
// 파이프라인 로직이 바뀌면 올린다 — 캐시된 구버전 결과가 6시간 동안 새 로직을 가리는 것을 방지
// (v2: 브랜드 별칭 정규화 + 단독 기업명 쿼리 제외 / v3: 분류용 포함 판정 분리 + 기타 엔티티 제외
//  / v4: 비소비 맥락(주식·취업) 토큰 필터 / v5: D-3 단독 기업명 쿼리를 강점·경쟁수요 목록에서도 제외 + 재명명
//  / v6: path_finder 실응답(경로 시퀀스) 기반으로 C-3·A-4 재작성)
const PIPELINE_VERSION = "6";

function idempotencyKey(industry: IndustrySlug, code: string, category: string, gl: Gl, brand: string): string {
  const norm = category.trim().toLowerCase();
  const brandNorm = brand.trim().toLowerCase();
  return `idem:v${PIPELINE_VERSION}:${industry}:${code}:${norm}:${gl}${brandNorm ? `:${brandNorm}` : ""}`;
}

/** LLM 분류가 실패(partial)한 리포트는 캐시 재사용 대상에서 제외 — 재생성이 바로 사용자가 원하는 동작이므로.
 *  (실사례: ANTHROPIC_API_KEY 미설정 상태에서 생성된 partial 리포트가 6시간 동안 재생성을 막았음) */
function hasPartialClassification(report: unknown): boolean {
  const meta = (report as { meta?: Record<string, unknown> } | null)?.meta;
  return meta?.kbfClassification === "partial" || meta?.cepClassification === "partial";
}

export async function POST(request: Request) {
  let body: { industry?: string; reportCode?: string; category?: string; gl?: string; brand?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const industry = industryBySlug(body.industry ?? "");
  if (!industry) return NextResponse.json({ error: "유효하지 않은 industry입니다." }, { status: 400 });

  const code = reportCodeByCode(body.reportCode ?? "");
  if (!code) return NextResponse.json({ error: "유효하지 않은 reportCode입니다." }, { status: 400 });
  if (code.status !== "implemented") {
    return NextResponse.json({ error: `${code.code}는 아직 준비 중입니다.` }, { status: 400 });
  }

  const generator = getReportGenerator(code.code);
  if (!generator) {
    return NextResponse.json({ error: `${code.code} 생성기가 등록되지 않았습니다.` }, { status: 500 });
  }

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!category || category.length > 60) {
    return NextResponse.json({ error: "category(1~60자)는 필수입니다." }, { status: 400 });
  }

  const gl = (GLS as string[]).includes(body.gl ?? "") ? (body.gl as Gl) : null;
  if (!gl) return NextResponse.json({ error: "gl은 kr/us/jp 중 하나여야 합니다." }, { status: 400 });

  const brand = typeof body.brand === "string" ? body.brand.trim().slice(0, 60) : "";

  // 중복 호출 방지 — 같은 (업권,코드,카테고리,gl,브랜드) 조합이 6시간 내 이미 생성됐으면 재사용
  const idemKey = idempotencyKey(industry.slug, code.code, category, gl, brand);
  const cachedJobId = await kvGet<string>(idemKey);
  if (cachedJobId) {
    const cached = await kvGet<ReportJobRecord>(`job:${cachedJobId}`);
    if (cached?.status === "done" && cached.reportUrl) {
      const report = await blobGetJson(cached.reportUrl);
      if (report && !hasPartialClassification(report)) {
        return NextResponse.json({ jobId: cached.jobId, report, cached: true });
      }
    }
  }

  const jobId = randomUUID();
  let report: unknown;
  try {
    report = await generator({ industry, category, gl, brand: brand || undefined });
  } catch (e) {
    if (e instanceof DaasError) {
      return NextResponse.json({ error: e.message }, { status: e.status || 502 });
    }
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `리포트 생성 실패: ${msg}` }, { status: 500 });
  }

  // 여기까지 왔으면 DaaS 크레딧은 이미 소비됐다 — 이후 저장(KV/Blob) 단계가 실패해도
  // 이미 만든 리포트를 버리지 않고 응답에 그대로 담아 돌려준다. KV/Blob 스토리지가 아직
  // 연결되지 않은 배포에서는 lib/store.ts의 로컬 파일 폴백이 Vercel의 읽기전용 파일시스템에서
  // 실패하므로(EROFS), persisted=false로 알려서 UI가 "저장 안 됨" 경고를 띄우게 한다.
  let persisted = false;
  try {
    const { url: reportUrl } = await blobPutJson(`reports/${jobId}.json`, report);
    const record: ReportJobRecord = {
      jobId,
      industry: industry.slug,
      reportCode: code.code,
      category,
      gl,
      status: "done",
      createdAt: new Date().toISOString(),
      reportUrl,
    };
    await kvSet(`job:${jobId}`, record, { ttlSeconds: JOB_TTL_SECONDS });
    await kvSet(idemKey, jobId, { ttlSeconds: IDEMPOTENCY_TTL_SECONDS });
    persisted = true;
  } catch (e) {
    console.error(`[reports/generate] 저장 실패 (jobId=${jobId}) — 리포트는 생성됐으나 재조회/공유 링크는 동작하지 않음:`, e);
  }

  return NextResponse.json({ jobId, report, cached: false, persisted }, { status: 201 });
}
