---
name: decode-why-people-search
description: |
  ListeningMind DaaS `intent_finder` 기반 의도 분해 스킬.
  키워드 뒤의 진짜 검색 의도를 5-Layer (Need → Goal → Solution → Product → Brand)로
  분해하고 informational ↔ transactional 스코어를 산출한다.

  **반드시 이 스킬을 사용하세요:**
  - "이 키워드 의도가 뭐야?" / "왜 검색하는지 분석해줘"
  - "5-Layer 분해" / "구매 의도 스코어링" / "informational vs transactional"
  - "의도 funnel 분석" / "유저가 진짜 원하는 것"
  - 키워드 셋이 주어지고 의도/동기 분석이 필요할 때

  **출력**:
  - `intent_layers_{seed}.csv` — 5-Layer 분류 결과
  - `intent_score_{seed}.md` — informational/transactional 스코어 + 라벨링
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Decode Why People Search — 의도 5-Layer 분해

> **핵심 원칙**: 검색어는 행동이지만, 그 뒤의 의도는 5층 구조다.
> Need(불편) → Goal(원하는 결과) → Solution(해결책 유형) → Product(구체 제품) → Brand(특정 브랜드).

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `intent_finder` 파라미터 공유 |

---

## 사전 확인

```
1. 분석 시장(gl) 단일 확정 ✓
2. 분석 대상 키워드 셋(시드 그룹) ≥ 1 ✓
3. 5-Layer 적용 가능한 카테고리인가?
   → B2C 소비재 / 서비스 적용 우수. B2B 산업재는 신뢰도 < 70%.
4. 키워드는 소문자인가? ✓
```

---

## STEP 1 · 시드 그룹 정의

5-Layer 분해 대상이 될 시드 그룹을 묶는다.

```
[그룹 템플릿]
시드 그룹명: {예: "lg cordzero 사용자"}
키워드: [lg cordzero, lg a9, ...]
가설 의도: {예: "성숙기 사용자의 유지보수 수요"}
```

---

## STEP 2 · intent_finder 확장 → 5-Layer 매핑

```python
intent_finder(
  keywords=[seed_1, ..., seed_N],
  gl="us",
  volume_threshold=50,  # 의도 신뢰도 70% 이상 보장
  limit=80,
  sort="volume_total",
  order="desc"
)
# 크레딧: 58~208/call
```

반환된 키워드를 5-Layer로 분류:

| Layer | 정의 | 키워드 예시 |
|-------|------|-----------|
| L1 Need | 근본 불편/필요 | "carpet dust", "pet hair" |
| L2 Goal | 원하는 결과 | "clean fast", "no cord" |
| L3 Solution | 해결책 유형 | "cordless vacuum", "stick vacuum" |
| L4 Product | 구체 제품/모델 | "stick vacuum 280w" |
| L5 Brand | 특정 브랜드 | "lg cordzero a9", "bissell furguard" |

> **분류 가이드**: LLM 보조 분류. 임계값 < 0.7이면 `[추정]` 라벨로 명시.

---

## STEP 3 · Intent Score 산출

각 키워드의 **Transactional Score** (0~100) 산출:

```
Transactional Score = w_modifier · MOD + w_brand · BR + w_price · PR + w_review · REV

- MOD: "buy", "best", "review" 등 거래 modifier 출현
- BR: 브랜드명 포함 여부 (Layer 5)
- PR: 가격/할인 키워드 ("cheap", "deal", "costco")
- REV: 리뷰/비교 키워드 ("vs", "review", "reddit")
```

**해석**:
- 70 이상 → 구매 직전 단계
- 30~70 → 비교 검토 단계 (Consideration)
- 30 미만 → 정보 탐색 단계 (Awareness)

---

## STEP 4 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 키워드 출현 · volume_total |
| `[추정]` | 5-Layer 분류 · Transactional Score |
| `[가정]` | 5-Layer 모델 자체 · 스코어 가중치 |
| `[데이터 공백]` | 신조어 24h 이내 (분류 불가) |

---

## 산출물

### `intent_layers_{seed}.csv`
```csv
keyword,volume_total,layer,layer_confidence,transactional_score,label
lg cordzero battery,2800,L4 Product,0.91,55,추정
lg cordzero a9 vs dyson v15,1200,L5 Brand,0.95,72,추정
carpet dust solution,650,L1 Need,0.78,18,추정
```

### `intent_score_{seed}.md`
```markdown
# Intent Score Report — lg cordzero
- 분석 키워드 수: 80
- 평균 Transactional Score: 47 [추정]
- Funnel 분포:
  - Awareness (< 30): 22%
  - Consideration (30~70): 51%
  - Decision (≥ 70): 27%
```

---

## 단가

- intent_finder 1~3 calls 권장 (시드 그룹별 재확인)
- 시드 그룹 1개당 약 100~250 credits
- LG 검증 케이스: lg 2개 시드 → 208 credits, bissell 1개 시드 → 88 credits
