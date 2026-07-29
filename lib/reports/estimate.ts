// 생성 전 비용/시간 안내 — §8 결정 6. 실제 크레딧은 카테고리 규모에 따라 크게 달라져 생성 전에는
// 알 수 없으므로, data/cards.ts에 이미 기록된 실측 참고 사례(cluster_finder hop=2 기준 0~6,200
// credits 등)를 근거로 한 "가정(assumption)" 범위다. 정확한 값은 생성 완료 후 리포트의 costLog에서
// 확인한다 — 이 추정치를 실측처럼 표기하지 않는다.
export type ReportEstimate = {
  daasCreditsRange: [number, number];
  claudeUsdRange: [number, number];
  secondsRange: [number, number];
  note: string;
};

const COMMON_NOTE =
  "카테고리 규모(연관 키워드 수)에 따라 실제 값은 이 범위 밖일 수 있습니다. 정확한 소비량은 생성 완료 후 비용 로그에서 확인하세요.";

// cluster_finder(hop=2, limit=5000) + keyword_info 전체 배치 + Claude 분류 — B-1/A-3 공통 호출 형태
const CLUSTER_PIPELINE_ESTIMATE: ReportEstimate = {
  daasCreditsRange: [3000, 8000],
  claudeUsdRange: [0.05, 0.3],
  secondsRange: [30, 90],
  note: COMMON_NOTE,
};

// 메인 키워드 1개 keyword_info 조회만 — LLM 없음
const SINGLE_KEYWORD_ESTIMATE: ReportEstimate = {
  daasCreditsRange: [10, 60],
  claudeUsdRange: [0, 0],
  secondsRange: [3, 15],
  note: "메인 키워드 1개의 keyword_info 조회만 사용하는 저비용 리포트입니다. " + COMMON_NOTE,
};

const ESTIMATES: Record<string, ReportEstimate> = {
  "A-1": SINGLE_KEYWORD_ESTIMATE,
  "A-2": {
    ...SINGLE_KEYWORD_ESTIMATE,
    note:
      "메인 키워드 1개의 keyword_info 조회만 사용하는 저비용 리포트입니다. 단, 인구통계 태깅은 KR 중심 커버리지라 다른 국가는 데이터가 없을 수 있습니다.",
  },
  "A-3": CLUSTER_PIPELINE_ESTIMATE,
  "B-1": CLUSTER_PIPELINE_ESTIMATE,
  "C-1": CLUSTER_PIPELINE_ESTIMATE,
  "C-2": CLUSTER_PIPELINE_ESTIMATE,
  "C-3": {
    daasCreditsRange: [100, 5000],
    claudeUsdRange: [0, 0],
    secondsRange: [10, 40],
    note:
      "path_finder는 베타 엔드포인트라 단가 편차가 큽니다(위 범위는 가정). 시드 검색량이 월 1,000 미만이면 여정 데이터가 비어 실패할 수 있습니다. " +
      COMMON_NOTE,
  },
  "C-4": CLUSTER_PIPELINE_ESTIMATE,
};

export function estimateForCode(code: string): ReportEstimate {
  return ESTIMATES[code] ?? CLUSTER_PIPELINE_ESTIMATE;
}
