import type { BrandRow } from "@/types";
import { LabelBadge } from "./LabelBadge";

/** C-1·C-2 공용 브랜드 지형 테이블 — 점유율은 항상 "검색량 기준 근사" 주석과 함께 렌더 */
export function BrandTable({ brands, showAliases = true }: { brands: BrandRow[]; showAliases?: boolean }) {
  return (
    <div>
      <div className="cross-table-wrap">
        <table className="cross-table">
          <thead>
            <tr>
              <th>브랜드</th>
              <th>키워드 수</th>
              <th>볼륨 합</th>
              <th>점유율 (근사)</th>
              <th>가중 트렌드</th>
              <th>상위 키워드</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.name} className={b.isOurs ? "ours-row" : undefined}>
                <th>
                  {b.name}
                  {b.isOurs && <span className="persona-chip ours-chip">자사</span>}
                  {showAliases && <div className="brand-alias-line">{b.aliases.join(" · ")}</div>}
                </th>
                <td>{b.keywordCount}</td>
                <td>
                  {b.totalVolume.basis === "missing" ? "—" : b.totalVolume.value.toLocaleString()}{" "}
                  <LabelBadge basis={b.totalVolume.basis} />
                </td>
                <td>
                  {b.sharePct.basis === "missing" ? "—" : `${b.sharePct.value}%`} <LabelBadge basis={b.sharePct.basis} />
                </td>
                <td>
                  {b.weightedTrend.basis === "missing"
                    ? "—"
                    : `${b.weightedTrend.value >= 0 ? "+" : ""}${Math.round(b.weightedTrend.value * 1000) / 10}%`}{" "}
                  <LabelBadge basis={b.weightedTrend.basis} />
                </td>
                <td className="brand-kw-cell">{b.topKeywords.map((k) => k.keyword).join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="estimate-box-note" style={{ marginTop: 8 }}>
        점유율은 감지된 브랜드의 검색량 합 기준 근사이며 실제 판매·가입 점유율이 아닙니다. 매칭은 브랜드별
        별칭(한/영/축약{showAliases ? ", 표 안에 표시" : ""}) 부분 문자열 기준이고, 단독 기업명 쿼리(예: &ldquo;삼성&rdquo; 단독)와
        비소비 맥락(주식·취업 등) 키워드는 집계에서 제외했습니다(가정).
      </p>
    </div>
  );
}
