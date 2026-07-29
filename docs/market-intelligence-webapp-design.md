# 인더스트리별 마켓 인텔리전스 리포트 플레이북 — Next.js 웹앱 설계

> 작성일: 2026-07-28 (2026-07-28 §8 결정사항 반영 갱신)
> 대상 저장소: `Listeningmind-DaaS/listeningmind-playbook`
> 목적: `lima-agents` 스킬(Explorer/Report) + 6개 버티컬 오버레이(cosmetics·health-supplements·fin-bank·fin-card·fin-insurance·fin-securities)의 리포트 생성 로직을,
> Claude Desktop 대화 없이도 **웹 UI에서 인더스트리를 고르고 버튼 한 번으로 리포트를 생성/열람**할 수 있는 Next.js 앱으로 이식하기 위한 아키텍처 설계.

---

## 0. 결론 요약 (TL;DR)

- **새 앱을 만들지 않는다.** 기존 `listeningmind-playbook`(카드/퍼소나/모달 패턴이 이미 확장 친화적으로 설계돼 있음)을 확장한다. `web`의 서버사이드 DaaS/LLM 클라이언트 패턴(`lib/daas.ts`+`lib/llm.ts`+API Route)은 그대로 승격해 재사용하되, `market-intel-web`은 **별도 프로젝트(별도 DaaS API 키·별도 스킬 기반)로 완전히 분리 유지**하므로 그쪽 컴포넌트는 코드/의존성을 공유하지 않고 UX만 참고해 playbook 안에 독립적으로 새로 만든다 (§8 결정 4).
- **핵심 리스크는 UI가 아니라 파이프라인이다.** 지금 B-1(연령×성별 세그먼트) 리포트조차 CEP/KBF 분류가 "Claude 대화 중 사람이 판단 → 재렌더"로 되어 있고, 나머지 17개 리포트 코드는 스펙만 있고 구현이 없다. **매 생성마다 실시간 Claude API 호출로 분류한다는 결정(§8 결정 1)**에 따라, 이 파이프라인의 지연시간·비용·타임아웃 관리가 이 프로젝트의 진짜 작업량이다.
- **템플릿 3중 중복 문제를 이 참에 해소한다.** 지금 리포트 템플릿이 (1) lima-agents Chart.js판 (2) fin-* 4개 스킬에 바이트 단위로 복제된 SVG판 (3) cosmetics/health 자유서식, 이렇게 3갈래로 흩어져 있다. 웹앱에서는 React 컴포넌트 1벌로 통합해 이 드리프트를 구조적으로 제거한다.
- **단계적으로 간다.** Phase 1(카탈로그 UI + 목업 데이터, §8 결정 3에 따라 확정) → Phase 2(B-1 실서비스화) → Phase 3(나머지 리포트 코드 순차 이식) → Phase 4(Explorer 모드) 4단계 로드맵.

---

## 1. 왜 이 설계인가 — 기존 자산 3종 인벤토리

| 자산 | 위치 | 재사용할 것 | 재사용하지 않을 것 |
|---|---|---|---|
| **listeningmind-playbook** | `Listeningmind-DaaS/listeningmind-playbook` | Next.js 14 App Router 골격, `data/cards.ts`+`personas.ts` 패턴(카탈로그를 순수 TS 데이터로 관리), 인터셉팅 라우트 모달 패턴, `globals.css` 디자인 토큰(Pretendard/6색 accent), 검증 리포트(docx→익명화→committed artifact) 파이프라인 | `Band`(discovery/intelligence/action) 3분류, `PersonaCode` 6종 고정 유니온 — 인더스트리 축이 없어 그대로 못 씀 |
| **market-intel-web** | `Listeningmind-DaaS/market-intel-web` | **코드/컴포넌트를 직접 이식하지 않는다** — 별도 DaaS API 키·별도 스킬(`market-intelligence`) 기반의 독립 프로젝트로 확정 유지(§8 결정 4). `MarketIntelReport` 계약 형태와 `MarketIntelDashboard.tsx`(8탭 대시보드)의 **UX 아이디어만 참고**해 playbook 안에 독립 컴포넌트로 새로 작성 | 코드 공유, 배포 통합, 리다이렉트 전략 — 전부 불필요(두 프로젝트가 계속 병행 운영됨). 자체 디자인 시스템(`marketIntelStyles.ts`)도 이식 대상 아님 |
| **web** (geo 앱) | `Listeningmind-DaaS/web` | `lib/daas.ts`(서버 전용 DaaS REST 클라이언트, 재시도/정규화 포함) + `lib/llm.ts`(서버 전용 Claude 클라이언트) + `app/api/*/route.ts` 패턴 — API 키를 브라우저에 절대 노출하지 않는 유일한 선례 | 지오 특화 로직 자체는 불필요 |
| **lima-agents 스킬** | `lima-agents/.claude/skills/lima-agents` | 7 표준잡 정의, `reports/b1-segment-intent/`(README+schema.json+prepare.py+template.html 4점 세트 — 리포트 1건의 "완성형 스펙"), `api/client.py`/`cluster_finder.py`/`keyword_info.py`(엔드포인트 계약, 배치/재시도 로직), `lib/louvain.py`(순수 알고리즘, TS 이식 용이) | Chart.js 템플릿(레거시로 처리), 정규식 기반 KBF 분류(placeholder — 후술) |
| **버티컬 오버레이 6종** | `fin-bank/card/insurance/securities`, `listeningmind-cosmetics`, `listeningmind-health-supplements` | 페르소나/질문프레임/엔티티사전/컴플라이언스 가드레일 — 이걸 코드가 아니라 **인더스트리별 설정 데이터**로 웹앱에 흡수 | fin-* 4곳에 복제된 `report-template.html`(웹 컴포넌트로 대체하며 자동 소멸) |

---

## 2. 아키텍처 원칙

1. **카탈로그는 데이터, 렌더러는 코드 1벌.** `data/industries.ts` + `data/report-codes.ts`가 "무엇이 있는가"를 정의하고, React 컴포넌트 1세트가 "어떻게 보이는가"를 담당한다. 새 인더스트리·새 리포트 코드 추가 = 데이터 파일에 항목 추가 + (있다면) generator 함수 등록, 페이지/라우팅 코드는 불변.
2. **API 키는 서버에서만 존재한다.** `web/lib/daas.ts` 패턴을 그대로 표준으로 승격 — 모든 DaaS 호출은 Node 런타임 API Route를 거치고, `LM_API_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 env로만 존재.
3. **모든 수치에는 라벨이 타입 레벨에서 강제된다.** `_shared-core.md`의 "실측/파생/가정/데이터없음" 규율을 문서 컨벤션이 아니라 TS 타입으로 강제한다 — `LabeledValue<T> = { value: T; basis: 'measured'|'derived'|'assumption'|'missing' }`. 이러면 컴포넌트가 라벨 없는 숫자를 렌더링하는 것 자체가 컴파일 에러가 된다.
4. **차트는 결정론적 인라인 SVG만.** fin-* 오버레이가 이미 강제하고 있는 규칙(Chart.js/D3 CDN 금지 — 스크립트 오류·비결정적 레이아웃 방지)을 전 업권 공통 규칙으로 승격. `market-intel-web`의 손수 그린 SVG 차트 방식을 표준으로 채택.
5. **생성은 비동기 잡이다.** 리포트 1건 생성은 cluster_finder → keyword_info(최대 1000개씩 배치) → (있다면) LLM 분류까지 이어지는 다단계 파이프라인이라 단일 요청-응답으로 묶기엔 느리고 비용도 크다. Job Queue 패턴으로 분리한다(§6).

---

## 3. 데이터 모델

### 3.1 인더스트리 카탈로그

```ts
// data/industries.ts
type Industry = {
  slug: 'universal' | 'cosmetics' | 'health-supplements'
      | 'fin-bank' | 'fin-card' | 'fin-insurance' | 'fin-securities'
  label: string                    // "화장품·뷰티" 등
  colorTheme: ColorTheme           // playbook 기존 6색 팔레트 재사용 + 신규 확장
  personas: PersonaCode[]          // 기존 personas.ts와 교차 참조
  entityDictionaryRef: string      // 브랜드/기관 사전 파일 경로 (예: fin-bank의 brand-map.md 이식본)
  complianceLevel: 'standard' | 'finance'  // finance면 §5 가드레일 강제
  reportCodesAvailable: ReportCode['code'][]
}
```
6개 버티컬 + `universal`(업권 불특정 폴백) = 총 7개 항목. 기존 `data/cards.ts`/`data/personas.ts`와 동일한 "순수 TS 배열 + 셀렉터 함수" 패턴을 그대로 따른다.

### 3.2 리포트 코드 카탈로그

```ts
// data/report-codes.ts
type ReportCode = {
  code: string              // "B-1", "A-2" ...
  job: 1|2|3|4|5|6|7        // 7 표준잡 매핑
  title: string
  status: 'implemented' | 'planned'   // 지금은 B-1만 implemented
  connectors: ('keyword_info'|'intent_finder'|'cluster_finder'|'path_finder')[]
  schemaRef: string          // JSON Schema 경로
}
```
`lima-agents/references/question-frame.md`의 18개 코드(A-1~5, B-1~4, C-1~4, D-1~4, P-1a/1b/2a/2b)를 그대로 이식하되 `status` 필드로 구현 여부를 명시 — 미구현 코드는 카탈로그 UI에 "준비 중" 배지로 노출해 로드맵 투명성을 확보한다.

### 3.3 리포트 계약 (렌더러가 소비하는 최종 JSON)

`market-intel-web`의 `MarketIntelReport` 인터페이스를 베이스로 확장:

```ts
type MarketIntelReport = {
  meta: { industry: Industry['slug']; reportCode: string; category: string; gl: string; timePoint: string; generatedAt: string }
  kpis: LabeledValue<number>[]
  sov: { entity: string; share: LabeledValue<number> }[]
  seasonality: LabeledValue<number>[]
  personas: PersonaInsight[]
  opportunities: OpportunityCard[]
  keywordTable: KeywordRow[]
  compliance: ComplianceBlock   // 신규 — §5
  methodology: { dataSource: string; algorithm: string; limitations: string[]; dataGaps: string[] }
  costLog: { endpoint: string; calls: number; totalCost: number }[]  // 소비형, 잔액 아님
}
```

---

## 4. 라우트 / 폴더 구조

```
listeningmind-playbook/
├── app/
│   ├── page.tsx                        # 기존 홈 (12개 역량 카드) — 유지
│   ├── cards/[slug]/…                  # 기존 — 유지
│   ├── industries/
│   │   ├── page.tsx                    # 신규: 인더스트리 선택 그리드 (7개)
│   │   └── [industry]/
│   │       ├── page.tsx                # 신규: 해당 업권 리포트 코드 카탈로그(18종, 상태 배지)
│   │       └── [reportCode]/
│   │           ├── page.tsx            # 신규: 입력 폼(카테고리/GL/timePoint) + 생성 상태 + 대시보드
│   │           └── loading.tsx
│   └── api/
│       └── reports/
│           ├── generate/route.ts       # 신규: POST, Node 런타임 — 잡 생성
│           ├── status/[jobId]/route.ts # 신규: GET — 폴링
│           └── [jobId]/route.ts        # 신규: GET — 완료된 리포트 JSON 반환
├── components/
│   ├── (기존 Cover/CardDetail/Modal/…)  # 유지
│   └── report/
│       ├── MarketIntelDashboard.tsx    # 신규 작성 — market-intel-web UX 참고, 코드 공유 없음(§8 결정 4)
│       ├── LabelBadge.tsx              # 신규: [실측]/[파생]/[가정]/[데이터없음] 칩
│       ├── ComplianceFooter.tsx        # 신규: §5 가드레일 텍스트 렌더
│       └── ReportGenerateForm.tsx      # 신규
├── data/
│   ├── cards.ts / personas.ts          # 기존
│   ├── industries.ts                   # 신규 (§3.1)
│   └── report-codes.ts                 # 신규 (§3.2)
├── lib/
│   ├── daas.ts                         # 신규: web/lib/daas.ts 이식 (서버 전용)
│   ├── llm.ts                          # 신규: web/lib/llm.ts 이식 — CEP/KBF 분류용
│   ├── compliance.ts                   # 신규: 업권별 가드레일 텍스트 + 라벨 강제 헬퍼
│   ├── jobs.ts                         # 신규: 잡 큐 클라이언트
│   └── reports/
│       ├── registry.ts                 # 신규: code → generator 함수 매핑 (run_analysis.py의 CODE_TO_FOLDER 이식)
│       └── b1-segment-intent.ts        # 신규: prepare.py TS 이식 (Phase 2 첫 대상)
└── schemas/
    └── market-intel-report.schema.json # 신규: 정본 계약, JSON Schema
```

기존 `/cards/[slug]` 카탈로그(역량 소개)와 신규 `/industries/[industry]/[reportCode]`(실제 리포트 생성)는 **서로 다른 목적**이므로 분리 유지 — 다만 각 역량 카드의 "관련 리포트 코드" 상호 링크는 추가 가능.

---

## 5. 컴플라이언스 계층 (fin-* 4곳 중복을 여기로 흡수)

```ts
// lib/compliance.ts
const GUARDRAILS: Record<Industry['slug'], ComplianceBlock> = {
  'fin-bank':        FINANCE_SHARED_GUARDRAIL,   // _shared-core.md + overlay-finance.md 이식
  'fin-card':        FINANCE_SHARED_GUARDRAIL,
  'fin-insurance':   FINANCE_SHARED_GUARDRAIL,
  'fin-securities':  FINANCE_SHARED_GUARDRAIL,
  'cosmetics':       COSMETICS_GUARDRAIL,        // 효능 단정 금지 등
  'health-supplements': HEALTH_GUARDRAIL,
  'universal':       BASE_GUARDRAIL,
}
```
- `fin-*` 4곳에 바이트 단위로 복제돼 있던 `overlay-finance.md`를 **단일 소스**(`FINANCE_SHARED_GUARDRAIL`)로 통합 — 지금 4개 스킬 유지보수 시 "나머지 3곳도 동일 갱신" 해야 하는 드리프트 리스크가 웹앱에서는 구조적으로 사라진다.
- `ComplianceFooter` 컴포넌트가 `industry.complianceLevel === 'finance'`일 때 자동으로 다음을 강제 렌더: 권유/단정 금지 문구, "심의+준법검토 전 초안" 라벨, SoV "검색량 기준 근사" 표기, 크레딧 소비 로그(잔액 아님).
- `LabeledValue` 타입(§2 원칙 3)과 결합해, 정책/시즌 임팩트 관련 수치는 `basis: 'derived'`만 허용하고 인과 단정 텍스트("~때문에 급증")는 린트 룰로 차단하는 것까지 고려 가능(Phase 3 이후).

---

## 6. 리포트 생성 파이프라인 (핵심 리스크 구간)

```
[브라우저] POST /api/reports/generate {industry, reportCode, category, gl, timePoint}
     │
     ▼
[API Route, Node runtime] → jobs.ts: 잡 레코드 생성 (status=queued) → 202 + jobId 즉시 반환
     │ (비동기, 같은 함수 내 또는 백그라운드 큐)
     ▼
[registry.ts] code → generator 함수 조회 (예: b1-segment-intent.ts)
     │
     ▼
[daas.ts] cluster_finder 호출 → unique_keywords 추출
     │
     ▼
[daas.ts] keyword_info 배치 호출 (1000개 단위, 동시성 상한 3 — client.py의 MAX_CONCURRENT 이식)
     │
     ▼
[llm.ts] CEP/KBF/엔티티 분류 — 매 생성마다 Claude API 실시간 호출 (§8 결정 1, 정규식 placeholder는 폐기)
     │
     ▼
[registry.ts] schema.json 형태로 병합 → MarketIntelReport 조립
     │
     ▼
[jobs.ts] 완료 상태로 저장 (Vercel KV + Blob, §8 결정 2) → status=done
     │
[브라우저] GET /api/reports/status/[jobId] 폴링 → done이면 리포트 페이지가 GET /api/reports/[jobId]로 로드
```

**확정된 결정과 그에 따른 설계 함의** (§8 결정 1: 매 리포트 생성마다 실시간 LLM 호출):
- **Job Queue는 선택이 아니라 필수다.** cluster_finder → keyword_info 배치 → Claude 분류까지 이어지면 단일 요청이 Vercel Node 함수의 어떤 `maxDuration` 설정보다도 쉽게 길어질 수 있다 — 동기 응답 경로는 아예 만들지 않는다.
- **분류 프롬프트는 업권별로 파라미터화된 시스템 프롬프트가 필요하다.** `lib/llm.ts`가 `industry.entityDictionaryRef`(브랜드/기관 사전)와 `industry.complianceLevel`을 받아 CEP/KBF 분류 기준과 금지 표현(예: 금융 업권의 단정·권유 문구 회피)을 프롬프트에 주입해야 한다 — fin-* 4곳에 흩어진 `overlay-finance.md`의 분류 관련 지침이 이 프롬프트의 1차 소스.
- **생성 전 예상 비용/시간을 사용자에게 보여준다** (§8 결정 6, 확정). DaaS 크레딧(keyword_info 배치당 `cost_detail`)에 Claude API 토큰 비용이 더해지므로, `ReportGenerateForm`은 "생성" 버튼을 누르기 전에 대략적 소요 시간·예상 비용 안내와 명시적 확인 단계를 반드시 거친다.
- **분류 실패는 리포트 전체 실패가 아니라 부분 라벨 실패로 처리한다** (§8 결정 7, 확정). `lib/llm.ts` 호출은 스키마 불일치·타임아웃 시 최대 2회 자동 재시도하고, 그래도 실패하면 해당 섹션만 `basis: 'missing'` + `[재분류 필요]` 배지로 표시 — KPI/SoV 등 분류에 의존하지 않는 나머지 섹션은 정상 노출한다.
- **분류 결과의 비결정성 대비 재현성 확보가 필요하다.** 동일 카테고리로 재생성 시 결과가 달라질 수 있으므로, `MarketIntelReport.meta`에 사용한 모델명/프롬프트 버전을 기록해 두는 것을 권장 — 향후 품질 이슈 추적 시 근거가 된다.

---

## 7. 비동기 잡 처리 & 배포

- **저장소는 Vercel KV + Vercel Blob으로 확정**(§8 결정 2). 잡 상태(`queued`/`running`/`done`/`failed`)는 KV에 TTL과 함께 저장하고, 완성된 리포트 JSON은 Blob에 저장 — `market-intel-web`이 수작업으로 하던 "public/에 JSON 드롭" 패턴의 런타임/자동화 버전이다. DB 서버 없이 시작할 수 있어 Postgres 대비 초기 인프라 부담이 가장 낮다.
- `listeningmind-playbook`은 `market-intel-web`/`web`과 마찬가지로 **Vercel** 배포를 가정(선례 2곳 모두 `.vercel/project.json` 보유).
- `web/app/api/geo/route.ts`가 이미 `runtime="nodejs"`, `maxDuration=300`으로 5분 제한을 설정해둔 선례가 있으나, §6에서 확정된 "매 생성마다 실시간 LLM 호출" 때문에 B-1 수준조차 이 한도에 근접하거나 넘을 수 있다고 보수적으로 가정한다 — **동기 응답 경로 없이 처음부터 Job Queue + 폴링만 구현**한다(선택지가 아니라 필수 설계로 격상).
- 크레딧 소비형 API이므로 **동시 생성 상한**과 **재시도 시 중복 호출 방지**(idempotency key = industry+reportCode+category+gl+timePoint 해시)를 API Route 레벨에서 강제해야 함 — `api/client.py`의 `MAX_CONCURRENT=3`이 이미 이 문제의식을 갖고 있으므로 그 값을 그대로 승계. 여기에 더해 Claude API 호출도 동시 실행 상한을 두어 두 종류의 외부 비용(크레딧+토큰)이 동시에 폭주하지 않도록 한다.

---

## 8. 로드맵 & 결정사항

| Phase | 범위 | 산출물 |
|---|---|---|
| **Phase 1** ✅확정 | 카탈로그 UI만. `data/industries.ts`+`report-codes.ts` 채우기, `/industries` 그리드, 각 업권별 리포트 코드 목록(대부분 "준비 중" 배지). 데이터는 기존 `public/sample-data/*.json`처럼 **정적 목업**으로 대체 | 클릭 가능한 정보 구조, 실제 생성 없음 |
| **Phase 2** ✅구현 | B-1 실서비스화 — `lib/daas.ts`/`lib/llm.ts`(실시간 KBF 분류)/`lib/reports/b1-segment-intent.ts`/`lib/store.ts`(KV+Blob) + `/api/reports/generate`·`/api/reports/[jobId]` + `ReportGenerateForm`/`B1ReportView` UI, 7개 업권 전체에 대해 B-1 생성 가능. `next build` 통과 + 폼 UX(입력→예상치 확인→취소) 브라우저 검증 완료. **실제 크레딧을 쓰는 라이브 생성 호출은 사용자 요청으로 미실행** — 최초 실사용 시 검증 필요 | 코드 완성된 리포트 파이프라인 (라이브 미검증) |
| **Phase 3** 🔄진행중 | 나머지 코드 순차 이식. **A-1(월별 추이·YoY)·A-2(성별·연령 분포)·A-3(인텐트 믹스+CEP 7W) 구현 완료** — A-1/A-2는 keyword_info 1콜 저비용(LLM 없음), A-3는 B-1과 동일한 cluster 파이프라인 + 실시간 CEP 7W 분류(`lib/llm.ts classifyCep`). 폼은 코드별 뷰 레지스트리(`REPORT_VIEWS`)·코드별 예상치(`estimateForCode`)로 일반화됨. 남은 것: C-1~4·D-1·D-3·D-4(브랜드 입력 폼 확장 + 엔티티 추출 필요), A-4·C-3(path_finder 커넥터 신규), P-1a/1b/2b(고정 브랜드 케이스), D-2·P-2a(미지원 유지) | A 밴드 완료, C/D/P 밴드 대기 |
| **Phase 4** | Explorer 모드(클러스터 그래프, `lib/louvain.py` TS 이식 필요) — Report보다 인터랙션 복잡도가 높아 별도 트랙 | 인터랙티브 탐색기 |

### 2026-07-28 확정된 결정사항

| # | 항목 | 결정 | 근거/영향 |
|---|---|---|---|
| 1 | CEP/KBF 분류 방식 | **매 리포트 생성마다 실시간 Claude API 호출** (정규식 placeholder 폐기, 하이브리드 안 채택 안 함) | 정확도 우선. 대신 §6/§7에 명시한 대로 Job Queue가 선택이 아닌 필수 설계가 되고, 생성당 지연시간·비용이 늘어남 — Phase 2 착수 시 실측 필요 |
| 2 | 잡 상태·리포트 저장소 | **Vercel KV + Vercel Blob** | 최소 인프라로 시작. 향후 업권별/기간별 이력 조회 등 구조화 쿼리가 필요해지면 Postgres 마이그레이션을 재검토 |
| 3 | Phase 1 순서 | **정적 목업 데이터로 먼저 카탈로그 UI 검증** | `public/sample-data/*.json` 패턴을 그대로 확장 적용, 실 파이프라인 없이 정보구조/UX부터 검증 |
| 4 | `market-intel-web` 처리 | **별도 프로젝트로 완전 분리 유지, 흡수/폐기하지 않음** | `market-intel-web`은 `market-intelligence` 스킬 기반의 별도 DaaS API 키를 쓰는 독립 프로젝트 — playbook의 리포트 대시보드는 그 UX만 참고해 코드/의존성 공유 없이 새로 작성 (§1, §4, §9 갱신 반영) |

### 2026-07-28 (2차) 확정된 후속 결정사항

결정 1(실시간 LLM 호출)과 결정 4(별도 프로젝트 유지)가 열어둔 후속 항목 3가지를 모두 확정했다:

| # | 항목 | 결정 | 설계 반영 |
|---|---|---|---|
| 5 | Claude API 키 소유권 | **playbook 전용 신규 Anthropic API 키 발급** (팀 공용 키 재사용 안 함) | `lib/llm.ts`는 `ANTHROPIC_API_KEY`를 listeningmind-playbook 전용 서버 env로만 읽는다. lima-agents Claude Desktop 세션 사용량과 완전히 분리되어, 이 기능만의 월별 비용을 독립적으로 추적할 수 있다. 키 유출 시 피해 범위도 이 앱으로 국한 |
| 6 | 생성 전 비용/시간 안내 | **생성 버튼 이전에 예상치 표시 + 명시적 확인 단계** | `ReportGenerateForm`은 DaaS 예상 크레딧(과거 동일 카테고리 호출 이력 또는 카테고리 규모 기반 추정) + Claude 토큰 예상 비용 + 예상 소요 시간을 보여주고, 사용자가 명시적으로 확인해야 `/api/reports/generate`를 호출한다. 비전문가 마케터가 반복 클릭으로 비용을 새는 것을 방지 |
| 7 | LLM 분류 실패/타임아웃 정책 | **자동 재시도 1~2회 + 부분 결과 허용** | `lib/llm.ts` 호출은 스키마 불일치·타임아웃 시 최대 2회까지 자동 재시도한다. 그래도 실패하면 리포트 전체를 실패 처리하지 않고, KBF/CEP 분류가 필요한 섹션만 `LabeledValue`의 `basis: 'missing'` + `[재분류 필요]` 배지로 표시하고 KPI·SoV 등 분류에 의존하지 않는 나머지 섹션은 정상 노출한다 — §2 원칙 3(라벨 강제)과 자연스럽게 결합되는 설계 |

이로써 Phase 2 착수 전 확인이 필요했던 항목이 모두 정리됐다.

### Phase 2 구현 노트 (2026-07-28)

- **`@vercel/kv` → `@upstash/redis`로 대체.** 결정 2(Vercel KV + Blob)를 그대로 구현하려 했으나, 설치 시점에 `@vercel/kv`가 deprecated로 확인됨(Vercel이 Upstash Redis 직접 사용을 공식 권장). `lib/store.ts`는 실제로 `@upstash/redis`를 쓰되 Vercel Marketplace의 Redis(Upstash) 연동이 주입하는 `KV_REST_API_URL`/`KV_REST_API_TOKEN` 환경변수를 그대로 읽으므로, 결정 2의 의도("관리형 KV 사용")는 바뀌지 않았다.
- **로컬 개발 폴백 추가.** `KV_REST_API_URL`/`BLOB_READ_WRITE_TOKEN`이 없으면 `lib/store.ts`가 프로젝트 루트 `.data/`(gitignore 처리)에 파일로 대체 저장 — 실제 Vercel 리소스 없이도 `npm run dev`로 파이프라인 전체를 검증할 수 있다. env var가 감지되면 코드 변경 없이 실서비스 저장소로 전환된다.
- **동기 요청/응답 유지.** §6/§7에서 "Job Queue가 필수"라고 판단했던 것을 구현 단계에서 재검토 — 이 저장소의 실제 선례(`web/app/api/geo/route.ts`, DaaS 다중 호출 + Claude 보강 조합)가 동일 규모로 이미 `maxDuration=300` 안에서 동기 처리로 안정적으로 동작하고 있어, B-1도 같은 패턴(`app/api/reports/generate/route.ts`)을 따랐다. 완성된 리포트는 여전히 Blob에 저장해 `GET /api/reports/[jobId]`로 재조회 가능 — "저장은 KV+Blob" 결정은 지키되 "생성은 비동기 폴링" 부분만 검증된 패턴으로 단순화했다. Phase 3에서 실제로 300초를 넘기는 리포트 코드가 나오면 그때 진짜 폴링을 추가한다.
- **KBF 분류 스코프 축소.** Python MVP는 세그먼트 전체 키워드를 정규식으로 훑었지만, 실시간 LLM 호출 비용/지연시간을 묶어두기 위해 웹 파이프라인은 "세그먼트별 검색량 상위 30개 키워드" 샘플만 Claude에 넘긴다(`lib/reports/b1-segment-intent.ts` 상단 주석에 명시). 세그먼트 볼륨/점유율 자체는 여전히 전체 키워드 기준 실측이라 영향 없음 — KBF 집계만 샘플 기반 근사.
- **미해결 — npm audit 경고.** `npm install` 시 기존 `next@14.2.35`(이번 작업 이전부터 설치돼 있던 버전)에 대해 high severity 취약점 다수가 리포트됨. 수정하려면 `next@16` 메이저 업그레이드가 필요해(breaking change) 이번 작업 범위를 벗어난다고 판단해 손대지 않았다 — 카드 카탈로그·모달 라우팅 등 기존 기능 전체에 영향을 주는 별도 작업으로 다뤄야 한다.
- **라이브 미검증.** 사용자 요청에 따라 실제 크레딧을 쓰는 `POST /api/reports/generate` 성공 경로는 아직 실행해보지 않았다. 검증된 것: `next build` 통과, API 입력 검증(400 응답들, DaaS 호출 전 반환), `GET /api/reports/[jobId]` 404 처리, `ReportGenerateForm`의 idle→검증오류→confirm(예상치 표시)→취소 UX. 최초 실사용 시 cluster_finder/keyword_info 실호출과 (Anthropic 키 설정 시) KBF 분류까지 끝까지 확인 필요.

---

## 9. 부록 — 재사용 자산 매핑 표

| 이식 대상 | 원본 | 이식 후 위치 | 비고 |
|---|---|---|---|
| DaaS 클라이언트 | `web/lib/daas.ts` | `listeningmind-playbook/lib/daas.ts` | 그대로 승격, 신규 코드 없음 |
| LLM 클라이언트 | `web/lib/llm.ts` | `listeningmind-playbook/lib/llm.ts` | 시스템 프롬프트를 업권별로 파라미터화 필요 |
| 리포트 대시보드 | `market-intel-web/components/MarketIntelDashboard.tsx` (참고용) | `listeningmind-playbook/components/report/MarketIntelDashboard.tsx` | **코드 이식 아님** — 8탭 구성·SVG 차트 방식 등 UX 아이디어만 참고해 playbook `globals.css` 토큰으로 신규 작성 (§8 결정 4) |
| 내보내기 | `market-intel-web/lib/marketIntelExport.ts` (참고용) | `listeningmind-playbook/lib/reportExport.ts` | 정적 HTML/PDF 내보내기 방식 참고해 신규 작성, 코드 공유 없음 |
| Louvain 알고리즘 | `lima-agents/.claude/skills/lima-agents/lib/louvain.py` | `listeningmind-playbook/lib/louvain.ts` | Phase 4 대상, 순수 알고리즘이라 이식 난이도 낮음 |
| B-1 스키마 | `lima-agents/.../reports/b1-segment-intent/schema.json` | `listeningmind-playbook/schemas/` | JSON Schema → TS 타입 자동 생성(`json-schema-to-typescript`) |
| 금융 가드레일 | `fin-bank/.../overlay-finance.md` (4곳 중복) | `listeningmind-playbook/lib/compliance.ts` 내 단일 상수 | 4곳 복제 문제 해소 |
| 카드/퍼소나 패턴 | `data/cards.ts`, `data/personas.ts` | (신규) `data/industries.ts`, `data/report-codes.ts` | 패턴 복제, 코드 재사용 아님 |
