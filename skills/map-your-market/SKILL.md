---
name: map-your-market
description: |
  ListeningMind DaaS `intent_finder` API 기반 시장 매핑 스킬.
  사용자가 제공한 시드 키워드(≥5)에서 출발해, 카테고리 커버리지 80% 도달까지
  자동으로 키워드를 확장하고, Blind Spot(데이터 공백 군집)을 식별한다.

  **반드시 이 스킬을 사용하세요:**
  - "신규 시장 매핑해줘" / "Map Your Market" / "키워드 유니버스 만들어줘"
  - "시드 키워드로 시장 분석 시작" / "검색 커버리지 80%"
  - "신규 카테고리 진입 전 키워드 지도"
  - 시장명 + 시드 5개 이상이 주어진 시장 분석 첫 단계 요청

  **출력**:
  - `keyword_universe_{market}.csv` — 확장된 키워드 + volume + intent
  - `coverage_report_{market}.md` — 커버리지 누적 곡선 + Blind Spot 목록
  - `cost_summary_{market}.md` — API 호출 로그 + 크레딧 소모 내역

  **단가 (LG 작업1 검증 리포트 2026.03 기준)**:
  - intent_finder: 58~208 credits/call (volume_threshold·limit·시드 수에 따라 변동)
  - 1회 시장 매핑 누적: 약 600~800 credits (5회 내외 호출)
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Map Your Market — 2시간 시장 매핑

> **핵심 원칙**: 시장은 한 번에 보이지 않는다.
> 시드 → 확장 → 검증 → 보완의 4단계를 따라가야 80% 이상 커버 가능한 키워드 우주가 완성된다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| `references/api-parameters.md` | `intent_finder` 파라미터 기준값, 응답 필드, 크레딧 계산식 |
| `examples/lg-stick-vacuum.md` | LG 작업1 실측 케이스 — 미국 스틱청소기 시장 매핑 (12 calls / 11,888 credits) |

---

## 사전 확인

```
1. 분석 시장(gl)이 단일 값으로 확정되었는가?
   → kr / us / jp 중 하나. 다국가 동시 분석 금지(국가별 별도 실행).

2. 시드 키워드 ≥ 5개 확보했는가?
   → 시드 부족 시 카테고리 커버리지 < 60% 위험 (LG 케이스 검증).

3. 영어 키워드는 모두 소문자인가?
   → API 호출 전 필수 변환.

4. 카테고리 경계(포함/제외)가 명시되었는가?
   → 모호 시 Coverage 분모가 흔들림.
```

---

## STEP 0 · 시장 경계 정의

```
[정의 템플릿]
분석 시장: {카테고리} × {국가} × {기간(1년 권장)}
포함 범위: {제품 라인업 / 기능군 / 브랜드 군}
제외 범위: {분리 카테고리 / 인접 시장} — 이유 명시
시드 키워드: {seed_1}, {seed_2}, ..., {seed_N} (N ≥ 5)
```

---

## STEP 1 · Seed 검색량 확인 (`keyword_info`)

확장 전 시드 자체가 시장에 존재하는지 먼저 검증한다.

```python
# 호출 1 — 시드 검색량 베이스라인
keyword_info(
  keywords=[seed_1, seed_2, ..., seed_N],
  gl="us",                # kr / us / jp
  data_type="all"
)
# 크레딧: 10 × N (선형)
```

**필수 확인**:
- 각 시드의 `volume_total`, `volume_trend` 존재 여부
- 데이터 부재 시드는 별도 `Blind Spot` 후보로 기록 (LG 케이스의 `roborock stick vacuum cleaner` 패턴)
- `cpc`, `competition` 값으로 광고 경쟁도 판단

---

## STEP 2 · 의도 확장 (`intent_finder`)

각 시드를 hop=1 의미 확장. 커버리지가 80%에 도달할 때까지 반복.

```python
# 호출 2 — 시드 통합 확장
intent_finder(
  keywords=[seed_1, ..., seed_N],
  gl="us",
  volume_threshold=100,   # 신생 카테고리는 50까지 완화
  limit=120,
  sort="volume_total",
  order="desc"
)
# 크레딧: 58~208 (시드 수·threshold·limit 영향)
```

**커버리지 산출**:
```
coverage = Σ(반환된 키워드 volume_total) / 시장 전체 추정 volume
```
- 시장 전체 추정 volume은 `references/api-parameters.md` 표 참조 (카테고리 규모별 추정치)
- 80% 미달 시 STEP 3으로

---

## STEP 3 · Blind Spot 보완

`intent_finder` 결과에 누락된 영역을 식별하고 추가 호출.

| 보완 트리거 | 추가 호출 패턴 |
|------------|-------------|
| 신규 브랜드 누락 | 해당 브랜드를 시드에 추가하고 재호출 (volume_threshold ↓) |
| 기능성 키워드 부족 | `volume_threshold=50` + `limit=80`으로 재호출 |
| Long-tail 누락 | 개별 시드별 단독 호출 (예: bissell만 단독) |
| exact keyword 데이터 부재 | 확장 키워드 3종 합산으로 보정 (가정 라벨 필수) |

**LG 케이스 보완 사례**:
- `roborock stick vacuum cleaner` (exact) → 데이터 부재
- 확장 3종 (`roborock stick vacuum` / `roborock cordless vacuum` / `roborock h6 cordless stick vacuum`) → 합산 ~3,380/년 (가정 라벨)

---

## STEP 4 · 4-Label 라벨링

모든 출력 수치에 라벨을 부착한다.

| 라벨 | 정의 | 예시 |
|------|------|------|
| `[실제 데이터]` | API 직접 반환값 | `volume_total=43,300` |
| `[추정]` | AI 해석 / 복수 API 결합 | "유지보수 키워드 비중 높음" |
| `[가정]` | 전제 조건 필요 | "확장 3종 합산이 카테고리 대표" |
| `[데이터 공백]` | API 미반환 / 임계치 이하 | `exact keyword 데이터 없음` |

> ⚠️ 라벨 누락은 즉시 거부 사유. 커버리지 80% 미달 시 부족 영역 명시.

---

## STEP 5 · 산출물 생성

### `keyword_universe_{market}.csv`
```csv
keyword,volume_total,volume_avg_3m,volume_trend_3m,cpc,competition,label,source_seed
lg cordzero,43300,4133,-45,0.64,HIGH,실제 데이터,lg cordzero
bissell furguard,15540,1766,-55,2.08,HIGH,실제 데이터,bissell furguard
roborock stick vacuum,1660,173,-46,1.70,-,가정,roborock stick vacuum cleaner
```

### `coverage_report_{market}.md`
```markdown
# Coverage Report — {market}
- 시드 수: N
- 확장 후 키워드 수: M
- 누적 검색량: V (연간)
- 커버리지 추정: 82% [가정: 시장 전체 추정 volume 대비]
- Blind Spot:
  - {brand_X}: exact keyword 데이터 부재 [데이터 공백]
  - {feature_Y}: volume_threshold=100 미달 [데이터 공백]
```

### `cost_summary_{market}.md`
```markdown
# Cost Summary — {market}
| # | API | 파라미터 | 크레딧 |
|---|-----|---------|--------|
| 1 | keyword_info | 5 seeds, all | 50 |
| 2 | intent_finder | 5 seeds, threshold=100, limit=120 | 208 |
| 3 | intent_finder | 추가 brand 시드 1개 | 88 |
| 합계 | | | 346 |
```

---

## 한계 및 주의사항

- 신생 카테고리(월 검색량 < 1,000)는 신뢰도 < 70% → 분석 보류 권장
- volume_trend는 조회 시점 스냅샷. 비교 분석 시 기준일 명시 필수
- 카테고리 키워드 < 100건이면 Coverage 산출 불가 → 시드 추가 필요
- 12m 과거 시점 cluster 데이터는 자주 결측 (LG 케이스 #8, #9 참조)

---

## 다음 스킬 체이닝

```
map-your-market → decode-why-people-search (의도 분류)
              → discover-hidden-sub-markets (군집 탐지)
              → see-the-full-buying-path (퍼널 분석)
```

산출된 `keyword_universe.csv`는 후속 11개 카드의 공통 입력으로 사용된다.
