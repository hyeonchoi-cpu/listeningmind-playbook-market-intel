# Major Korean Appliance Brand 미국 스틱청소기 클러스터 분석

> 자동 추출본 — `lg-us-stick-vacuum` (2026-03)  
> 익명화 적용. 원본은 사내 보관 (verification-reports/).

## 본문

AI 응답 데이터 검증 리포트
작업 1 | 미국 Stick Vacuum 시장 | 검색량 추이 및 키워드 클러스터 분석
Version 1.0 | 2026.03 | ListeningMind DaaS
1. 사용자 원문 요청
미국 시장 기준, 최근 1년간
brand-a cordless, brand-a a9, brand-b furguard, Brand C stick vacuum cleaner
관련 키워드의 검색량 추이를 분석하고, 신규 브랜드 및 기능성 키워드가 포함된 클러스터를 추출해줘.
키워드별 검색량과 브랜드 언급 빈도, 기능별 키워드군을 함께 정리하고, 시장 성장 신호를 추정해주는 인사이트도 제시해줘.
2. API 호출 요약
3. 분석 결과
3.1 키워드별 검색량 [실제 데이터]
※ volume_total·volume_avg·volume_trend는 API 직접 반환값 [실제 데이터]
※ Brand C 확장 3종 합산(~3,380)은 seed keyword 부재 보정치 [가정]
3.2 주요 발견 사항
① Bissell FurGuard — 신규 진입 브랜드 [실제 데이터]
2025년 5월 이전 monthly_volume 전체 0 → 2025-05 첫 발생(170건) → 2025-11 피크 3,600 → 2026-02 1,600. CPC $2.08은 분석 대상 중 최고값.
② Brand A CordZero — 성숙 시장 진입 [실제 데이터 + 추정]
2022-03 33,100/월 → 2026-02 3,600으로 하락. cluster_finder 커뮤니티에서 battery / parts / filter 등 유지보수 키워드 비중 높음 [추정].
③ Roborock — exact keyword 데이터 부재 [실제 데이터]
cluster_finder rels=0, communities={} 확인. 확장 3종(Brand C stick vacuum / Brand C cordless vacuum / Brand C h6 cordless stick vacuum) 합산 연간 약 3,380건으로 Brand A CordZero 대비 약 1/13 수준 [가정].
④ 시장 성장 신호 [추정]
Bissell FurGuard의 급격한 신규 등장은 pet-care 기능성 stick vacuum 세그먼트 성장 신호로 해석 가능. Dyson 비교 키워드가 LG·Bissell 클러스터 모두에서 등장 [추정].
4. 실제 API 호출 로그 및 과금 내역
※ 크레딧 0 호출(#8, #9)은 12m 과거 시점 cluster_finder로 rels=0 반환 — output_count=0 과금 없음 [실제]
※ 실제 데이터: API 직접 반환값 / 추정: AI 해석·복수 API 결합 / 가정: 전제 조건 필요 항목
Appendix
플랫폼 : Claude
AI 답변 원본
사용자 요청 질문
미국 시장 기준, 최근 1년간 brand-a cordless, brand-a a9, brand-b furguard, Brand C stick vacuum cleaner 관련 키워드의 검색량 추이를 분석하고, 신규 브랜드 및 기능성 키워드가 포함된 클러스터를 추출해줘. 키워드별 검색량과 브랜드 언급 빈도, 기능별 키워드군을 함께 정리하고, 시장 성장 신호를 추정해주는 인사이트도 제시해줘.
미국 Stick Vacuum 시장 키워드 분석 답변
분석 기준: 미국(US) | 최근 1년간 | 2026년 3월 기준
분석 대상 키워드: brand-a cordless, brand-a a9, brand-b furguard, Brand C stick vacuum cleaner
데이터 출처: ListeningMind DaaS API (실제 API 호출 결과)
표기 원칙: [실제 데이터] = API 직접 반환값 | [추정] = AI 해석 또는 복수 API 결합값
1. 키워드별 검색량 현황 [실제 데이터]
⚠️ 주의: Brand C stick vacuum cleaner는 keyword_info API에서 데이터가 반환되지 않았습니다. 이는 해당 exact keyword의 실제 미국 검색량이 API 집계 임계치 이하임을 의미합니다 [실제 확인]. 아래 Roborock 보정 분석 참조.
2. 월별 검색량 추이 분석 [실제 데이터]
Brand A CordZero (brand-a cordless)
연간 총 검색량: 43,300 (12개월 합산)
피크: 2022년 3월 (33,100) → 현재 수준 약 3,600~4,400/월
추이: 2022년 중반 이후 장기 하락세. 2025년 11월 일시 반등(6,600) 후 2026년 1~2월 4,400→3,600 수준
특징: AI Overview SERP 노출 확인 (f_ai_overview=1), Sitelinks 존재 → 브랜드 인지도 확립된 성숙 키워드
Brand A A9 (brand-a a9)
연간 총 검색량: 5,450
추이: 2022~2023년 1,000~1,300/월 수준에서 지속 하락, 2025년 이후 320~480/월 수준
특징: Knowledge Panel 노출(f_knowledge_panel=1). 정보탐색(I) + 구매(T) 혼재 인텐트
Bissell FurGuard (brand-b furguard) ⭐ 신규 브랜드
연간 총 검색량: 15,540
첫 검색량 발생: 2025년 5월 (170건) [실제 확인]
성장 추이 [실제 데이터]:
2025-05: 170 → 2025-06: 590 → 2025-07: 1,600 → 2025-08: 880
2025-09: 1,000 → 2025-10: 2,400 → 2025-11: 3,600 (피크)
2025-12: 2,400 → 2026-01: 1,300 → 2026-02: 1,600
특징: 2025년 5월 이전 전체 monthly_volume = 0 [실제 확인]. CPC $2.08로 분석 대상 중 최고 → 광고 경쟁 치열
Roborock (보정 분석)
보정 배경 [실제 확인]:
Brand C stick vacuum cleaner → keyword_info 데이터 없음, cluster_finder rels/communities 모두 없음
확장 키워드 검색량 [실제 데이터]:
⚠️ 가정: 확장 키워드 합산치(~3,380)는 Brand C stick vacuum 카테고리의 참고 수준이며, 중복 검색 가능성 및 미포함 표현 존재로 시장 전체 수요를 완전히 대표하지 않습니다.
3. 브랜드별 클러스터 및 키워드군 분석
3.1 Brand A CordZero 클러스터 [실제 데이터]
cluster_finder 호출 결과: 121개 관계(rels), 41개 커뮤니티
주요 클러스터 테마:
① 모델/제품군 키워드
brand-a cordless a9 kompressor / a949 / a925 / a931 / a926ksm / a916bm / a9k / a913
brand-a cordless q3 / brand-a cordless thinq / brand-a cordless charge plus / brand-a cordless all-in-one
② 유지보수/부품 키워드 (intent_finder 61개 결과 기반)
brand-a cordless battery / battery replacement / battery charger / battery not charging
brand-a cordless filter / replacement parts / attachments / carpet head / auto empty
③ 비교/경쟁 키워드
brand-a cordless a9 vs Premium Brand v15 / brand-a cordless vs Premium Brand v15
④ 채널/구매 키워드
brand-a cordless costco / brand-a cordless home depot
⑤ 정보탐색 키워드
brand-a cordless review / reddit 관련 다수
3.2 Bissell FurGuard 클러스터 [실제 데이터]
cluster_finder 호출 결과: 96개 관계, 7개 커뮤니티
주요 클러스터 테마:
① 제품 라인업 키워드
Brand B powerclean furguard / powerclean furguard deluxe / 280w / cordless stick vacuum
Brand B powerclean furguard rechargeable cordless pet vacuum 4137
② 비교 키워드 (핵심)
Brand B furfinder vs furguard / brand-b furguard vs furfinder
Brand B powerclean furguard vs furfinder
brand-b furguard vs Premium Brand v8 / Premium Brand vs Brand B for pet hair reddit
Brand B iconpet edge vs Premium Brand v10 reddit
③ 리뷰/정보탐색
brand-b furguard review / review reddit / 280w review
Brand B powerclean furguard reviews youtube reddit
④ 채널 키워드
Brand B furfinder vs furguard costco / Brand B cordless stick vacuum costco
Brand B powerclean furguard costco
⑤ 유지보수
brand-b furguard battery / Brand B powerclean furguard battery
brand-b furguard parts / brand-b furguard manual
3.3 Roborock 클러스터 [실제 데이터 + 가정]
[실제 확인] cluster_finder: Brand C stick vacuum cleaner → rels 0, communities {} (완전 없음)
[실제 확인] intent_finder(확장 3개 키워드, threshold=10) → 3개 키워드만 반환됨
확인된 키워드:
Brand C stick vacuum
Brand C cordless vacuum
Brand C h6 cordless stick vacuum
[가정] Roborock의 미국 시장 stick vacuum 검색 네트워크는 현재 매우 제한적입니다. 이는 Roborock이 미국 소비자에게 주로 로봇 청소기 브랜드로 인식되며, stick vacuum 카테고리에서의 검색 생태계가 아직 형성되지 않았음을 시사합니다. 단, 이는 stick vacuum 제품의 실제 판매량과는 별개의 검색 데이터 관점의 해석입니다.
4. 브랜드 언급 빈도 분석 [추정]
Dyson 언급 빈도 (비교 기준 브랜드로서의 등장):
[추정] Dyson은 미국 stick vacuum 시장에서 가장 강력한 비교 기준 브랜드로 기능합니다. 특히 Bissell FurGuard 클러스터에서 Dyson 비교 키워드가 집중적으로 등장하는 것은 Bissell이 Dyson 대체재로서의 포지셔닝을 적극적으로 공략받고 있음을 시사합니다 [추정].
5. 기능별 키워드군 [실제 데이터 기반, 분류는 추정]
유지보수/소모품 군
brand-a cordless battery / battery replacement / filter / replacement parts / attachments / auto empty
Brand B powerclean furguard battery / parts / manual
제품 비교 군
brand-a cordless vs Premium Brand v15 / brand-a cordless a9 vs Premium Brand v15
Brand B furfinder vs furguard / furguard vs furfinder
brand-b furguard vs Premium Brand v8 / Premium Brand vs Brand B for pet hair
구매 채널 군
brand-a cordless costco / Brand B furfinder vs furguard costco / Brand B powerclean furguard costco
제품 정보탐색 군
brand-b furguard review / brand-a cordless review / reddit 관련 다수
펫케어 특화 군 (Bissell 특징)
Premium Brand vs Brand B for pet hair / Brand B cordless vacuum pet / Brand B poweredge pet vacuum
6. 시장 성장 신호 추정 [추정]
[추정] 아래 내용은 API 실제 데이터를 근거로 AI가 정성 해석한 결과입니다. 단일 API 반환 수치가 아닌 복수 데이터 결합 해석임을 명시합니다.
신호 1: Bissell FurGuard - 신규 고성장 브랜드 진입 [근거: 실제 monthly_volume]
2025년 5월 첫 검색량 발생 후 약 6개월만에 월 3,600 수준 도달 [실제 데이터]
CPC $2.08 → 광고주들의 높은 관심도를 반영 [실제 데이터]
클러스터 7개 커뮤니티 형성, Dyson 비교 키워드 다수 → 시장 진입기 특유의 포지셔닝 경쟁 활발 [추정]
신호 2: Brand A CordZero - 성숙 시장, 유지보수 수요 중심 전환 [근거: intent_finder 결과]
검색량 장기 하락세 지속 (2022년 33,100/월 → 2026년 약 3,600~4,400/월) [실제 데이터]
battery / filter / parts / repair 등 유지보수 키워드 비중 높음 → 기존 사용자 중심 시장으로 전환 [추정]
volume_trend -45% → 신규 고객 유입보다 기존 고객 유지 단계로 진입했을 가능성 [추정]
신호 3: Roborock - Stick Vacuum 카테고리 검색 생태계 미형성 [근거: 실제 API 호출 결과]
exact keyword 데이터 없음, 클러스터 없음 (실제 확인)
확장 3개 키워드 합산 약 3,380/년 수준으로 Brand A CordZero(43,300)와 약 13배 차이 [실제 데이터, 가정 포함]
[추정] Roborock 브랜드의 미국 stick vacuum 인지도가 아직 낮거나, 다른 카테고리(로봇청소기) 중심으로 검색이 집중될 가능성
신호 4: Costco 채널 공통 등장 [근거: cluster_finder + intent_finder 결과]
Brand A CordZero와 Bissell FurGuard 모두 Costco 관련 키워드 클러스터에 등장 [실제 데이터]
[추정] Costco는 미국 premium/value 코드리스 진공청소기의 핵심 오프라인 채널로 기능하는 것으로 보임
7. 분석 한계 및 주의사항
Roborock 데이터 공백: Brand C stick vacuum cleaner의 keyword_info 및 cluster_finder 결과 없음. 확장 키워드 보정치는 가정에 기반하며 완전한 시장 대표성을 보장하지 않음 [실제 확인]
volume_trend 스냅샷 특성: 조회 시점(2026년 3월) 기준 최근 3개월 증감률이며, 조회 시점마다 기준 월이 변동됨. -55% 등의 수치는 해당 스냅샷 시점 기준값임 [실제 데이터]
cluster_finder time_point=12m 결과 없음: Brand A CordZero, Bissell FurGuard 모두 12개월 전 클러스터 데이터 없음 [실제 확인]. 과거-현재 클러스터 비교 불가
Bissell FurGuard의 volume_trend -55%: 신규 브랜드 특성상 초기 급성장 후 안정화 과정으로 해석 가능하나 확정적 판단은 불가 [추정]
브랜드 언급 빈도: 정량적 API 필드(count)가 아닌, cluster_finder/intent_finder 결과 내 키워드 출현 수를 정성적으로 집계한 추정치 [추정]
분석 기준일: 2026년 3월 13일 | ListeningMind DaaS API v0.0.38 | 총 12회 API 호출

## 표

### Table 1

| 항목 | 내용 |
| --- | --- |
| 분석 시장 | 미국 (gl=us) |
| 분석 키워드 | brand-a cordless / brand-a a9 / brand-b furguard / Brand C stick vacuum cleaner |
| 총 API 호출 수 | 12회 (keyword_info 2 · cluster_finder 4 · intent_finder 6) |
| 사용 크레딧 | 11,888 credits |
| 기준일 | 2026.03 (volume_trend 기준월: 2026-02) |

### Table 2

| 키워드 | 연간 총 검색량 | 월평균 (3M) | 3M 증감률 | CPC ($) | 비고 |
| --- | --- | --- | --- | --- | --- |
| brand-a cordless | 43,300 | 4,133 | ▼ -45% | $0.64 | 성숙 시장 진입 [실제] |
| brand-b furguard | 15,540 | 1,766 | ▼ -55% | $2.08 | 2025-05 신규 등장 [실제] |
| brand-a a9 | 5,450 | 396 | ▼ -55% | $0.87 | 하위 모델 라인 [실제] |
| Brand C stick vacuum cleaner | N/A | N/A | N/A | - | exact keyword 데이터 없음 [실제] |
| Brand C 확장 3종 합산 (추정) | ~3,380 | ~280 | - | $1.70~ | 보정치 [가정] |

### Table 3

| No | API | 대상 키워드 & 파라미터 | 호출 목적 | 소모 크레딧 |
| --- | --- | --- | --- | --- |
| 1 | keyword_info | keywords=[seed 4개], gl=us, data_type=all | Seed 4개 검색량·추이 조회 | 40 |
| 2 | cluster_finder | keyword=brand-a cordless, gl=us, time_point=curr, hop=2, limit=120, orientation=UNDIRECTED | Brand A CordZero 검색 클러스터 확인 | 6,200 |
| 3 | intent_finder | keywords=[seed 4개], gl=us, volume_threshold=100, limit=120, sort=volume_total, order=desc | Seed keyword 기반 연관 검색어 탐색 | 208 |
| 4 | cluster_finder | keyword=brand-b furguard, gl=us, time_point=curr, hop=2, limit=120, orientation=UNDIRECTED | Bissell FurGuard 클러스터 분석 | 4,950 |
| 5 | cluster_finder | keyword=Brand C stick vacuum cleaner, gl=us, time_point=curr, hop=2, limit=120 | Roborock Seed keyword 클러스터 시도 → rels=0 확인 | 0 |
| 6 | intent_finder | keywords=[Brand C 3종], gl=us, volume_threshold=10, limit=80 | Roborock 실제 검색 표현 확장 탐색 | 96 |
| 7 | keyword_info | keywords=[Brand C 확장 4개], gl=us, data_type=all | Roborock 확장 키워드 검색량 확인 | 40 |
| 8 | cluster_finder | keyword=brand-b furguard, gl=us, time_point=12m, hop=2, limit=120 | Bissell 클러스터 과거 시점 비교 | 0 |
| 9 | cluster_finder | keyword=brand-a cordless, gl=us, time_point=12m, hop=2, limit=120 | Brand A 클러스터 과거 시점 비교 | 0 |
| 10 | intent_finder | keywords=[brand-a cordless, brand-a a9], gl=us, volume_threshold=50, limit=80 | Brand A 관련 기능 키워드 재확인 | 208 |
| 11 | intent_finder | keywords=[brand-b furguard], gl=us, volume_threshold=50, limit=80 | Bissell 기능 키워드 재확인 | 88 |
| 12 | intent_finder | keywords=[Brand C 3종], gl=us, volume_threshold=10, limit=40 | Roborock 키워드 최종 재확인 | 58 |
| 총 소모 크레딧 | 총 소모 크레딧 | 총 소모 크레딧 | 총 소모 크레딧 | 11,888 |

### Table 4

| 키워드 | 연간 총 검색량 | 월평균 검색량 | 최근 3개월 증감률 | 광고 경쟁도 | CPC(USD) |
| --- | --- | --- | --- | --- | --- |
| brand-a cordless | 43,300 | 4,133 | -45% | HIGH (100) | $0.64 |
| brand-a a9 | 5,450 | 396 | -55% | HIGH (94) | $0.87 |
| brand-b furguard | 15,540 | 1,766 | -55% | HIGH (100) | $2.08 |
| Brand C stick vacuum cleaner | N/A | N/A | N/A | - | - |

### Table 5

| 확장 키워드 | 연간 총 | 월평균 | 최근 3개월 증감률 |
| --- | --- | --- | --- |
| Brand C stick vacuum | 1,660 | 173 | -46% |
| Brand C cordless vacuum | 1,560 | 160 | -33% |
| Brand C h6 cordless stick vacuum | 160 | 16 | 0% |

### Table 6

| 브랜드 클러스터 | Dyson 비교 키워드 수 |
| --- | --- |
| Brand A CordZero | brand-a cordless a9 vs Premium Brand v15, brand-a cordless vs Premium Brand v15 (2개) |
| Bissell FurGuard | 11개 이상 (Premium Brand v8, v10, Premium Brand 비교 대거 확인) |
| Roborock | 해당 없음 (클러스터 미형성) |
