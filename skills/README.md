# ListeningMind Playbook — Skills

이 폴더는 [Playbook 사이트](https://listeningmind-playbook.vercel.app/) 12개 카드 각각에 대응되는 **Claude Code · Cursor 호환 스킬 패키지**를 담는다.

스킬을 다운로드해 본인의 `.claude/skills/` (또는 Cursor의 동등 경로)에 배치하면, 카드의 분석 워크플로우를 AI 어시스턴트가 자동으로 수행한다.

---

## 디렉토리 규약

```
skills/
  {card-slug}/
    SKILL.md              # YAML frontmatter + 단계별 워크플로우
    references/           # API 파라미터, 외부 문서 발췌
      api-parameters.md
    examples/             # 실전 케이스 (검증 리포트 발췌)
      *.md
    scripts/              # (선택) 보조 스크립트
```

- `SKILL.md`의 frontmatter `name` = 폴더명 = 카드 `slug`
- `description`에는 트리거 키워드를 명시 (`반드시 이 스킬을 사용하세요` 섹션)

---

## 현재 수록 스킬

| Card # | Slug | Endpoint | Status |
|--------|------|----------|--------|
| 01 | [`map-your-market`](./map-your-market/SKILL.md) | `intent_finder` | ✅ 파일럿 (LG 작업1 검증) |
| 02 | `decode-why-people-search` | `intent_finder` | ⏳ |
| 03 | `see-the-full-buying-path` | `path_finder` | ⏳ |
| 04 | `discover-hidden-sub-markets` | `cluster_finder` | ⏳ |
| 05 | `spot-trends-6-months-early` | TBD | ⏳ |
| 06~12 | — | — | ⏳ |

---

## 다운로드 / 설치

### Claude Code (글로벌)
```bash
git clone --depth 1 https://github.com/hyeonchoi-cpu/listeningmind-playbook.git /tmp/lm-playbook
cp -r /tmp/lm-playbook/skills/map-your-market ~/.claude/skills/
```

### Claude Code (프로젝트 스킬)
```bash
cp -r /tmp/lm-playbook/skills/map-your-market .claude/skills/
```

### Cursor
프로젝트 루트에 `.claude/skills/map-your-market/` 형태로 배치.

---

## 데이터 라벨링 정책 (공통)

모든 스킬은 **4-Label 정책**을 준수한다:

| 라벨 | 정의 |
|------|------|
| `[실제 데이터]` | API 직접 반환값 |
| `[추정]` | AI 해석 / 복수 API 결합 |
| `[가정]` | 전제 조건 필요 |
| `[데이터 공백]` | API 미반환 / 임계치 이하 |

라벨 누락은 모든 스킬에서 거부 사유다.

---

## 단가 (1회 분석 기준, 2026.03 검증)

| Endpoint | Call 단가 | 1회 분석 누적 |
|----------|-----------|---------------|
| `keyword_info` | 10 × N(키워드) | 40~80 |
| `intent_finder` | 58~208 | 300~800 |
| `cluster_finder` | 0 (rels=0) / 4,950~6,200 | 5,000~12,000 |
| `path_finder` | TBD | TBD |

> 출처: LG 작업1 미국 스틱청소기 검증 리포트 (2026.03, 12 calls / 11,888 credits)
