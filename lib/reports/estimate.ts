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

export function estimateB1(): ReportEstimate {
  return {
    daasCreditsRange: [3000, 8000],
    claudeUsdRange: [0.05, 0.3],
    secondsRange: [30, 90],
    note:
      "카테고리 규모(연관 키워드 수)에 따라 실제 값은 이 범위 밖일 수 있습니다. 정확한 소비량은 생성 완료 후 비용 로그에서 확인하세요.",
  };
}
