---
name: validate-ideas-before-you-build
description: |
  ListeningMind DaaS `intent_finder` + `keyword_info` 결합 스킬.
  신제품·신사업 가설을 출시 전에 검색 수요로 정량 검증하고 PMF Score (0~100)를 산출한다.

  **반드시 이 스킬을 사용하세요:**
  - "아이디어 검증" / "PMF 측정" / "신제품 시장성"
  - "출시 전 수요 검증" / "validate before build"
  - "이 가설 시장이 있을까?" / "사업성 데이터 검증"
  - 가설 키워드 셋 + 시장 검증 요청

  **출력**:
  - `pmf_score_{idea}.md` — PMF Score + 근거 + 권장 액션
  - `demand_decomposition_{idea}.csv` — 5-Layer 분해 결과
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Validate Ideas Before You Build — PMF 사전 검증

> **핵심 원칙**: 검색량은 거짓말하지 않는다.
> 가설 키워드의 5-Layer 분해 + 볼륨/트렌드를 보면 PMF가 사전 추정 가능하다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `intent_finder` · `keyword_info` |

---

## 사전 확인

```
1. 가설 정의 (제품/기능/포지셔닝 한 문장) ✓
2. 가설 키워드 셋 ≥ 5 (제품/기능/문제 키워드)
3. 분석 시장(gl) ✓
4. 완전 신조어 여부 검증 (있으면 유사 키워드 프록시 필요)
```

---

## STEP 1 · 가설 → 키워드 매핑

```
[가설]
"펫 가구 흡입에 특화된 코드리스 스틱청소기"

[키워드 매핑]
- 직접: pet stick vacuum / pet hair cordless vacuum / dog hair vacuum
- 인접: pet vacuum reddit / best pet vacuum 2026
- 페인: pet hair carpet / cat hair sofa / dog fur stuck
```

---

## STEP 2 · keyword_info baseline

```python
keyword_info(
  keywords=hypothesis_keywords,
  gl="us",
  data_type="all"
)
# 크레딧: 10 × N
```

**Zero-volume 검증**: 모든 키워드 volume_total = null이면 시장 미존재 위험 → 가설 재정의 권장.

---

## STEP 3 · intent_finder 확장 + 5-Layer

```python
intent_finder(
  keywords=hypothesis_keywords,
  gl="us",
  volume_threshold=50,
  limit=120
)
# 크레딧: 100~250
```

5-Layer (Need → Goal → Solution → Product → Brand) 매핑:

| Layer | 가설 적합도 평가 |
|-------|----------------|
| L1 Need 존재 | 페인 키워드 검색량 ≥ 임계? |
| L2 Goal 명확 | 원하는 결과 키워드 존재? |
| L3 Solution 인지 | 해결책 카테고리 검색량? |
| L4 Product 검색 | 구체 제품 검색 패턴? |
| L5 Brand 진입 가능 | 시장 점유율 상위 빈 자리? |

---

## STEP 4 · PMF Score 산출

```
PMF Score = w_demand · DEMAND + w_growth · GROWTH + w_gap · GAP + w_intent · INTENT

- DEMAND: 가설 키워드 총 volume (대형/중형/소형/신생)
- GROWTH: 평균 trend_3m
- GAP: 카테고리 SOV 1위 브랜드와 2~3위 격차 (큰 격차 = 침투 어려움)
- INTENT: Transactional Score 평균
```

[가정] 가중치: 0.30 / 0.30 / 0.20 / 0.20

**해석**:
- 80~100: 🟢 Strong PMF → 즉시 출시 검토
- 60~79: 🟡 Validated → MVP 출시 권장
- 40~59: 🟠 Weak → 가설 수정 후 재검증
- < 40: 🔴 Insufficient → 다른 가설 탐색

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 가설 키워드 volume · trend |
| `[추정]` | 5-Layer 분해 · PMF Score |
| `[가정]` | PMF 가중치 / 임계 등급 |
| `[데이터 공백]` | zero-volume / 신조어 |

---

## 산출물

### `pmf_score_{idea}.md`
```markdown
# PMF Validation — Pet Stick Vacuum (US, 2026.03)
- 가설: 펫 특화 코드리스 스틱청소기
- 가설 키워드 수: 18 (volume 합산 27,400)
- PMF Score: 72 [추정] 🟡 Validated

## 4지표
- DEMAND: 27,400/년 (중형, score 75)
- GROWTH: +18% (score 68)
- GAP: 1위 dyson 42% vs 2위 bissell 9% (격차 큼, score 62)
- INTENT: Transactional 평균 58 (score 78)

## 권장 액션
- MVP 출시 권장. Pet 특화 메시지로 bissell vs 자사 포지셔닝.
- Dyson 대체재로 진입 어려움 → bissell 자리 견제 전략 우선.
```

### `demand_decomposition_{idea}.csv`
```csv
keyword,volume_total,growth_3m,layer,transactional_score
pet stick vacuum,4200,+22,L3 Solution,68
best pet stick vacuum 2026,1800,+45,L4 Product,82
pet hair carpet vacuum,3200,+12,L1 Need,45
```

---

## 한계 및 주의사항

- 완전 신조어는 검색 자체가 없어 검증 불가 → 유사 카테고리 프록시 키워드 사용
- 잠재 수요 ≠ 현 검색 수요 (Steve Jobs 류 신제품은 사전 검증 한계)
- B2B는 검색 의존도 낮아 신뢰도 ↓

---

## 단가

- keyword_info N keywords: 10 × N
- intent_finder 2~3 calls: ~300~500 credits
- 1건 가설 검증: ~500~1,000 credits 수준
