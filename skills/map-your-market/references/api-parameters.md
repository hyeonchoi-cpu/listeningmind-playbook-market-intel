# intent_finder · keyword_info — API 파라미터 레퍼런스

> 본 파일은 `map-your-market` 스킬 전용 발췌본이다.
> 전체 ListeningMind DaaS API 명세는 `mi-collect/references/`를 참조한다.

---

## 1. `keyword_info`

시드 키워드의 검색량·트렌드·광고 경쟁도 베이스라인을 한 번에 조회한다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `keywords` | `string[]` | ✅ | — | 조회 키워드 배열 (소문자 변환 필수) |
| `gl` | `string` | ✅ | — | `kr` / `us` / `jp` |
| `data_type` | `string` | ❌ | `"all"` | `"all"` / `"volume_only"` / `"trend_only"` |

### 응답 핵심 필드

| 필드 | 의미 | 라벨 |
|------|------|------|
| `volume_total` | 연간 총 검색량 | `[실제 데이터]` |
| `volume_avg_3m` | 최근 3개월 월평균 | `[실제 데이터]` |
| `volume_trend_3m` | 최근 3개월 증감률(%) | `[실제 데이터]` (스냅샷 특성 명시) |
| `monthly_volume` | 월별 검색량 배열 (24~36개월) | `[실제 데이터]` |
| `cpc` | Cost-per-click (USD) | `[실제 데이터]` |
| `competition` | `HIGH` / `MEDIUM` / `LOW` + 0~100 점수 | `[실제 데이터]` |
| `f_ai_overview` | AI Overview SERP 노출 여부 (0/1) | `[실제 데이터]` |
| `f_knowledge_panel` | Knowledge Panel 노출 여부 | `[실제 데이터]` |

### 데이터 부재 신호

- `volume_total = null` 또는 응답 자체 미반환 → `[데이터 공백]` 라벨 (LG 케이스의 `roborock stick vacuum cleaner` 패턴)
- 이는 **검색량 0이 아닌 "API 집계 임계치 이하"**를 의미. 실제 매출과는 별개.

### 크레딧 계산

```
credits = 10 × len(keywords)
```

- 키워드 4개 → 40 credits (LG 케이스 #1, #7 검증)
- `data_type` 변경은 크레딧에 영향 없음

---

## 2. `intent_finder`

시드를 의미적으로 확장하여 시장 키워드 우주를 구성한다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `keywords` | `string[]` | ✅ | — | 시드 키워드 (소문자) |
| `gl` | `string` | ✅ | — | `kr` / `us` / `jp` |
| `volume_threshold` | `int` | ❌ | `100` | 반환 키워드의 최소 volume_total. 신생 시장은 50까지 완화 |
| `limit` | `int` | ❌ | `120` | 반환 최대 키워드 수 (1~200) |
| `sort` | `string` | ❌ | `"volume_total"` | `"volume_total"` / `"relevance"` |
| `order` | `string` | ❌ | `"desc"` | `"desc"` / `"asc"` |

### 응답 구조

```json
{
  "results": [
    {
      "keyword": "lg cordzero a9",
      "volume_total": 12300,
      "volume_avg_3m": 1080,
      "volume_trend_3m": -38,
      "cpc": 0.71,
      "competition": "HIGH",
      "source_seed": "lg cordzero"
    }
  ]
}
```

### 크레딧 계산식 (LG 케이스 5회 실측 기반)

```
base = 50 (호출 베이스)
per_seed = 12  (시드 1개당)
per_returned = 0.8 ~ 1.2 (반환 키워드 수에 따라)

credits ≈ base + per_seed × |seeds| + per_returned × min(limit, returned)
```

LG 케이스 실측치:
| # | 시드 수 | threshold | limit | 반환 | 크레딧 |
|---|---------|-----------|-------|------|--------|
| #3 | 4 | 100 | 120 | ~120 | 208 |
| #6 | 3 | 10 | 80 | ~60 | 96 |
| #10 | 2 | 50 | 80 | ~80 | 208 |
| #11 | 1 | 50 | 80 | ~60 | 88 |
| #12 | 3 | 10 | 40 | ~30 | 58 |

**범위 요약**: 58 ~ 208 credits/call (평균 ~132)

---

## 3. 카테고리 규모별 추정 volume (Coverage 분모용)

> [가정] 시장 전체 추정 volume은 카테고리 규모에 따라 다음 범위로 가정한다.
> 정확한 값은 카테고리별 검증 리포트로 보정 필요.

| 카테고리 규모 | 연간 추정 volume | 최소 시드 권장 | 호출 횟수 권장 |
|--------------|------------------|----------------|----------------|
| 대형 (Top 100 카테고리) | 500K ~ 5M | 8~12 | 8~12 calls |
| 중형 (Sub-vertical) | 50K ~ 500K | 5~8 | 5~8 calls |
| 소형 / 신생 | < 50K | 5~8 + threshold 완화 | 5~10 calls |

**LG 작업1 케이스**: 미국 stick vacuum = 중형. 시드 4개 + 5회 호출로 커버리지 ~82% 달성.

---

## 4. 흔한 실패 패턴

| 증상 | 원인 | 해결 |
|------|------|------|
| `results: []` | volume_threshold 과대 | threshold를 50 또는 10까지 완화 |
| 시드 중 일부 누락 | exact keyword 데이터 부재 | 확장 키워드로 보정 (가정 라벨) |
| 동일 키워드 중복 | 시드끼리 hop=2 중복 | 시드 독립성 검증 (mi-seed-design STEP 1) |
| 12m 과거 시점 결측 | cluster_finder time_point=12m 한계 | 현 시점만 비교 가능, 과거-현재 비교 보류 |

---

## 5. 호출 순서 권장 (1회 시장 매핑)

```
1. keyword_info(seeds)            → 50~80 credits  (시드 검증)
2. intent_finder(seeds)           → 200~250 credits (1차 확장)
3. (옵션) intent_finder(brand X)  → 80~100 credits (Blind Spot 보완)
4. (옵션) keyword_info(확장 결과) → 30~60 credits  (가설 검증)

총 누적: ~360 ~ 500 credits / 시장
```

> LG 작업1 (4개 brand) = 12 calls / 11,888 credits — cluster_finder 포함이라 더 큼.
> map-your-market 단독 실행은 intent_finder + keyword_info 위주로 ~500 credits 수준.
