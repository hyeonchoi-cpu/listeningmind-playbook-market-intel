"use client";

import { useState, type ComponentType } from "react";
import type { Industry, ReportCode, ReportGl } from "@/types";
import { estimateForCode } from "@/lib/reports/estimate";
import { A1ReportView } from "./A1ReportView";
import { A2ReportView } from "./A2ReportView";
import { A3ReportView } from "./A3ReportView";
import { A4ReportView } from "./A4ReportView";
import { A5ReportView } from "./A5ReportView";
import { B1ReportView } from "./B1ReportView";
import { C1ReportView } from "./C1ReportView";
import { C2ReportView } from "./C2ReportView";
import { C3ReportView } from "./C3ReportView";
import { C4ReportView } from "./C4ReportView";
import { D1ReportView } from "./D1ReportView";
import { D3ReportView } from "./D3ReportView";
import { D4ReportView } from "./D4ReportView";
import { P1aReportView } from "./P1aReportView";
import { P1bReportView } from "./P1bReportView";

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
  "C-1": C1ReportView,
  "C-2": C2ReportView,
  "C-3": C3ReportView,
  "C-4": C4ReportView,
  "D-1": D1ReportView,
  "D-3": D3ReportView,
  "D-4": D4ReportView,
  "A-4": A4ReportView,
  "A-5": A5ReportView,
  "P-1a": P1aReportView,
  "P-1b": P1bReportView,
  // P-2b는 C-4 페인포인트 파이프라인의 브랜드 시드 변형 — 뷰도 공유
  "P-2b": C4ReportView,
};

// 인구통계 태깅(KR 중심 커버리지)에 의존하는 코드 — KR 외 국가 선택 시 사전 경고
const DEMOGRAPHY_DEPENDENT_CODES = new Set(["A-2", "B-1"]);

// 코드별 입력 필드 구성 — 기본은 카테고리만. C-2는 자사 브랜드 필수, C-4는 선택,
// C-3는 카테고리 입력 자체가 자사 시드 키워드 역할.
const CODE_FORM: Record<
  string,
  { categoryLabel?: string; categoryPlaceholder?: string; brand?: "required" | "optional" }
> = {
  "C-2": { brand: "required" },
  "C-3": {
    categoryLabel: "자사 브랜드·제품 키워드 (여정 시드)",
    categoryPlaceholder: "예: 삼성 비스포크, 현대해상 다이렉트",
  },
  "C-4": { brand: "optional" },
  "D-3": { brand: "required" },
  "A-4": { categoryPlaceholder: "예: 냉장고, 전세대출 (검색량 큰 대표 키워드 권장)" },
  "P-1a": { categoryPlaceholder: "예: 감기약, 여행자보험" },
  "P-1b": { categoryLabel: "메인 키워드", categoryPlaceholder: "예: 테라플루, 선크림" },
  "P-2b": {
    categoryLabel: "브랜드·제품 키워드",
    categoryPlaceholder: "예: 오트리빈, 테라플루",
  },
};

export function ReportGenerateForm({ industry, code }: { industry: Industry; code: ReportCode }) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [gl, setGl] = useState<ReportGl>("kr");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<unknown | null>(null);
  const [persisted, setPersisted] = useState(true);

  const estimate = estimateForCode(code.code);
  const usesLlm = estimate.claudeUsdRange[1] > 0;
  const ReportView = REPORT_VIEWS[code.code];
  const formConfig = CODE_FORM[code.code] ?? {};

  function handleSubmitClick() {
    if (!category.trim()) {
      setError(
        formConfig.categoryLabel
          ? `${formConfig.categoryLabel}을(를) 입력해주세요.`
          : "카테고리를 입력해주세요. (예: 스킨케어, 전세대출, 다이어트 보조제)",
      );
      return;
    }
    if (formConfig.brand === "required" && !brand.trim()) {
      setError("자사 브랜드를 입력해주세요. (예: 삼성, 현대해상)");
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
        body: JSON.stringify({
          industry: industry.slug,
          reportCode: code.code,
          category: category.trim(),
          gl,
          ...(brand.trim() ? { brand: brand.trim() } : {}),
        }),
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
          {formConfig.categoryLabel ?? "카테고리"}
        </label>
        <input
          id="category"
          className="generate-form-input"
          type="text"
          placeholder={formConfig.categoryPlaceholder ?? "예: 스킨케어, 전세대출, 다이어트 보조제"}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={phase === "loading" || phase === "confirm"}
        />
      </div>
      {formConfig.brand && (
        <div className="generate-form-row">
          <label className="generate-form-label" htmlFor="brand">
            {formConfig.brand === "required" ? "자사 브랜드" : "자사/관심 브랜드 (선택)"}
          </label>
          <input
            id="brand"
            className="generate-form-input"
            type="text"
            placeholder="예: 삼성, 현대해상, 토스"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            disabled={phase === "loading" || phase === "confirm"}
          />
        </div>
      )}
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
