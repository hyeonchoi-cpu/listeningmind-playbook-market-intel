import Link from "next/link";
import type { IndustrySlug, ReportGl } from "@/types";
import { relatedFor, CODE_TERMS } from "@/data/report-codes";

/**
 * 연관 분석 카드 — 유저 플로우 4단계 (카탈로그 → 상세 → 생성 → 연관 제안).
 * LM Material 리포트 카드 아나토미: [코드+용어배지] → [질문 두괄] → [왜 이 분석이 다음인가].
 * 현재 입력값(카테고리·국가·자사 브랜드)을 쿼리 파라미터로 승계해, 클릭 시 같은 조건으로
 * 상세 페이지 폼이 프리필된다 — 재입력 없이 분석을 이어간다.
 */
export function RelatedCards({
  currentCode,
  industry,
  inputs,
}: {
  currentCode: string;
  industry: IndustrySlug;
  inputs: { category: string; gl: ReportGl; brand?: string };
}) {
  const related = relatedFor(currentCode);
  if (related.length === 0) return null;

  const qs = new URLSearchParams({ category: inputs.category, gl: inputs.gl });
  if (inputs.brand) qs.set("brand", inputs.brand);

  return (
    <div className="related-section">
      <div className="related-title">
        다음으로 볼 분석
        <span className="related-sub">
          — &ldquo;{inputs.category}&rdquo; 입력값을 그대로 이어서 생성합니다
        </span>
      </div>
      <div className="related-grid">
        {related.map(({ code, reason }) => (
          <Link
            key={code.code}
            href={`/industries/${industry}/${code.code}?${qs.toString()}`}
            className="related-card"
          >
            <div className="related-card-top">
              <span className="report-card-code">{code.code}</span>
              {CODE_TERMS[code.code] && <span className="lm-term">{CODE_TERMS[code.code]}</span>}
            </div>
            <div className="related-card-q">{code.title}</div>
            <div className="related-card-reason">{reason}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
