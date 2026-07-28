// GET /api/reports/[jobId] — 이미 생성된 리포트를 잡 기록(KV) + 리포트 JSON(Blob)에서 조회한다.
// 재생성 없이 공유 링크·재방문 시 그대로 다시 보여주는 용도.
import { NextResponse } from "next/server";
import { kvGet, blobGetJson } from "@/lib/store";
import type { ReportJobRecord } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const job = await kvGet<ReportJobRecord>(`job:${params.jobId}`);
  if (!job) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다. 만료됐거나 잘못된 링크입니다." }, { status: 404 });
  }
  if (job.status !== "done" || !job.reportUrl) {
    return NextResponse.json({ job }, { status: 202 });
  }
  const report = await blobGetJson(job.reportUrl);
  if (!report) {
    return NextResponse.json({ error: "리포트 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ job, report });
}
