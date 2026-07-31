---
name: compare-markets-across-countries
description: |
  ListeningMind DaaS `keyword_info` 다국가 비교 스킬.
  KR · US · JP 동일 카테고리를 정규화된 인덱스로 비교해 한국 트렌드의
  타국가 전이 가능성을 평가한다.

  **반드시 이 스킬을 사용하세요:**
  - "한국 트렌드 미국에서도 될까?" / "다국가 비교"
  - "KR US JP 비교" / "글로벌 확장 검증" / "cross-country"
  - "동일 카테고리 시장별 차이"
  - 카테고리 + 다국가 비교 요청

  **출력**:
  - `cross_country_{category}.csv` — 국가별 정규화 인덱스 + 4지표
  - `transferability_report_{category}.md` — 전이 가능성 점수 + 시기 추정
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Compare Markets Across Countries — KR/US/JP 동일 척도 비교

> **핵심 원칙**: 검색량의 절대값으로는 국가 비교 불가.
> 시장 규모로 정규화한 인덱스 + 동의어 매핑이 필요하다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `keyword_info` 파라미터 |

---

## 사전 확인

```
1. 카테고리 정의 통일 (3개국 동일 경계)
2. 동의어 매핑 마스터 — 국가별 표현 차이 처리
   예: "stick vacuum" (US) / "무선청소기" (KR) / "コードレス掃除機" (JP)
3. 분석 기간 통일 (12개월 권장)
4. 문화 의존 키워드 분리 (명절/시즌)
```

---

## STEP 1 · 카테고리 동의어 마스터 구성

```yaml
category: stick_vacuum
synonyms:
  kr: [무선청소기, 스틱청소기, 무선 스틱청소기, 무선 진공청소기]
  us: [stick vacuum, cordless vacuum, cordless stick vacuum]
  jp: [コードレス掃除機, スティック掃除機, ハンディクリーナー]
exclude:
  - 로봇청소기 / robot vacuum / ロボット掃除機 (다른 카테고리)
```

> ⚠️ 한 단어가 다른 카테고리를 의미할 수 있음 — exclude 명시 필수.

---

## STEP 2 · 국가별 검색량 수집

```python
# 3번 호출 (국가별)
for gl in ["kr", "us", "jp"]:
  keyword_info(
    keywords=synonyms[gl],
    gl=gl,
    data_type="all"
  )
# 크레딧: 10 × N(synonyms) × 3 (국가)
```

---

## STEP 3 · 정규화 인덱스 산출

절대값 비교 불가. 시장 규모(인구·구매력)로 정규화:

```
volume_normalized[country] = SUM(volume_total) / population_in_millions

또는

volume_index[country] = volume_total / category_baseline_volume[country]
```

`category_baseline_volume`은 인접 베이스라인 카테고리(예: "vacuum cleaner") 검색량을 기준점으로.

---

## STEP 4 · 4지표 동일 척도 비교

| 지표 | 산출 | 해석 |
|------|------|------|
| `normalized_volume` | 위 정규화 인덱스 | 시장 침투도 |
| `trend_3m` | 최근 3개월 변화 | 성장 속도 |
| `cpc_index` | CPC / 카테고리 평균 CPC | 광고 경쟁도 |
| `seasonal_pattern` | 12개월 패턴 corr | 시즌성 유사도 |

---

## STEP 5 · 전이 가능성 (Transferability) 산출

```
Transferability[from → to] =
  w_growth · (trend_from - trend_to_lag6m) +
  w_pattern · seasonal_corr +
  w_gap · (saturation_to - saturation_from)
```

[가정] 가중치: 0.40 / 0.30 / 0.30

**해석**:
- ≥ 70: 강한 전이 신호 (6개월 후 follow 가능)
- 40~70: 부분 전이 (현지화 필요)
- < 40: 문화/맥락 의존 (전이 어려움)

---

## STEP 6 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 국가별 검색량 · CPC · trend |
| `[추정]` | 동의어 매핑 · 정규화 인덱스 |
| `[가정]` | 분모 (인구/베이스라인) · 가중치 |
| `[데이터 공백]` | JP 일부 카테고리 < 90일 데이터 |

---

## 산출물

### `cross_country_{category}.csv`
```csv
country,canonical_keyword,volume_total,normalized_volume,trend_3m,cpc_index
kr,무선청소기,82000,12.4,+18%,0.85
us,stick vacuum,180000,5.6,+8%,1.10
jp,コードレス掃除機,42000,4.1,+12%,0.92
```

### `transferability_report_{category}.md`
```markdown
# Cross-Country Transferability — Stick Vacuum
## KR → US
- KR 성장률 +18%, US 6개월 lag +8% → 강한 전이 신호 [추정]
- Transferability Score: 76 → 6개월 내 US trend 가속 예상

## KR → JP
- 시즌 패턴 corr 0.42 → 부분 전이
- 일본 특유의 ハンディクリーナー(handheld) 선호 — 현지화 필요
```

---

## 한계 및 주의사항

- 문화 의존 키워드 (명절, 시즌 특화)는 동등 비교 불가 → 별도 분리
- JP 일부 카테고리는 90일 미만 데이터 → 신뢰도 저하 명시 필수
- 인구/베이스라인 정규화는 가정. 절대 기준 아님

---

## 단가

- 국가당 keyword_info N개 → 10 × N credits
- 3개국 × 10 키워드: 300 credits
- 카테고리 전체 비교 시 ~500~1,500 credits
