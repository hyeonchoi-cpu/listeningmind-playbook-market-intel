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

function idempotencyKey(industry: IndustrySlug, code: string, category: string, gl: Gl): string {
  const norm = category.trim().toLowerCase();
  return `idem:${industry}:${code}:${norm}:${gl}`;
}

export async function POST(request: Request) {
  let body: { industry?: string; reportCode?: string; category?: string; gl?: string };
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

  // 중복 호출 방지 — 같은 (업권,코드,카테고리,gl) 조합이 6시간 내 이미 생성됐으면 재사용
  const idemKey = idempotencyKey(industry.slug, code.code, category, gl);
  const cachedJobId = await kvGet<string>(idemKey);
  if (cachedJobId) {
    const cached = await kvGet<ReportJobRecord>(`job:${cachedJobId}`);
    if (cached?.status === "done" && cached.reportUrl) {
      const report = await blobGetJson(cached.reportUrl);
      if (report) return NextResponse.json({ jobId: cached.jobId, report, cached: true });
    }
  }

  const jobId = randomUUID();
  try {
    const report = await generator({ industry, category, gl });
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

    return NextResponse.json({ jobId, report, cached: false }, { status: 201 });
  } catch (e) {
    if (e instanceof DaasError) {
      return NextResponse.json({ error: e.message }, { status: e.status || 502 });
    }
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `리포트 생성 실패: ${msg}` }, { status: 500 });
  }
}
