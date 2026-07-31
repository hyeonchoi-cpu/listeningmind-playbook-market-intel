# 검증 리포트 업로드 워크플로우

> 카테고리별 검증 리포트(docx)를 사이트에 반영하는 표준 절차.
> 원본 docx는 **공개 repo에 절대 커밋되지 않으며**, 익명화된 발췌본만 자동 생성·배포된다.

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│ verification-reports/   (gitignored, 사내 전용)                          │
│   ├─ 작업1_미국_스틱청소기.docx       ← 원본 (G 드라이브에서 복사)        │
│   ├─ 작업1_미국_스틱청소기.meta.json  ← 익명화 규칙 + 카드 매핑          │
│   ├─ 작업2_xxx.docx                                                     │
│   └─ 작업2_xxx.meta.json                                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │  npm run ingest  (python-docx)
                             ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 자동 생성물 (committed)                                                  │
│   ├─ skills/{slug}/examples/{report_id}.md       ← 발췌 마크다운          │
│   ├─ public/sample-data/{slug}--{report_id}.json ← 구조화 JSON           │
│   └─ data/verification-reports.json              ← 인덱스 (UI 데이터)     │
└────────────────────────────┬────────────────────────────────────────────┘
                             │  git push
                             ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Vercel 자동 재배포                                                       │
│   - 카드 상세에 "검증 리포트" 섹션 자동 노출                              │
│   - JSON / Markdown 다운로드 버튼 활성화                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 사전 준비 (최초 1회)

```bash
pip install python-docx
```

---

## 표준 절차

### 1. 원본 docx 복사

G 드라이브 검증 리포트를 로컬 `verification-reports/` 폴더로 복사:

```bash
cp "/g/공유 드라이브/리스닝마인드 DaaS/10. 고객사별/04. LG전자/시나리오별 데이터 검증/작업1_미국_스틱청소기_검색량분석_검증리포트.docx" \
   verification-reports/lg-us-stick-vacuum.docx
```

> 파일명은 자유. 단, 사이드카 `.meta.json` 도 동일 이름으로 둬야 함.

### 2. `.meta.json` 사이드카 작성

같은 위치에 `lg-us-stick-vacuum.meta.json` 생성:

```json
{
  "report_id": "lg-us-stick-vacuum",
  "card_slug": "discover-hidden-sub-markets",
  "title": "LG 미국 스틱청소기 클러스터 분석",
  "date": "2026-03",
  "anonymize": {
    "replace": {
      "LG전자": "Major Korean Appliance Brand",
      "bissell": "Brand B",
      "roborock": "Brand C"
    }
  },
  "publish": {
    "as_example_md": true,
    "as_sample_json": true
  },
  "labels": {
    "measured": "API 직접 반환값",
    "estimated": "AI 해석",
    "assumed": "전제 조건",
    "gap": "데이터 공백"
  }
}
```

**필드 설명**:

| 필드 | 필수 | 설명 |
|------|------|------|
| `report_id` | ✅ | 파일명에 사용. 영문 kebab-case 권장 |
| `card_slug` | ✅ | 노출될 카드 슬러그 (12개 중 하나) |
| `title` | ✅ | UI에 표시될 제목 |
| `date` | ✅ | `YYYY-MM` 형식 |
| `anonymize.replace` | ❌ | 치환 룰. 공개해도 무방한 경우 생략 가능 |
| `publish.as_example_md` | ❌ | 기본 `true` |
| `publish.as_sample_json` | ❌ | 기본 `true` |

### 3. 인게스트 실행

```bash
npm run ingest
```

출력 예:
```
발견된 검증 리포트: 1건

[Ingest] lg-us-stick-vacuum.docx
  → card: discover-hidden-sub-markets / report_id: lg-us-stick-vacuum
  ✓ skills/discover-hidden-sub-markets/examples/lg-us-stick-vacuum.md
  ✓ public/sample-data/discover-hidden-sub-markets--lg-us-stick-vacuum.json

  ✓ 인덱스 갱신: data/verification-reports.json (1 reports)
```

### 4. 생성물 검토 후 커밋·푸시

```bash
git add data/verification-reports.json public/sample-data/ skills/
git diff --cached   # 익명화 적용 검토
git commit -m "docs: add LG US stick vacuum verification report"
git push   # Vercel 자동 재배포 (2~3분 후 반영)
```

---

## 카드 슬러그 (12개)

| Slug | Endpoint |
|------|----------|
| `map-your-market` | intent_finder |
| `decode-why-people-search` | intent_finder |
| `see-the-full-buying-path` | path_finder |
| `discover-hidden-sub-markets` | cluster_finder |
| `spot-trends-6-months-early` | keyword_info |
| `track-your-true-market-share` | keyword_info |
| `separate-buyers-from-browsers` | keyword_info + LLM |
| `find-what-customers-actually-want` | cluster + intent |
| `benchmark-competitors-live` | keyword_info |
| `validate-ideas-before-you-build` | intent + keyword_info |
| `compare-markets-across-countries` | keyword_info × markets |
| `plug-into-your-ai-agents` | 4 endpoints |

---

## 보안 체크리스트

커밋 전 반드시 확인:

- [ ] 생성된 `.md` / `.json` 파일에 고객사 식별 정보 없음
- [ ] 매출·가격·내부 KPI 등 민감 수치 익명화/스케일 조정됨
- [ ] `verification-reports/` 폴더가 `git status` 에 나타나지 않음
- [ ] `git ls-files | grep verification-reports` 결과 비어 있음

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| `ModuleNotFoundError: docx` | `pip install python-docx` |
| 인덱스 갱신 안 됨 | `.meta.json` 사이드카 누락 → 같은 디렉토리에 작성 |
| UI에 안 나타남 | `data/verification-reports.json` 커밋 누락 / Vercel 빌드 실패 확인 |
| 익명화 실수 발견 | `meta.json` 수정 → 재실행 → 강제 푸시 (이전 커밋 rebase 불가 시 새 커밋으로 덮어쓰기) |
| 한글 깨짐 | docx 파일 인코딩 확인. Python 3.9+ 필요 |

---

## 향후 확장

- 인게스트 시 `pricing.referenceCase` 도 자동 갱신 (현재는 수동)
- 검증 리포트 추가 시 Slack 알림
- 익명화 규칙을 공통 dict로 추출 (조직 전체 표준 룰)
