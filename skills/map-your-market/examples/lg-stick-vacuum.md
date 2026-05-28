# 실전 케이스 — LG 작업1: 미국 스틱청소기 시장 매핑

> 본 케이스는 ListeningMind DaaS 작업1 검증 리포트(2026.03)에서 발췌한 실제 API 호출 결과다.
> 모든 수치는 4-Label 정책에 따라 라벨링되어 있다.

---

## 사용자 원문 요청

> 미국 시장 기준, 최근 1년간 lg cordzero, lg a9, bissell furguard, roborock stick vacuum cleaner 관련 키워드의 검색량 추이를 분석하고, 신규 브랜드 및 기능성 키워드가 포함된 클러스터를 추출해줘.

## 입력

| 항목 | 값 |
|------|-----|
| 분석 시장 (`gl`) | `us` |
| 분석 기간 | 최근 1년 (2025-03 ~ 2026-02) |
| 시드 키워드 | `lg cordzero`, `lg a9`, `bissell furguard`, `roborock stick vacuum cleaner` |
| 카테고리 | Stick Vacuum (Cordless) |

---

## API 호출 로그 (intent_finder 부분만 발췌)

| # | 시드 | threshold | limit | 반환 | 크레딧 |
|---|------|-----------|-------|------|--------|
| #3 | 4 seeds 전체 | 100 | 120 | ~120 | 208 |
| #6 | roborock 확장 3종 | 10 | 80 | 3 | 96 |
| #10 | lg cordzero, lg a9 | 50 | 80 | ~80 | 208 |
| #11 | bissell furguard | 50 | 80 | ~60 | 88 |
| #12 | roborock 3종 재확인 | 10 | 40 | ~30 | 58 |
| **누적** | | | | | **658** |

> ※ #5는 cluster_finder 호출 — `roborock stick vacuum cleaner`에 rels=0 반환 → 0 credits

---

## 단계별 결과

### STEP 1 — keyword_info 시드 검증 (40 credits)

| 키워드 | 연간 총 검색량 | 월평균 (3M) | 3M 증감률 | CPC | 라벨 |
|--------|----------------|-------------|-----------|-----|------|
| lg cordzero | 43,300 | 4,133 | ▼ -45% | $0.64 | [실제 데이터] |
| bissell furguard | 15,540 | 1,766 | ▼ -55% | $2.08 | [실제 데이터] |
| lg a9 | 5,450 | 396 | ▼ -55% | $0.87 | [실제 데이터] |
| roborock stick vacuum cleaner | N/A | N/A | N/A | - | [데이터 공백] |

**핵심 발견**:
- `roborock stick vacuum cleaner` (exact) → API 미반환 → Blind Spot 식별
- `bissell furguard` → 2025-05 첫 발생, 신규 브랜드 패턴 (5월 이전 monthly_volume = 0)
- `lg cordzero` → 2022년 33,100/월 피크 → 현재 ~4,000/월, 성숙기 진입

### STEP 2 — intent_finder 1차 확장 (208 credits)

```python
intent_finder(
  keywords=["lg cordzero", "lg a9", "bissell furguard", "roborock stick vacuum cleaner"],
  gl="us",
  volume_threshold=100,
  limit=120,
  sort="volume_total",
  order="desc"
)
```

반환 키워드 ~120개. 클러스터 자동 분류 결과:
- 모델/제품군: `a949`, `a925`, `a931`, `a926ksm`, `q3`, `thinq`, `charge plus`, `all-in-one`
- 유지보수: `battery replacement`, `filter`, `parts`, `auto empty`
- 비교: `lg cordzero vs dyson v15`, `bissell furguard vs furfinder`
- 채널: `lg cordzero costco`, `lg cordzero home depot`

### STEP 3 — Blind Spot 보완 (242 credits, 호출 3회)

`roborock stick vacuum cleaner` exact 데이터 부재 → 확장 시도:

```python
intent_finder(
  keywords=["roborock stick vacuum", "roborock cordless vacuum", "roborock h6 cordless stick vacuum"],
  gl="us",
  volume_threshold=10,    # 임계치 완화
  limit=80
)
```

확장 키워드 검색량 [실제 데이터]:
| 확장 키워드 | 연간 총 | 월평균 | 3M 증감률 |
|------------|---------|--------|-----------|
| roborock stick vacuum | 1,660 | 173 | -46% |
| roborock cordless vacuum | 1,560 | 160 | -33% |
| roborock h6 cordless stick vacuum | 160 | 16 | 0% |

**[가정]** 확장 3종 합산 ~3,380/년 = Roborock의 stick vacuum 카테고리 참고 수준.
중복 검색 가능성·미포함 표현으로 시장 전체 수요를 완전 대표하지 않음.

---

## Coverage 산출

```
시드 4종 누적 volume: 43,300 + 5,450 + 15,540 + 3,380(가정) = 67,670 [실제 + 가정]
intent_finder 확장 후 누적: ~82,000 [추정]
시장 추정 전체 volume: ~100,000 (중형 카테고리 가정)

Coverage ≈ 82% [가정]
```

> [가정] 시장 전체 추정 volume은 카테고리 규모 기반 추정치이며 정확한 보정 필요.

---

## 최종 산출물

### keyword_universe_us_stick_vacuum.csv (발췌)

```csv
keyword,volume_total,volume_avg_3m,volume_trend_3m,cpc,competition,label,source_seed
lg cordzero,43300,4133,-45,0.64,HIGH,실제 데이터,lg cordzero
bissell furguard,15540,1766,-55,2.08,HIGH,실제 데이터,bissell furguard
lg a9,5450,396,-55,0.87,HIGH,실제 데이터,lg a9
roborock stick vacuum,1660,173,-46,1.70,-,실제 데이터,roborock 확장
roborock cordless vacuum,1560,160,-33,-,-,실제 데이터,roborock 확장
roborock h6 cordless stick vacuum,160,16,0,-,-,실제 데이터,roborock 확장
roborock stick vacuum cleaner,,,,,,데이터 공백,seed
```

### Blind Spot 목록

- Roborock exact keyword (`roborock stick vacuum cleaner`) → API 집계 임계치 이하 [데이터 공백]
- Pet-care 기능성 키워드 → bissell furguard 클러스터에서만 등장 (LG·Roborock에서 미발견) [추정]

---

## Cost Summary

| Phase | API | Calls | Credits |
|-------|-----|-------|---------|
| Seed 검증 | keyword_info | 2 | 80 |
| 1차 확장 | intent_finder | 1 | 208 |
| Blind Spot 보완 | intent_finder | 3 | 242 |
| 재확인 | intent_finder | 1 | 208 |
| **Map Your Market 단독 누적** | | **7** | **738** |
| (참고) cluster_finder 포함 전체 작업1 | cluster_finder | 5 | 11,150 |
| **전체 작업1 누적** | | **12** | **11,888** |

> **시사점**: Map Your Market 만 단독 수행 시 약 700~800 credits.
> 후속 카드(cluster_finder 등) 체이닝 시 작업1 수준의 11K~12K credits 규모로 증가.

---

## 라벨링 원칙 (재확인)

| 라벨 | 본 케이스 적용 예 |
|------|------------------|
| `[실제 데이터]` | volume_total · cpc · monthly_volume |
| `[추정]` | 클러스터 분류 · 비교 키워드 그룹핑 |
| `[가정]` | 확장 3종 합산이 카테고리 대표 / Coverage 분모 추정 |
| `[데이터 공백]` | exact keyword 미반환 / 12m 과거 cluster 결측 |
