# cluster_finder — API 스펙

> ListeningMind DaaS 최고 단가 endpoint. 호출 전 시드 존재 검증 권장.

---

## 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `keyword` | `string` | ✅ | — | 클러스터 시드 (단일 키워드, 소문자) |
| `gl` | `string` | ✅ | — | `kr` / `us` / `jp` |
| `time_point` | `string` | ❌ | `"curr"` | `"curr"` / `"12m"` (12m은 결측 다발) |
| `hop` | `int` | ❌ | `2` | 확장 단계 (1: 인접만, 2: 권장) |
| `limit` | `int` | ❌ | `120` | 반환 노드 수 (50~200) |
| `orientation` | `string` | ❌ | `"UNDIRECTED"` | `"UNDIRECTED"` / `"DIRECTED"` |

---

## 응답 필드

| 필드 | 의미 | 라벨 |
|------|------|------|
| `rels[].keyword_a`, `keyword_b` | 페어 키워드 | `[실제 데이터]` |
| `rels[].weight` | 공동 검색 강도 (0~1) | `[실제 데이터]` |
| `rels_count` | 총 페어 수 | `[실제 데이터]` |
| `communities` | 군집 ID → 키워드 배열 | `[실제 데이터]` |
| `community_count` | 군집 수 | `[실제 데이터]` |

---

## 데이터 부재 신호

- `rels: []` & `rels_count: 0` → 시드의 공동 검색 네트워크 미형성
- 이는 검색량 0이 아닌, **상관 관계 임계치 이하**를 의미
- LG 작업1 케이스: `roborock stick vacuum cleaner` (curr) → rels=0, 0 credits

---

## 크레딧 모델 (LG 작업1 실측)

```
rels = 0           → 0 credits
rels = 50~100      → ~4,000~5,000 credits
rels = 100~150     → ~5,000~6,500 credits (LG: 121 rels → 6,200)
```

> output_count 기반 과금. rels=0 호출은 무료지만 분석 불가.

---

## time_point 주의사항

- `curr`는 안정적이지만 `12m`는 결측 빈도 높음 (LG 작업1 #8, #9 둘 다 0 credits)
- 과거-현재 비교 분석 시 항상 두 시점 모두 호출 후 결측 처리 로직 필요

---

## 흔한 실패 패턴

| 증상 | 원인 | 해결 |
|------|------|------|
| rels_count = 0 | 시드 검색량 < 임계치 | 확장 키워드로 시드 변경 |
| 모든 community 단일 노드 | hop=1 + limit 작음 | hop=2, limit=120 권장 |
| 12m 시점 결측 | API 한계 | curr만 사용, 비교 불가 명시 |
| 의미상 부적절한 군집 | UNDIRECTED 노이즈 | DIRECTED 시도 |
