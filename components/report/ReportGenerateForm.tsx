"use client";

import { useState, type ComponentType } from "react";
import type { Industry, ReportCode, ReportGl } from "@/types";
import { estimateForCode } from "@/lib/reports/estimate";
import { A1ReportView } from "./A1ReportView";
import { A2ReportView } from "./A2ReportView";
import { A3ReportView } from "./A3ReportView";
import { B1ReportView } from "./B1ReportView";

type Phase = "idle" | "confirm" | "loading" | "done" | "error";

const GL_OPTIONS: { value: ReportGl; label: string }[] = [
  { value: "kr", label: "대한민국 (KR)" },
  { value: "us", label: "미국 (US)" },
  { value: "jp", label: "일본 (JP)" },
];

// 코드별 결과 뷰 — lib/reports/registry.ts에 생성기를 등록할 때 여기에도 뷰를 등록한다.
const REPORT_VIEWS: Record<string, ComponentType<{ report: any }>> = {
  "A-1": A1ReportView,
  "A-2": A2ReportView,
  "A-3": A3ReportView,
  "B-1": B1ReportView,
};

// 인구통계 태깅(KR 중심 커버리지)에 의존하는 코드 — KR 외 국가 선택 시 사전 경고
const DEMOGRAPHY_DEPENDENT_CODES = new Set(["A-2", "B-1"]);

export function ReportGenerateForm({ industry, code }: { industry: Industry; code: ReportCode }) {
  const [category, setCategory] = useState("");
  const [gl, setGl] = useState<ReportGl>("kr");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<unknown | null>(null);
  const [persisted, setPersisted] = useState(true);

  const estimate = estimateForCode(code.code);
  const usesLlm = estimate.claudeUsdRange[1] > 0;
  const ReportView = REPORT_VIEWS[code.code];

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
      setReport(data.report);
      setPersisted(data.persisted !== false);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      setPhase("error");
    }
  }

  if (phase === "done" && report && ReportView) {
    return (
      <div>
        {!persisted && (
          <div className="generate-form-error" style={{ marginBottom: 20 }}>
            <strong>저장 실패</strong> — 이 리포트는 생성만 됐고 서버에 저장되지 않았습니다 (KV/Blob 스토리지 미연결).
            새로고침하거나 페이지를 벗어나면 사라지니, 필요하면 지금 화면을 캡처하거나 내려받아 두세요. 관리자에게
            스토리지 연결을 요청하면 다음부터는 공유 링크로 다시 볼 수 있습니다.
          </div>
        )}
        <ReportView report={report} />
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
        {DEMOGRAPHY_DEPENDENT_CODES.has(code.code) && gl !== "kr" && (
          <p className="estimate-box-note" style={{ marginTop: 6 }}>
            {code.code}의 성별·연령 태깅은 KR 중심 커버리지입니다 — {GL_OPTIONS.find((o) => o.value === gl)?.label}는
            카테고리에 따라 인구통계 데이터가 없어 결과가 전부 &ldquo;측정 불가&rdquo;로 나올 수 있습니다.
          </p>
        )}
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
                {usesLlm
                  ? `$${estimate.claudeUsdRange[0].toFixed(2)}~$${estimate.claudeUsdRange[1].toFixed(2)}`
                  : "없음"}
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
          <strong>생성 중…</strong> DaaS 데이터 조회{usesLlm ? " + 실시간 LLM 분류" : ""}를 진행하고 있습니다.
          {usesLlm ? " 최대 1~2분" : " 수 초에서 수십 초"} 정도 걸릴 수 있습니다. 페이지를 벗어나지 마세요.
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
