---
name: separate-buyers-from-browsers
description: |
  ListeningMind DaaS `keyword_info` + LLM 분류 기반 진짜 구매 신호 추출 스킬.
  키워드를 direct_brand / channel / resale / informational 4-class로 자동 분류해
  실제 구매 의도가 있는 트래픽만 분리한다.

  **반드시 이 스킬을 사용하세요:**
  - "진짜 구매자만 찾아줘" / "구매 의도 분류" / "buyer vs browser"
  - "direct_brand / channel / resale 분류"
  - "이 키워드 광고할 가치 있어?"
  - 키워드 셋이 주어지고 광고/콘텐츠 전략 분리 요청

  **출력**:
  - `intent_class_{category}.csv` — 키워드 + 4-class + 신뢰도
  - `buyer_signal_report_{category}.md` — Class별 비중 + 추천 액션
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Separate Buyers from Browsers — 구매 의도 분류

> **핵심 원칙**: 검색량의 80%는 구매 의도가 없다.
> 광고/콘텐츠 예산을 정확한 20%에 집중하려면 자동 분류가 필요하다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `keyword_info` 파라미터 공유 |

---

## 사전 확인

```
1. 분석 키워드 셋 확정 (keyword_universe 또는 광고 검색어 리포트)
2. 4-class 정의 동의:
   - direct_brand: 자사 브랜드명 직접 검색
   - channel: 쿠팡/네이버/Amazon/Costco 등 채널 키워드 포함
   - resale: 중고/번개장터/eBay used 등
   - informational: 정보 탐색 (review/how to/best)
3. LLM 신뢰도 임계값 (기본 0.7)
```

---

## STEP 1 · 키워드 셋 정의

```
입력: keyword_universe.csv 또는 광고 검색어 리포트
출력 candidate set
```

---

## STEP 2 · keyword_info로 baseline 메타 수집

```python
keyword_info(
  keywords=candidates,
  gl="us",
  data_type="all"   # cpc, competition 포함
)
# 크레딧: 10 × N
```

CPC와 competition은 분류 신호로도 활용:
- CPC ≥ $2.0 & competition=HIGH → direct_brand / channel 가능성 ↑
- CPC < $0.5 → informational 가능성 ↑

---

## STEP 3 · LLM 4-class 분류

```python
# 프롬프트 템플릿
classify_intent(
  keyword=k,
  context={
    "category": "stick vacuum",
    "brand_master": ["lg cordzero", "bissell", ...],
    "channels": ["amazon", "costco", "home depot", "walmart"],
    "resale_markers": ["used", "ebay", "refurb"]
  },
  output_schema={
    "class": "direct_brand | channel | resale | informational",
    "confidence": 0.0~1.0,
    "reason": "string"
  }
)
```

> **임계값 < 0.7 키워드는 `unclassified`로 분리** → 수동 검토.

---

## STEP 4 · Class별 통계

| Class | 비중 (LG 케이스 가정 예시) | 추천 액션 |
|-------|---------------------------|----------|
| direct_brand | 18% | 브랜드 키워드 광고 + 직판 페이지 강화 |
| channel | 24% | 채널 파트너십 + 채널별 LP |
| resale | 7% | 정품 인증 마케팅 / 보증 강조 |
| informational | 51% | SEO 콘텐츠 / FAQ / 비교 콘텐츠 |

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 키워드 · volume · cpc · competition |
| `[추정]` | 4-class 분류 결과 |
| `[가정]` | LLM 임계값 0.7 · 분류 정의 |
| `[데이터 공백]` | 신규 채널 키워드 < 6개월 학습 데이터 |

---

## 산출물

### `intent_class_{category}.csv`
```csv
keyword,volume_total,cpc,competition,class,confidence,label
lg cordzero a9 costco,420,1.85,HIGH,channel,0.92,추정
lg cordzero,4133,0.64,HIGH,direct_brand,0.94,추정
lg cordzero review,890,0.31,MEDIUM,informational,0.88,추정
used lg cordzero ebay,76,0.42,LOW,resale,0.91,추정
how to clean stick vacuum,1450,0.28,MEDIUM,informational,0.85,추정
```

### `buyer_signal_report_{category}.md`
```markdown
# Buyer Signal Report — US LG CordZero
- 총 키워드: 80 (volume 합산 16,200)
- Class 분포:
  - direct_brand: 18% [추정]
  - channel: 24% [추정]
  - resale: 7% [추정]
  - informational: 51% [추정]
- Buyer signal volume: 7,938 (49%)
- 권장 광고 집중도: channel + direct_brand에 예산 60% 이상 권장 [추정]
```

---

## 단가

- keyword_info: 10 × N credits
- LLM 분류는 자체 비용 (호스팅 LLM 또는 LMP 호출 기준)
- 100개 키워드: keyword_info 1,000 credits + LLM 비용
