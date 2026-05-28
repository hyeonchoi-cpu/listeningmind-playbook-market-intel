---
name: plug-into-your-ai-agents
description: |
  ListeningMind DaaS 4개 endpoint를 MCP 클라이언트 (LangGraph · Claude · OpenAI Agent)에
  통합하는 에이전트 운영 스킬. 워크플로우 정의 + used_credits 모니터링 + rate limit 처리.

  **반드시 이 스킬을 사용하세요:**
  - "MCP 연동" / "에이전트 워크플로우" / "agentic workflow"
  - "ListeningMind API를 에이전트에 통합"
  - "LangGraph / Claude Agent / OpenAI Assistant 연결"
  - "used_credits 모니터링" / "API rate limit 처리"

  **출력**:
  - `workflow_{name}.yaml` — 에이전트 워크플로우 정의
  - `usage_dashboard_{period}.md` — used_credits 추적 + 비용 예측
license: Internal — ListeningMind DaaS Playbook v1.0
---

# Plug into Your AI Agents — MCP 에이전트 통합

> **핵심 원칙**: ListeningMind는 데이터 소스가 아니라 에이전트 도구다.
> MCP 표준으로 연결하면 LangGraph · Claude · OpenAI Agent에서 그대로 호출 가능하다.

## 참조 파일

| 파일 | 내용 |
|------|------|
| `references/mcp-integration.md` | MCP 서버 설정 · 인증 · rate limit |
| [`../map-your-market/references/api-parameters.md`](../map-your-market/references/api-parameters.md) | 4 endpoints 전체 파라미터 |

---

## 사전 확인

```
1. ListeningMind DaaS API 키 발급 ✓
2. MCP 클라이언트 결정 (LangGraph / Claude / OpenAI Agent / Custom)
3. 사용 endpoint 결정 (4개 전체 또는 일부)
4. 예상 호출량 + 예산 (used_credits 기준)
5. 에러 처리 정책 (rate limit / 데이터 부재 / 임계치 미달)
```

---

## STEP 1 · MCP 서버 등록

```yaml
# 예: Claude Desktop config
mcpServers:
  listeningmind:
    command: "lmpipe"
    args: ["--api-key", "${LM_API_KEY}", "--gl-default", "us"]
    env:
      LM_API_KEY: ${LM_API_KEY}
```

또는 HTTPS 직접 호출:
```python
import httpx
client = httpx.Client(
  base_url="https://api.listeningmind.com/v1",
  headers={"Authorization": f"Bearer {API_KEY}"}
)
```

---

## STEP 2 · 워크플로우 정의

표준 분석 워크플로우 (LG 작업1 유형):

```yaml
workflow: market_audit
steps:
  - id: validate_seeds
    tool: keyword_info
    params:
      keywords: ${input.seeds}
      gl: ${input.market}
      data_type: volume_only
    on_empty: skip_to_blind_spot
    cost_estimate: 10 × |seeds|

  - id: expand_intent
    tool: intent_finder
    params:
      keywords: ${input.seeds}
      gl: ${input.market}
      volume_threshold: 100
      limit: 120
    cost_estimate: 200

  - id: discover_clusters
    tool: cluster_finder
    parallel_for: ${input.seeds}
    params:
      keyword: ${item}
      gl: ${input.market}
      hop: 2
      limit: 120
    on_zero_rels: log_blind_spot
    cost_estimate: 0 ~ 6200 per call

  - id: aggregate
    tool: local_aggregate
    params:
      sources: [validate_seeds, expand_intent, discover_clusters]
      label_policy: 4_label
```

---

## STEP 3 · used_credits 모니터링

각 호출 응답에 `used_credits` 포함:

```python
response = client.post("/intent_finder", json=params)
print(f"used_credits: {response.headers['x-credits-used']}")
print(f"remaining: {response.headers['x-credits-remaining']}")
```

**대시보드 메트릭**:
- 일/주/월 누적 used_credits
- endpoint별 분포
- workflow별 평균 비용

---

## STEP 4 · 에러 처리 표준

| 에러 | 처리 |
|------|------|
| `429 Rate Limit` | exponential backoff (1s → 2s → 4s, max 60s) |
| `empty results` | `[데이터 공백]` 라벨 후 다음 단계로 |
| `rels=0` (cluster_finder) | 과금 0이지만 결과 미반환 → blind_spot 기록 |
| `5xx` | retry 3회 + 영구 실패 시 Slack/PagerDuty 알림 |

---

## STEP 5 · 4-Label 라벨링 자동 부착

모든 에이전트 출력에 라벨 자동 부착:

```python
def label_output(field_name, value, source):
    if source == "api_direct": return ("[실제 데이터]", value)
    if source == "llm_classified": return ("[추정]", value)
    if source == "model_assumption": return ("[가정]", value)
    if value is None or value == 0: return ("[데이터 공백]", None)
```

> 라벨 부착 누락은 곧 trust 위반. 에이전트 시스템 프롬프트에 강제.

---

## 산출물

### `workflow_{name}.yaml`
STEP 2 예시 그대로. 워크플로우 정의 파일.

### `usage_dashboard_{period}.md`
```markdown
# Usage Dashboard — 2026-W12
## Total
- Calls: 142
- used_credits: 18,420
- Cost (예상): $X (single plan rate × credits)

## By endpoint
- cluster_finder: 12 calls, 13,200 credits (71.7%)
- intent_finder: 38 calls, 4,180 credits (22.7%)
- keyword_info: 84 calls, 840 credits (4.6%)
- path_finder: 8 calls, 200 credits (1.1%)

## Workflows
- market_audit: 4 runs, avg 4,605 credits/run
- weekly_benchmark: 12 runs, avg 165 credits/run
```

---

## 한계 및 주의사항

- 초당 호출 한도(rate limit)는 플랜에 따라 상이 → 자세한 사항 references/mcp-integration.md
- 신규 endpoint 출시 ~7일 staging 기간 — 베타 단계 SLA 미보장
- Enterprise 플랜은 커스텀 SLA + Slack 알림 + dedicated support 제공

---

## 단가

- 4개 endpoint 단가 합산
- 에이전트 워크플로우 1건: 5~20 calls = 100~12,000 credits 범위
- Enterprise 플랜에서 used_credits 사후 정산 권장
