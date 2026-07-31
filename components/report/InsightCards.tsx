"use client";

import { useState } from "react";

/**
 * 인사이트 카드 — LM Material 시안 ② "캡처 완결형".
 * 결론(두괄) → 근거 → 캡처 푸터(카테고리·시점·출처) + 보고서 복사(마크다운).
 * 카드 하나가 보고서·메신저에 그대로 붙는 단위가 되도록 출처·시점을 카드 안에 내장한다.
 */
export function InsightCards({
  insights,
  meta,
}: {
  insights: { title: string; body: string }[];
  meta: { category: string; gl: string; generatedAt: string };
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const stamp = `${meta.category} · ${meta.gl.toUpperCase()} · ${new Date(meta.generatedAt).toLocaleDateString("ko-KR")}`;

  async function copy(i: number, ins: { title: string; body: string }) {
    const md = `**${ins.title}**\n${ins.body}\n— ${stamp} · ListeningMind DaaS (검색량 기준·판매 실적 아님)`;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(i);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard 미지원 환경 — 무시 */
    }
  }

  return (
    <div className="insight-grid">
      {insights.map((ins, i) => (
        <div key={i} className="insight-card">
          <div className="insight-card-title">{ins.title}</div>
          <div className="insight-card-body">{ins.body}</div>
          <div className="insight-card-foot">
            <span className="insight-card-stamp">{stamp}</span>
            <span className="insight-card-src">ListeningMind DaaS</span>
            <button type="button" className="insight-copy" onClick={() => copy(i, ins)}>
              {copied === i ? "복사됨 ✓" : "보고서에 복사"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
