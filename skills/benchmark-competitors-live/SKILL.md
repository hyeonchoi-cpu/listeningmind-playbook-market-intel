---
name: benchmark-competitors-live
description: |
  ListeningMind DaaS `keyword_info` 기반 경쟁 브랜드 실시간 벤치마크 스킬.
  주간 갱신으로 N개 경쟁 브랜드의 검색 수요·트렌드·메시지 변화를 추적해
  포지셔닝 갭을 찾는다.

  **반드시 이 스킬을 사용하세요:**
  - "경쟁사 벤치마크" / "competitor benchmark" / "라이브 모니터링"
  - "포지셔닝 갭" / "메시지 변화 추적"
  - "주간 SOV 변화" / "경쟁사 트렌드 비교"
  - 자사 + 경쟁 브랜드 N개 → 주간/일간 비교 요청

  **출력**:
  - `benchmark_{period}.csv` — 브랜드별 주간 지표
  - `gap_alert_{period}.md` — 갭 변화 경고 + 메시지 키워드 추세
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Benchmark Competitors Live — 실시간 경쟁 벤치마크

> **핵심 원칙**: 시장 점유율은 매일 움직인다.
> 분기 리포트로는 늦다. 주간 단위로 갱신되는 라이브 벤치마크가 필요하다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `keyword_info` 파라미터 |
| [`../track-your-true-market-share/SKILL.md`](../track-your-true-market-share/SKILL.md) | SOV 산출 로직 공유 |

---

## 사전 확인

```
1. 비교 브랜드 N개 + 자사 1개 ✓
2. 브랜드별 동의어 마스터 (track-your-true-market-share 산출물 재사용)
3. 추적 지표 정의 (기본: volume, trend, sov, message_share)
4. 갱신 주기 (주간 / 일간)
```

---

## STEP 1 · 브랜드 마스터 재사용

`track-your-true-market-share` 스킬의 brand_master를 입력으로 활용:

```yaml
brands:
  - id: us_us
    canonical: "lg cordzero"
    variants: [lg cordzero, lg cordzero a9, ...]
  - id: bissell
    canonical: "bissell furguard"
    variants: [bissell furguard, bissell powerclean furguard, ...]
  - id: dyson
    canonical: "dyson v15"
    variants: [dyson v15, dyson v15 detect, ...]
```

---

## STEP 2 · 주간 시계열 수집

```python
keyword_info(
  keywords=all_brand_variants,
  gl="us",
  data_type="all"
)
# 주간 cron → 10 × N credits / week
```

---

## STEP 3 · 핵심 지표 산출

| 지표 | 의미 | 산출 |
|------|------|------|
| `volume_wk` | 주간 검색량 | sum(variants) |
| `trend_wow` | 전주 대비 변화 | (this - prev) / prev |
| `sov_wk` | 주간 SOV | volume_wk[i] / Σ volume_wk |
| `message_share` | 메시지 키워드 점유 | 카테고리 핵심 modifier 출현 빈도 |

> `message_share` 예: "best", "review", "vs", "deal" 등 modifier별 브랜드 점유율.

---

## STEP 4 · 갭 변화 탐지

전주 대비 다음 시그널이 발생하면 알림:

| 알림 트리거 | 임계값 |
|------------|-------|
| SOV 변화 | ±2.0%p 이상 |
| Trend 변화 | ±20% 이상 |
| 신규 메시지 키워드 | 자사 미사용 modifier 등장 |
| 경쟁사 메시지 키워드 변화 | 새 modifier가 SOV 5% 이상 차지 |

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | 브랜드 검색량 · message 키워드 |
| `[추정]` | 정규화 분모 · 메시지 분류 |
| `[가정]` | 카테고리 경계 / 알림 임계값 |
| `[데이터 공백]` | 라이브 데이터 ~24h 지연 |

---

## 산출물

### `benchmark_{week}.csv`
```csv
week,brand_id,volume_wk,trend_wow,sov_wk,message_share
2026-W12,lg_cordzero,8200,-0.04,18.2%,12.5%
2026-W12,bissell_furguard,4100,+0.08,9.1%,8.7%
2026-W12,dyson_v15,18900,+0.02,42.0%,35.1%
```

### `gap_alert_{week}.md`
```markdown
# Gap Alert — Week 2026-W12
## SOV 변화
- bissell_furguard: +2.4%p (8.7 → 9.1) 🟢
- lg_cordzero: -1.8%p (20.0 → 18.2) 🔴

## 신규 경쟁 메시지
- "pet hair" modifier가 bissell_furguard에서 SOV 7% 차지 (전주 미사용)
- 자사 대응: pet hair 콘텐츠/광고 검토 필요
```

---

## 한계 및 주의사항

- 라이브 데이터 ~24h 지연 정상. 일간 비교는 노이즈 큼 → 주간 권장
- 글로벌 브랜드의 로컬 변형 매핑 누락 시 갭 왜곡

---

## 단가

- 브랜드 N개 × 평균 10 variants = 10N variants
- 주간 갱신: 10 × 10N = 100N credits / week
- 5개 브랜드: ~500 credits/주, ~2,000 credits/월
