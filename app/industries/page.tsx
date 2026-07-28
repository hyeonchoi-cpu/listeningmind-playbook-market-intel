import { TopNav } from "@/components/TopNav";
import { IndustryCard } from "@/components/IndustryCard";
import { industries } from "@/data/industries";
import { reportCodes } from "@/data/report-codes";

export const metadata = {
  title: "인더스트리별 마켓 인텔리전스 · ListeningMind Playbook",
  description: "업권을 선택해 lima-agents 표준 리포트 카탈로그를 확인하세요.",
};

const implementedCount = reportCodes.filter((r) => r.status === "implemented").length;

export default function IndustriesPage() {
  return (
    <>
      <TopNav />
      <section className="page" id="industries">
        <div className="cover-topbar">
          <div className="cover-brand">
            <div className="cover-brand-logo" />
            <div className="cover-brand-name">
              ListeningMind <span className="sep">/</span>
              <span className="pill-text">Market Intelligence Playbook</span>
            </div>
          </div>
          <div className="cover-actions">
            <span className="pill">
              <span className="pill-dot" />
              {implementedCount}/{reportCodes.length} 리포트 코드 구현됨
            </span>
            <span className="pill">Phase 1 · 목업</span>
          </div>
        </div>

        <div className="mock-banner">
          <strong>목업 데이터 안내</strong> — 이 카탈로그는 정보 구조 검증용 Phase 1입니다. 실제 리포트 생성 파이프라인(DaaS
          호출 + 실시간 LLM 분류)은 Phase 2에서 연결됩니다.
        </div>

        <div className="cover-eyebrow">For Enterprise · 업권별</div>
        <h1 className="cover-title" style={{ fontSize: 52, marginBottom: 16 }}>
          업권을 선택하면<br />
          <span className="grad">표준 리포트 카탈로그</span>가 열립니다
        </h1>
        <p className="cover-sub" style={{ marginBottom: 48 }}>
          lima-agents 7 표준잡 + 6개 버티컬 오버레이(화장품·건기식·은행·카드·보험·증권)의 페르소나·엔티티사전·컴플라이언스
          가드레일을 업권별로 미리 확인하세요.
        </p>

        <div className="industry-grid">
          {industries.map((ind) => (
            <IndustryCard key={ind.slug} industry={ind} />
          ))}
        </div>

        <div className="foot" style={{ marginTop: 40 }}>
          <span>lima-agents · listeningmind-universal · 6 vertical overlays</span>
          <span>Total {industries.length} industries · {reportCodes.length} report codes</span>
        </div>
      </section>
    </>
  );
}
