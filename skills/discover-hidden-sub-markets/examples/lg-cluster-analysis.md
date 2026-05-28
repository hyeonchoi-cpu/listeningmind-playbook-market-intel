# 실전 케이스 — LG 작업1: 미국 스틱청소기 클러스터 분석

> 본 케이스는 ListeningMind DaaS 작업1 검증 리포트(2026.03)에서 발췌한 cluster_finder 실제 호출 결과다.

---

## 입력

| 항목 | 값 |
|------|-----|
| 분석 시장 (`gl`) | `us` |
| 시드 (3종 + 12m 과거 2회) | `lg cordzero` / `bissell furguard` / `roborock stick vacuum cleaner` |
| `hop` | `2` |
| `limit` | `120` |
| `orientation` | `UNDIRECTED` |

---

## API 호출 로그

| # | 시드 | time_point | rels | community | 크레딧 |
|---|------|-----------|------|-----------|--------|
| #2 | lg cordzero | curr | 121 | 41 | **6,200** |
| #4 | bissell furguard | curr | 96 | 7 | **4,950** |
| #5 | roborock stick vacuum cleaner | curr | **0** | {} | **0** |
| #8 | bissell furguard | 12m | 0 | {} | 0 |
| #9 | lg cordzero | 12m | 0 | {} | 0 |
| **합계** | | | | | **11,150** |

---

## 결과 — LG CordZero 클러스터 (rels=121, 41 communities)

| Community 테마 | 키워드 예시 |
|---------------|-----------|
| 모델/제품군 | `a949`, `a925`, `a931`, `a926ksm`, `a916bm`, `a9k`, `a913`, `q3`, `thinq`, `charge plus`, `all-in-one` |
| 유지보수/부품 | `battery`, `battery replacement`, `battery charger`, `battery not charging`, `filter`, `replacement parts`, `attachments`, `carpet head`, `auto empty` |
| 비교/경쟁 | `lg cordzero a9 vs dyson v15`, `lg cordzero vs dyson v15` |
| 채널/구매 | `lg cordzero costco`, `lg cordzero home depot` |
| 정보탐색 | `lg cordzero review`, `reddit` 관련 다수 |

**해석 [추정]**: 성숙기 시장의 전형적 분포 — 유지보수/부품 비중 높음 = 기존 사용자 중심.

---

## 결과 — Bissell FurGuard 클러스터 (rels=96, 7 communities)

| Community 테마 | 키워드 예시 |
|---------------|-----------|
| 제품 라인업 | `bissell powerclean furguard`, `powerclean furguard deluxe`, `280w`, `cordless stick vacuum`, `bissell powerclean furguard rechargeable cordless pet vacuum 4137` |
| 비교 (핵심) | `bissell furfinder vs furguard`, `bissell furguard vs furfinder`, `bissell furguard vs dyson v8`, `dyson vs bissell for pet hair reddit`, `bissell iconpet edge vs dyson v10 reddit` |
| 리뷰/정보탐색 | `bissell furguard review`, `review reddit`, `280w review`, `bissell powerclean furguard reviews youtube reddit` |
| 채널 | `bissell furfinder vs furguard costco`, `bissell cordless stick vacuum costco`, `bissell powerclean furguard costco` |
| 유지보수 | `bissell furguard battery`, `bissell powerclean furguard battery`, `bissell furguard parts`, `bissell furguard manual` |

**해석 [추정]**: 신규 진입 브랜드의 전형 — 비교 키워드 클러스터가 가장 큼 (Dyson 11개 이상 비교 키워드).

---

## 결과 — Roborock (rels=0, Blind Spot)

```
rels: []
rels_count: 0
communities: {}
크레딧: 0
```

**[데이터 공백]** Roborock의 미국 stick vacuum 검색 네트워크는 현재 매우 제한적.
보정 분석으로 intent_finder 확장 (#6, #12) 호출 — 3개 확장 키워드만 반환 (1,660 / 1,560 / 160 검색량).

> **시사점**: Roborock 브랜드의 미국 인지도는 로봇청소기 중심. stick vacuum 카테고리 검색 생태계는 미형성 [추정].

---

## Cost Summary

| Phase | API | Calls | Credits |
|-------|-----|-------|---------|
| 현 시점 클러스터 | cluster_finder | 3 | 11,150 |
| 과거 시점 (12m) | cluster_finder | 2 | 0 |
| **cluster_finder 누적** | | **5** | **11,150** |
| (참고) intent_finder 보완 | intent_finder | 5 | 658 |
| (참고) keyword_info 시드 검증 | keyword_info | 2 | 80 |
| **전체 작업1 누적** | | **12** | **11,888** |

---

## 핵심 시사점

1. **rels=0 발견 자체가 가치**: 보정 분석으로 진로 변경 가능 (Roborock → 확장 키워드 + intent_finder)
2. **12m 시점 결측은 흔함**: 과거-현재 비교 불가능한 경우가 다수. 분석 설계 시 사전 고려 필요.
3. **community 수의 의미**: LG 41개 vs Bissell 7개 = 성숙기 vs 진입기 시장 구조 차이 [추정]
4. **단가 최적화**: rels=0이면 0 credits → 사전 keyword_info(10 credits) 호출로 위험 회피 가능
