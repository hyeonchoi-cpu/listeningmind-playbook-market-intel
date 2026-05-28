---
name: track-your-true-market-share
description: |
  ListeningMind DaaS `keyword_info` 기반 진짜 시장 점유율(SOV) 산출 스킬.
  브랜드 동의어를 정규화하고 Double Counting을 제거해 카테고리 내 정확한
  검색 점유율을 산출한다.

  **반드시 이 스킬을 사용하세요:**
  - "브랜드 점유율" / "SOV" / "Share of Voice"
  - "Double Counting 제거" / "브랜드 동의어 정규화"
  - "카테고리 내 우리 비중" / "경쟁사 대비 검색 점유율"
  - 브랜드 N개 + 카테고리 정의 → 점유율 비교 요청

  **출력**:
  - `sov_{category}.csv` — 브랜드별 검색량 · SOV %
  - `sov_report_{category}.md` — Double Counting 처리 내역 + 추세
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Track Your True Market Share — 정확한 SOV 산출

> **핵심 원칙**: SOV는 "검색량 합산"이 아니다.
> 동일 브랜드의 동의어/모델명/오타가 중복 카운트되면 점유율이 부풀어진다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `keyword_info` 파라미터 공유 |

---

## 사전 확인

```
1. 카테고리 경계 명시 (포함/제외) ✓
2. 비교 브랜드 N개 확정 (자사 + 경쟁사)
3. 브랜드별 동의어/모델/오타 마스터 준비
4. 분석 기간 통일 (예: 최근 12개월 누적)
```

---

## STEP 1 · 브랜드 키워드 마스터 구성

각 브랜드에 대해 모든 변형 키워드를 묶는다:

```
[브랜드 마스터 템플릿]
brand_id: "lg_cordzero"
canonical: "lg cordzero"
variants:
  - lg cordzero
  - lg cordzero a9
  - lg cordzero q3
  - lg cordzero thinq
  - cordzero a9
  - cord zero (오타)
exclude:
  - lg styler (다른 카테고리)
```

> ⚠️ exclude 누락 시 다른 카테고리 검색량까지 합산됨. 정의가 분석의 분모.

---

## STEP 2 · 브랜드별 검색량 조회

```python
keyword_info(
  keywords=brand_variants_all,  # 모든 브랜드 variants 합쳐서
  gl="us",
  data_type="volume_only"
)
# 크레딧: 10 × N(변형 키워드 총 수)
```

---

## STEP 3 · Double Counting 제거

```
brand_total[i] = SUM(volume_total of variants_i) - overlap_correction

overlap_correction:
- 두 brand variants에 중복된 키워드는 weight 가중 분배
- "lg cordzero vs dyson v15" → lg와 dyson 양쪽에 0.5 분배
```

응답에서 `cluster_finder` rels 활용 가능 — variants 간 중복 검색 패턴 자동 식별.

---

## STEP 4 · SOV 계산

```
category_total = SUM(brand_total[i] for all i) + uncategorized_volume

SOV[i] (%) = brand_total[i] / category_total × 100
```

> `uncategorized_volume`은 어느 브랜드에도 속하지 않는 카테고리 키워드 (예: "best stick vacuum 2026"). 분모에 포함 권장.

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 브랜드별 키워드 검색량 |
| `[추정]` | 동의어/오타 매칭 |
| `[가정]` | 카테고리 경계 정의 / overlap_correction 가중치 |
| `[데이터 공백]` | 신규 브랜드 등록 < 30일 |

---

## 산출물

### `sov_{category}.csv`
```csv
brand_id,canonical,variant_count,brand_total_volume,sov_pct,trend_3m,label
lg_cordzero,lg cordzero,12,68500,28.4%,-45%,실제 데이터
bissell_furguard,bissell furguard,8,15540,6.4%,-55%,실제 데이터
roborock,roborock,3,3380,1.4%,-46%,가정
dyson,dyson,15,89200,37.0%,-12%,실제 데이터
uncategorized,best/cordless/etc,—,64800,26.8%,—,실제 데이터
```

### `sov_report_{category}.md`
```markdown
# SOV Report — US Stick Vacuum (12M)
- 카테고리 총 검색량: 241,420 (uncategorized 포함)
- 브랜드 분류 비중: 73.2% (uncategorized 26.8%)
- Double Counting 보정: lg/dyson 비교 키워드 8건 → 가중 분배 적용
```

---

## 한계 및 주의사항

- PB(Private Brand) / 모호 브랜드명은 수동 매핑 필요
- 글로벌 브랜드의 로컬 변형 (예: KR 닉네임) 누락 시 SOV 과소 계상
- 카테고리 경계가 SOV 분모의 핵심 — 분석 시 명시 필수

---

## 단가

- 브랜드 N개 × 평균 5~15 variants → 약 N × 60~150 credits
- 5개 브랜드 비교: ~500~750 credits
- 주간 갱신 시 월 ~3,000 credits
