# MCP Integration — ListeningMind DaaS

> Model Context Protocol (MCP) 기반 ListeningMind DaaS 통합 가이드.

---

## 인증

```bash
# 환경 변수
export LM_API_KEY="sk-lm-..."

# config 파일 (~/.lmpipe/config.toml)
[default]
api_key = "sk-lm-..."
gl_default = "us"
```

---

## MCP 서버 설치

```bash
# npm
npm install -g @ascentkorea/lmpipe-mcp

# 또는 pip
pip install lmpipe-mcp
```

---

## 클라이언트별 등록

### Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "listeningmind": {
      "command": "lmpipe-mcp",
      "env": { "LM_API_KEY": "sk-lm-..." }
    }
  }
}
```

### LangGraph

```python
from langgraph.prebuilt import create_react_agent
from langchain_mcp import MCPClient

mcp = MCPClient(server="listeningmind", env={"LM_API_KEY": "..."})
agent = create_react_agent(model, tools=mcp.tools())
```

### OpenAI Agent (Assistants API)

```python
from openai import OpenAI
client = OpenAI()
assistant = client.beta.assistants.create(
  tools=[{"type": "function", "function": mcp_tool_schema}],
  ...
)
```

---

## 사용 가능한 도구 (4 endpoints)

| MCP Tool | Endpoint | 단가 |
|----------|----------|------|
| `lm_keyword_info` | keyword_info | 10 × N keywords |
| `lm_intent_finder` | intent_finder | 58~208 / call |
| `lm_cluster_finder` | cluster_finder | 0 / 4,950~6,200 |
| `lm_path_finder` | path_finder | TBD (베타) |

---

## Rate Limit

| 플랜 | RPM | RPD | 동시 요청 |
|------|-----|-----|----------|
| Starter | 30 | 5,000 | 2 |
| Pro | 120 | 50,000 | 8 |
| Enterprise | 600 | unlimited | 32 |

응답 헤더:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2026-03-13T15:00:00Z
```

---

## 응답 메타 헤더

```
X-Credits-Used: 208           # 본 호출 사용 크레딧
X-Credits-Remaining: 41672    # 잔여 크레딧
X-Request-ID: req_abc123      # 디버깅용
```

---

## 에러 코드

| Code | 의미 | 처리 |
|------|------|------|
| 400 | 파라미터 오류 | 입력 검증 후 재호출 (재시도 안 함) |
| 401 | 인증 실패 | API 키 확인 |
| 402 | 크레딧 소진 | 플랜 업그레이드 / 충전 |
| 429 | Rate Limit | exponential backoff |
| 500/502/503 | 서버 오류 | 3회 재시도, 영구 실패 시 알림 |

---

## 예제 — 풀 워크플로우

```python
import httpx, time

def market_audit(seeds: list[str], market: str = "us"):
    client = httpx.Client(
        base_url="https://api.listeningmind.com/v1",
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=30.0
    )

    used = 0
    results = {}

    # 1. Seed validation
    r = client.post("/keyword_info", json={
        "keywords": seeds, "gl": market, "data_type": "volume_only"
    })
    used += int(r.headers.get("x-credits-used", 0))
    results["seed_info"] = r.json()

    # 2. Intent expansion
    r = client.post("/intent_finder", json={
        "keywords": seeds, "gl": market,
        "volume_threshold": 100, "limit": 120
    })
    used += int(r.headers.get("x-credits-used", 0))
    results["intent"] = r.json()

    # 3. Per-seed clustering (parallel candidates)
    results["clusters"] = []
    for seed in seeds:
        r = client.post("/cluster_finder", json={
            "keyword": seed, "gl": market, "hop": 2, "limit": 120
        })
        used += int(r.headers.get("x-credits-used", 0))
        results["clusters"].append({"seed": seed, "data": r.json()})

    return {"used_credits": used, "results": results}
```
