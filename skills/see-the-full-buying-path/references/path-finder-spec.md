# path_finder — API 스펙

> 본 endpoint는 베타 단계. 단가·SLA는 정식 출시 시 확정.

---

## 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `seed_keywords` | `string[]` | ✅ | — | 여정 출발점 키워드 (≥3) |
| `gl` | `string` | ✅ | — | `kr` / `us` / `jp` |
| `session_window_min` | `int` | ❌ | `30` | 세션 그룹핑 윈도 (분 단위, 15~60) |
| `funnel_stages` | `string[]` | ❌ | `["awareness","consideration","decision"]` | 분류 단계 정의 |
| `min_session_length` | `int` | ❌ | `2` | 분석 대상 최소 쿼리 수 |
| `limit` | `int` | ❌ | `200` | 반환 노드 수 |

---

## 응답 필드

| 필드 | 의미 | 라벨 |
|------|------|------|
| `nodes[].keyword` | 시퀀스에 등장한 키워드 | `[실제 데이터]` |
| `nodes[].stage` | 퍼널 단계 (LLM 분류) | `[추정]` |
| `nodes[].session_count` | 해당 노드를 거친 세션 수 | `[실제 데이터]` |
| `edges[].from` / `to` | 시퀀스 페어 | `[실제 데이터]` |
| `edges[].weight` | 전환 확률 (Markov) | `[실제 데이터]` |

---

## 데이터 부재 신호

- 응답 `nodes: []` → 카테고리 검색 시퀀스 부족. 시드 검색량 < 1,000/월 의심
- 특정 단계 노드 수 < 5 → 해당 단계 분석 신뢰도 < 70%

---

## 흔한 실패 패턴

| 증상 | 원인 | 해결 |
|------|------|------|
| nodes 매우 적음 | 시드 검색량 부족 | 시드 추가 또는 카테고리 확대 |
| 단계 분포 비정상 | LLM 분류 임계값 문제 | `funnel_stages`를 카테고리 맞춤 (예: B2B는 5단계) |
| 페어 weight 극소값 | 세션 window 과대 | `session_window_min` 15분으로 축소 |
