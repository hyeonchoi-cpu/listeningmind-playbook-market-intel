"use client";

import { useState } from "react";
import type { B1Report, Industry, ReportCode, ReportGl } from "@/types";
import { estimateB1 } from "@/lib/reports/estimate";
import { B1ReportView } from "./B1ReportView";

type Phase = "idle" | "confirm" | "loading" | "done" | "error";

const GL_OPTIONS: { value: ReportGl; label: string }[] = [
  { value: "kr", label: "대한민국 (KR)" },
  { value: "us", label: "미국 (US)" },
  { value: "jp", label: "일본 (JP)" },
];

export function ReportGenerateForm({ industry, code }: { industry: Industry; code: ReportCode }) {
  const [category, setCategory] = useState("");
  const [gl, setGl] = useState<ReportGl>("kr");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<B1Report | null>(null);

  // Phase 2는 B-1 하나만 서비스 — 다른 코드가 실서비스로 붙으면 이 폼도 code.code 분기가 필요해짐
  const estimate = estimateB1();

  function handleSubmitClick() {
    if (!category.trim()) {
      setError("카테고리를 입력해주세요. (예: 스킨케어, 전세대출, 다이어트 보조제)");
      return;
    }
    setError(null);
    setPhase("confirm");
  }

  async function handleConfirm() {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: industry.slug, reportCode: code.code, category: category.trim(), gl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `요청 실패 (${res.status})`);
      setReport(data.report as B1Report);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      setPhase("error");
    }
  }

  if (phase === "done" && report) {
    return (
      <div>
        <B1ReportView report={report} />
        <div className="detail-cta" style={{ marginTop: 24 }}>
          <button
            className="secondary"
            onClick={() => {
              setPhase("idle");
              setReport(null);
            }}
          >
            다른 카테고리로 다시 생성
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="generate-form">
      <div className="generate-form-row">
        <label className="generate-form-label" htmlFor="category">
          카테고리
        </label>
        <input
          id="category"
          className="generate-form-input"
          type="text"
          placeholder="예: 스킨케어, 전세대출, 다이어트 보조제"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={phase === "loading" || phase === "confirm"}
        />
      </div>
      <div className="generate-form-row">
        <label className="generate-form-label" htmlFor="gl">
          국가
        </label>
        <select
          id="gl"
          className="generate-form-input"
          value={gl}
          onChange={(e) => setGl(e.target.value as ReportGl)}
          disabled={phase === "loading" || phase === "confirm"}
        >
          {GL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="generate-form-error">{error}</div>}

      {phase === "confirm" && (
        <div className="estimate-box">
          <div className="estimate-box-title">생성 전 예상치 확인 [가정]</div>
          <div className="estimate-box-grid">
            <div>
              <span className="estimate-label">DaaS 크레딧</span>
              <span className="estimate-value">
                {estimate.daasCreditsRange[0].toLocaleString()}~{estimate.daasCreditsRange[1].toLocaleString()}
              </span>
            </div>
            <div>
              <span className="estimate-label">Claude 비용</span>
              <span className="estimate-value">
                ${estimate.claudeUsdRange[0].toFixed(2)}~${estimate.claudeUsdRange[1].toFixed(2)}
              </span>
            </div>
            <div>
              <span className="estimate-label">예상 소요 시간</span>
              <span className="estimate-value">
                {estimate.secondsRange[0]}~{estimate.secondsRange[1]}초
              </span>
            </div>
          </div>
          <p className="estimate-box-note">{estimate.note}</p>
          <div className="detail-cta">
            <button className="primary" onClick={handleConfirm}>
              확인하고 생성 시작
            </button>
            <button className="secondary" onClick={() => setPhase("idle")}>
              취소
            </button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="mock-banner">
          <strong>생성 중…</strong> DaaS 데이터 조회 + 실시간 KBF 분류를 진행하고 있습니다. 최대 1~2분 정도
          걸릴 수 있습니다. 페이지를 벗어나지 마세요.
        </div>
      )}

      {(phase === "idle" || phase === "error") && (
        <div className="detail-cta">
          <button className="primary" onClick={handleSubmitClick}>
            리포트 생성
          </button>
        </div>
      )}
    </div>
  );
}
