---
name: see-the-full-buying-path
description: |
  ListeningMind DaaS `path_finder` 기반 구매 여정 분석 스킬.
  익명화된 검색 시퀀스를 따라 Awareness → Consideration → Decision의
  실제 구매 여정을 Markov chain으로 시각화한다.

  **반드시 이 스킬을 사용하세요:**
  - "구매 여정 분석" / "buying path" / "검색 시퀀스"
  - "Awareness → Decision funnel" / "퍼널 단계 분류"
  - "유저가 어떤 순서로 검색해?" / "여정 단계 시각화"
  - 세션 단위 분석이나 conversion path 추적 요청

  **출력**:
  - `journey_map_{category}.json` — 노드 + 엣지 (Markov chain)
  - `funnel_report_{category}.md` — 단계별 비중 + 이탈 포인트
  - `cost_summary_{category}.md` — 호출 로그
license: Internal — ListeningMind DaaS Playbook v1.0
---

# See the Full Buying Path — 구매 여정 시각화

> **핵심 원칙**: 사람은 한 번의 검색으로 사지 않는다.
> 익명화된 검색 시퀀스를 따라가면 "무엇을 알고 → 무엇을 고민하고 → 무엇을 결정했는지"의 흐름이 보인다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| `references/path-finder-spec.md` | `path_finder` 파라미터 · 응답 구조 |

---

## 사전 확인

```
1. 분석 시장(gl) 단일 확정 ✓
2. 카테고리 시드 키워드 ≥ 3 (여정 출발점)
3. 세션 윈도 정의 (기본: 30분)
4. 최소 2-쿼리 세션이 충분히 있는 카테고리인가?
   → 시드 검색량 < 1,000/월이면 경로 미생성 가능성 높음.
```

---

## STEP 1 · 카테고리 출발점 정의

```
[출발점 시드]
- 카테고리 진입 키워드 (예: "stick vacuum", "cordless vacuum")
- 브랜드 진입 키워드 (예: "lg cordzero", "bissell")
- 문제 인지 키워드 (예: "carpet dust", "pet hair")
```

---

## STEP 2 · path_finder 호출

```python
path_finder(
  seed_keywords=[seed_1, seed_2, ...],
  gl="us",
  session_window_min=30,
  funnel_stages=["awareness", "consideration", "decision"],
  min_session_length=2,
  limit=200
)
```

응답 구조:
```json
{
  "nodes": [
    { "keyword": "carpet dust", "stage": "awareness", "session_count": 1240 },
    { "keyword": "best stick vacuum 2026", "stage": "consideration", "session_count": 890 },
    { "keyword": "lg cordzero a9 costco", "stage": "decision", "session_count": 320 }
  ],
  "edges": [
    { "from": "carpet dust", "to": "best stick vacuum 2026", "weight": 0.42 },
    { "from": "best stick vacuum 2026", "to": "lg cordzero a9 costco", "weight": 0.18 }
  ]
}
```

---

## STEP 3 · Funnel 분석

각 단계별 세션 비중과 단계 간 전환율을 산출.

```
Awareness (A): {A_sessions} sessions
Consideration (C): {C_sessions} sessions (A → C 전환율: {C/A * 100}%)
Decision (D): {D_sessions} sessions (C → D 전환율: {D/C * 100}%)
```

**이탈 포인트**: 인접 단계 간 전환율 < 15% 노드 = 메시지 보강 우선순위.

---

## STEP 4 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 시퀀스 페어 · 세션 카운트 |
| `[추정]` | 퍼널 단계 분류 (LLM 보조) |
| `[가정]` | 30분 세션 윈도 · 단계 정의 |
| `[데이터 공백]` | 단일-쿼리 세션 · session_count < 임계값 |

---

## 산출물

### `journey_map_{category}.json`
위 STEP 2 응답을 그대로 저장. D3.js / Sankey 등으로 시각화 가능.

### `funnel_report_{category}.md`
```markdown
# Funnel Report — US Stick Vacuum
- Awareness: 1,240 sessions (44%)
- Consideration: 890 sessions (32%), A→C 전환 72%
- Decision: 320 sessions (11%), C→D 전환 36%
- 이탈 포인트:
  - "stick vacuum review" → 다음 단계 전환율 12% [추정 · 개선 필요]
```

---

## 한계 및 주의사항

- 세션 < 2-쿼리 사용자는 경로 미생성 → 모바일/음성 검색 비중 높은 카테고리는 신뢰도 ↓
- session_window_min 변경 시 결과 크게 달라짐. 비교 분석 시 윈도 고정
- 신생 카테고리(시드 검색량 < 1,000/월)는 의미 있는 path 생성 어려움

---

## 단가

- 1회 여정 분석: 5~10 calls (시드 그룹별)
- 단가 검증 데이터 없음 → 베타 단계 → 정식 가격 확정 후 업데이트
