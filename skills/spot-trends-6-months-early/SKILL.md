---
name: spot-trends-6-months-early
description: |
  ListeningMind DaaS `keyword_info` 시계열 기반 초기 트렌드 탐지 스킬.
  성장률·가속도·지속성·확산 폭 4지표로 경쟁사보다 6개월 빠른 신호를 포착한다.

  **반드시 이 스킬을 사용하세요:**
  - "트렌드 신호 탐지" / "6개월 먼저 발견" / "early signal"
  - "성장 가속도" / "WoW 분석" / "신생 키워드 감지"
  - "확산 폭 측정" / "시즌성 보정"
  - 주간 검색량 시계열 기반 신호 탐색 요청

  **출력**:
  - `trend_signals_{category}.csv` — 4지표 스코어 + 신호 등급
  - `trend_alert_{category}.md` — Top N 키워드 + 6개월 예측 신호
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Spot Trends 6 Months Early — 초기 트렌드 탐지

> **핵심 원칙**: 트렌드는 검색량이 아니라 가속도다.
> WoW 성장률만 보면 늦는다. 2차 미분(가속도) + 지속성 + 확산 폭을 함께 봐야 6개월 빠르다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | `keyword_info` 파라미터 공유 |

---

## 사전 확인

```
1. 카테고리 키워드 후보 ≥ 50 (트렌드 후보군)
2. 시계열 윈도 ≥ 12주 (12주 미만은 가속도 산출 불가)
3. 시즌성 키워드 분리 — 시즌 보정 옵션 적용 권장
4. 분석 시장(gl) 단일 확정 ✓
```

---

## STEP 1 · 키워드 후보 풀 정의

map-your-market 결과(keyword_universe)에서 출발:
```
후보 풀 = keyword_universe.csv WHERE volume_total > 100
```

---

## STEP 2 · 주간 시계열 조회

```python
keyword_info(
  keywords=[k1, k2, ..., kN],
  gl="us",
  data_type="trend_only"   # monthly_volume 배열 위주
)
# 크레딧: 10 × N
```

응답의 `monthly_volume` 배열 (24~36개월) 또는 주간 데이터를 사용.

---

## STEP 3 · 4지표 스코어링

각 키워드에 대해:

| 지표 | 산출 공식 | 가중치 [가정] |
|------|----------|--------------|
| 성장률 (Growth) | `(v_now - v_4w_ago) / v_4w_ago` | 0.30 |
| 가속도 (Accel) | `2nd diff of weekly volume` | 0.35 |
| 지속성 (Persist) | 연속 4주 이상 양의 성장 카운트 | 0.20 |
| 확산 (Spread) | 공동검색 키워드 수 변화율 | 0.15 |

```
Trend Score = Σ(w_i · normalize(metric_i))   # 0~100
```

**신호 등급**:
- ≥ 80: 🚨 Early Signal (6개월 선행 가능)
- 60~80: ⚠️ Emerging
- 40~60: ➡️ Steady
- < 40: ↘️ Declining

---

## STEP 4 · 시즌성 위양성 필터

가짜 양성(false positive) 차단:

```
seasonality_score = correlation(current 4w, same period last year)
IF seasonality_score > 0.7 → 시즌성 키워드로 분류, Early Signal에서 제외
```

> 시즌 키워드는 `seasonal_flag = true`로 별도 분류. Halloween/Black Friday 등.

---

## STEP 5 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | monthly_volume 배열 |
| `[추정]` | 4지표 스코어 / 신호 등급 분류 |
| `[가정]` | 가중치 0.30/0.35/0.20/0.15 / 시즌 임계값 0.7 |
| `[데이터 공백]` | 시계열 < 12주 |

---

## 산출물

### `trend_signals_{category}.csv`
```csv
keyword,volume_total,growth,accel,persist,spread,trend_score,signal,seasonal
pet hair carpet vacuum,3200,0.42,0.18,5,0.27,82,Early Signal,false
bissell furguard,15540,0.31,0.05,8,0.19,67,Emerging,false
christmas vacuum gift,1200,0.78,0.62,2,0.15,71,Emerging,true
```

### `trend_alert_{category}.md`
```markdown
# Trend Alert — US Stick Vacuum (2026.03)
## 🚨 Early Signals (Top 3)
1. pet hair carpet vacuum — Score 82 [추정]
2. cordless wet dry vacuum — Score 79 [추정]
3. self emptying stick vacuum — Score 75 [추정]
```

---

## 단가

- N개 키워드 동시 조회 시 10 × N credits (선형)
- 100개 후보 풀 분석: 1,000 credits 수준
- 주간 갱신 시 월 4,000 credits 예상
