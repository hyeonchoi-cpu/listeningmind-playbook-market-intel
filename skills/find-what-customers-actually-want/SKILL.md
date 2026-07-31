---
name: find-what-customers-actually-want
description: |
  ListeningMind DaaS `cluster_finder` + `intent_finder` 결합 스킬.
  제품 카테고리 키워드를 Feature(기능) / Attribute(속성) / Pain(불편) 3축으로 분해해
  PM 로드맵 우선순위를 데이터 기반으로 결정한다.

  **반드시 이 스킬을 사용하세요:**
  - "고객이 진짜 원하는 기능" / "Voice of Customer" / "VOC"
  - "feature / attribute / pain 분해" / "제품 로드맵 우선순위"
  - "어떤 기능을 만들어야 해?" / "PM 의사결정 데이터"
  - 제품 카테고리 + 로드맵 결정 요청

  **출력**:
  - `voc_decomposition_{product}.csv` — 3축 분류 + 검색 볼륨/트렌드
  - `roadmap_priority_{product}.md` — Top N 기능 + 근거
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Find What Customers Actually Want — 3축 VOC 분해

> **핵심 원칙**: 고객은 "기능"을 검색하지 않는다.
> 검색은 Feature(기능 요청) · Attribute(원하는 속성) · Pain(불편 호소) 3축으로 나타난다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `intent_finder` 파라미터 |
| [`../discover-hidden-sub-markets/references/cluster-finder-spec.md`](../discover-hidden-sub-markets/references/cluster-finder-spec.md) | `cluster_finder` 파라미터 |

---

## 사전 확인

```
1. 제품 시드 키워드 1~3 ✓
2. 카테고리 정의 명시 (B2C 권장, B2B는 신뢰도 ↓)
3. 분석 시장(gl) 단일 ✓
4. 신제품 < 3개월이면 데이터 부족 가능
```

---

## STEP 1 · 카테고리 클러스터 수집

```python
cluster_finder(
  keyword=product_seed,
  gl="us",
  time_point="curr",
  hop=2,
  limit=120,
  orientation="UNDIRECTED"
)
# 크레딧: 4,950~6,200 (rels 존재 시)
```

→ communities 단위로 키워드 그룹 확보.

---

## STEP 2 · intent_finder 의도 확장

```python
intent_finder(
  keywords=[product_seed, top_community_keywords],
  gl="us",
  volume_threshold=50,
  limit=120
)
# 크레딧: 100~250
```

→ 검색 볼륨 + 트렌드 + CPC가 포함된 풍부한 키워드 풀.

---

## STEP 3 · 3축 분류 (LLM)

각 키워드를 Feature / Attribute / Pain 중 하나로 분류:

| 축 | 정의 | 키워드 예시 |
|----|------|-----------|
| **Feature** (기능) | "auto empty", "thinq", "wet dry", "self cleaning" |
| **Attribute** (속성) | "lightweight", "quiet", "long battery", "280w" |
| **Pain** (불편) | "battery not charging", "filter clogged", "too heavy" |

> **분류 임계값 < 0.7** → `unclassified`로 분리.

**Pain 패턴 인식**:
- negation 마커: "not working", "doesn't", "problem"
- 부정 형용사: "too heavy", "loud", "bad battery"

---

## STEP 4 · 우선순위 스코어

각 축의 각 키워드에 대해:

```
Priority Score = log(volume) × growth_3m × (1 + cpc_normalized) × cluster_size_weight
```

- volume: 시장 크기
- growth_3m: 트렌드 (양수일수록 ↑)
- cpc: 광고주 관심도 (간접 수요 신호)
- cluster_size_weight: 같은 군집 키워드 수 (군집 크기 클수록 ↑)

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 키워드 · volume · trend · cluster rels |
| `[추정]` | Feature/Attribute/Pain 분류 · Priority Score |
| `[가정]` | LLM 임계값 0.7 · Pain negation 패턴 |
| `[데이터 공백]` | 신제품 < 3개월 / B2B 카테고리 |

---

## 산출물

### `voc_decomposition_{product}.csv`
```csv
keyword,volume_total,growth_3m,cpc,axis,axis_confidence,priority_score,label
lg cordzero battery not charging,480,0.62,0.71,Pain,0.92,8.4,추정
lg cordzero auto empty,1100,0.34,1.20,Feature,0.89,11.7,추정
lg cordzero lightweight,680,0.18,0.55,Attribute,0.85,7.2,추정
```

### `roadmap_priority_{product}.md`
```markdown
# Roadmap Priority — LG CordZero (US, 2026.03)
## Pain Top 3 (즉시 해결 필요)
1. battery not charging — Score 8.4 (480/월) [추정]
2. filter clogged — Score 6.9 (340/월) [추정]
3. too heavy after refill — Score 5.2 (210/월) [추정]

## Feature Top 3 (개발 우선순위)
1. auto empty — Score 11.7 (1,100/월) [추정]
2. wet dry mode — Score 9.8 (760/월) [추정]
3. thinq integration — Score 8.5 (590/월) [추정]
```

---

## 한계 및 주의사항

- B2B 카테고리는 검색량 작아 신호 약함 — 인터뷰 등 정성 보완 필요
- Pain은 negation 인식 정확도 의존. 도메인 어휘 학습 필요
- 신제품 < 3개월은 검색 패턴 미형성 — 유사 제품 프록시 활용 권장

---

## 단가

- cluster_finder 1회 + intent_finder 2~3회 + LLM 분류
- 제품당 약 5,500~6,800 credits + LLM 비용
- 분기 1회 갱신 권장 (월간은 cluster_finder 비용 부담)
