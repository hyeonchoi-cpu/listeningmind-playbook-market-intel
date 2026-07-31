---
name: discover-hidden-sub-markets
description: |
  ListeningMind DaaS `cluster_finder` 기반 니치 세그먼트 발굴 스킬.
  카테고리 키워드 코퍼스를 HDBSCAN으로 군집화해 숨어 있는 sub-market과
  Blind Spot을 자동 탐지한다.

  **반드시 이 스킬을 사용하세요:**
  - "숨은 시장 찾아줘" / "니치 세그먼트 발굴" / "hidden sub-market"
  - "클러스터 분석" / "cluster_finder" / "HDBSCAN"
  - "카테고리 안에 어떤 군집이 있어?"
  - 브랜드 키워드 1개 → 연관 키워드 네트워크 추출 요청

  **출력**:
  - `clusters_{seed}.json` — 군집 ID + 키워드 + rels
  - `cluster_report_{seed}.md` — 군집별 테마 + 비중 + Blind Spot
  - `cost_summary_{seed}.md` — 호출 로그 (rels=0 케이스 명시)
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Discover Hidden Sub-Markets — 니치 세그먼트 발굴

> **핵심 원칙**: 시장은 단일이 아니다.
> 검색 키워드의 공동 출현(co-search) 그래프를 군집화하면 카테고리 내부의 sub-market이 드러난다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| `references/cluster-finder-spec.md` | `cluster_finder` 파라미터 · 응답 구조 · 크레딧 모델 |
| `examples/lg-cluster-analysis.md` | LG 작업1 실측 케이스 (#2 lg cordzero 6,200 / #4 bissell furguard 4,950 / #5 roborock 0) |

---

## 사전 확인

```
1. 시드 키워드 1개 확정 (브랜드/제품/기능 중 하나)
2. 분석 시장(gl) 단일 확정 ✓
3. hop 결정: 1(인접만) / 2(2단계 확장, 권장)
4. exact keyword 존재 검증 (keyword_info 사전 호출 권장)
   → rels=0 반환은 과금 0이지만 분석 불가
```

---

## STEP 0 · 시드 존재 검증 (옵션, 권장)

```python
keyword_info(keywords=[seed], gl="us", data_type="volume_only")
# 크레딧: 10
# volume_total = null이면 STEP 1 호출 전 시드 변경 권장
```

---

## STEP 1 · cluster_finder 호출

```python
cluster_finder(
  keyword=seed,
  gl="us",
  time_point="curr",          # "12m" 동시 호출 시 과거 비교
  hop=2,
  limit=120,
  orientation="UNDIRECTED"
)
# 크레딧: rels 존재 시 4,950~6,200 / rels=0이면 0
```

응답:
```json
{
  "rels": [
    { "keyword_a": "lg cordzero", "keyword_b": "lg cordzero a9", "weight": 0.87 }
  ],
  "communities": {
    "0": ["lg cordzero a9", "a949", "a925", "a931"],
    "1": ["lg cordzero battery", "battery replacement", "battery not charging"]
  },
  "rels_count": 121,
  "community_count": 41
}
```

---

## STEP 2 · 군집 테마 라벨링

각 community에 대해 LLM 보조로 테마 라벨 부여:

| Community ID | 테마 후보 | 키워드 수 | 라벨 신뢰도 |
|--------------|-----------|----------|-----------|
| 0 | 모델/제품군 | 12 | 0.94 |
| 1 | 유지보수/부품 | 9 | 0.91 |
| 2 | 비교/경쟁 | 5 | 0.83 |
| 3 | 채널/구매 | 4 | 0.79 |
| 4 | 정보탐색/리뷰 | 6 | 0.88 |

> **테마 신뢰도 < 0.7** → `[추정]` 라벨로 명시.

---

## STEP 3 · Blind Spot 탐지

| Blind Spot 유형 | 식별 방법 | 처리 |
|----------------|---------|------|
| 시드 자체 rels=0 | `rels_count == 0` | `[데이터 공백]` 라벨 + 확장 키워드 보정 시도 |
| 단일 노드 community | `community_count == rels_count` | LLM 임계값 완화 (limit 증가) |
| 12m 과거 시점 결측 | `time_point=12m` 결과 없음 | 과거-현재 비교 보류, 현 시점만 사용 |

---

## STEP 4 · 4-Label 라벨링

| 라벨 | 본 스킬 적용 |
|------|-------------|
| `[실제 데이터]` | rels · communities · weight |
| `[추정]` | 군집 테마 라벨 (LLM) |
| `[가정]` | HDBSCAN 최소 군집 크기 = 5 |
| `[데이터 공백]` | rels=0 / 12m 결측 |

---

## 산출물

### `clusters_{seed}.json`
STEP 1 응답 + 테마 라벨 + 신뢰도 추가:
```json
{
  "seed": "lg cordzero",
  "gl": "us",
  "communities": [
    { "id": 0, "theme": "모델/제품군", "confidence": 0.94, "keywords": ["lg cordzero a9", ...] }
  ]
}
```

### `cluster_report_{seed}.md`
```markdown
# Cluster Report — lg cordzero (US)
- rels 수: 121 [실제 데이터]
- community 수: 41 [실제 데이터]
- 핵심 테마: 모델/제품군 / 유지보수/부품 / 비교/경쟁 / 채널/구매 / 정보탐색
- Blind Spot: time_point=12m 데이터 부재 [데이터 공백]
```

---

## 한계 및 주의사항

- 카테고리 키워드 < 100건이면 군집 형성 어려움
- hop=2는 노이즈 증가. 시드 독립성 검증 필수
- rels=0 케이스는 분석 불가 (LG 작업1 #5 roborock 패턴)

---

## 단가 (LG 작업1 검증)

| 호출 | rels | 크레딧 |
|------|------|--------|
| lg cordzero (curr) | 121 | 6,200 |
| bissell furguard (curr) | 96 | 4,950 |
| roborock stick vacuum cleaner (curr) | 0 | 0 |
| 12m 과거 시점 (lg/bissell) | 0 | 0 |

**범위 요약**: rels 존재 시 4,950~6,200/call · rels=0이면 0
