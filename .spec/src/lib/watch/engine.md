# 명세: src/lib/watch/ (engine.ts · types.ts · supabase-store.ts · index.ts)

## 역할 요약

외부 게시판 갱신 감시의 **코어**. KINS 연계 트랙 K-3(2026-09-20, `documents/privacy_redesign_plan.md`). 소스 어댑터(`sources/*.ts`)가 목록 API 에서 뽑은 `WatchItem[]` 을 DB 의 직전 상태(`watch_items`)와 **집합 비교**해 신규·수정·삭제를 판정하고, 안전장치(급감·연속 실패·baseline)를 적용한다. 알림은 `notify.ts`, 호출은 `/api/cron/watch`.

왜 집합 비교인가: RASIS 목록은 날짜순이 아니라 분류(관리번호)순이라 새 글이 중간에 끼어든다. "건수 증가"나 "맨 위 글"로는 못 잡고 건별 지문이 필요하다.

## Public API (`index.ts` 재수출)

| 이름                                       | 설명                                                                                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WATCH_SOURCES`                            | 감시 대상 레지스트리 `[kinsSosSource, kinsPubSource]`. 새 소스 = 어댑터 파일 + 여기 한 줄.                                                                                                     |
| `computeDiff(existing, next)`              | 순수. `{ added, changed, missing }`. 삭제 확정 행(`removedAt`)이 다시 보이면 **added** 로 취급.                                                                                                |
| `isSuspiciousDrop(prevCount, nextCount)`   | 순수. `nextCount === 0` 또는 직전 정상 건수의 **절반 미만**이면 true. 직전 건수 없으면(최초) false.                                                                                            |
| `runSource(source, store, {persist, now})` | 한 소스 1회 실행. **절대 throw 하지 않고** `SourceRunResult` 로 보고(다른 소스를 막지 않기 위해). `persist:false` 는 dry-run(스토어 무기록).                                                   |
| `MISSING_THRESHOLD` = 2                    | 연속 누락 이 횟수면 삭제 확정(하루 1회 실행 → 이틀).                                                                                                                                           |
| `FAILURE_ALERT_THRESHOLD` = 3              | 연속 실패 이 횟수부터 관리자 텔레그램 경고(`notify.ts`).                                                                                                                                       |
| `supabaseWatchStore`                       | `WatchStore` 의 Supabase 구현(`watch_items`/`watch_sources`, 서비스 롤).                                                                                                                       |
| 타입                                       | `WatchItem`(externalId·title·category·fingerprint·detail) · `WatchSource`(id·label·guide·link·fetchItems) · `StoredItem` · `SourceState` · `WatchDiff` · `SourceRunResult` · `WatchStore` 계약 |

## `runSource` 상태 흐름

```
fetchItems 실패 ──────────────→ status 'error'      failures+1, lastError 저장. 스토어 항목 무변경.
급감(isSuspiciousDrop) ───────→ status 'suspicious' failures+1. diff 생략 — 기존 건이 "삭제"로 오판되지 않는다.
기존 행 0 (최초) ─────────────→ status 'baseline'   전부 upsert + baseline_at. added 비움(폭주 방지).
그 외 ────────────────────────→ status 'ok'         upsertSeen(전체, changed_at 은 changed 만) → markMissing(missing_count+1, 임계면 removed_at) → 상태 갱신(failures 0)
```

## 사이드 이펙트

`persist` 가 true 일 때만 `WatchStore` 를 통해 DB 쓰기. 네트워크는 어댑터(`source.fetchItems`)가 담당. 알림은 하지 않는다(`notify.ts` 분리).

## 핵심 규칙

1. **본문 미저장** — `WatchItem` 에 본문 필드가 없다. 어댑터는 본문을 지문 계산에만 쓴다.
2. **오판 방지가 감지보다 우선** — 잘린 응답(어댑터가 rowCount 불일치로 throw)·급감·0건은 diff 를 돌리지 않는다. 하루 늦게 잡는 것이 158건을 삭제로 잘못 알리는 것보다 낫다.
3. **baseline 은 조용히** — 최초 실행(또는 테이블 비운 뒤 재실행)은 알림 대상이 없다.
4. **삭제는 행을 지우지 않는다** — `removed_at` 표시. 재등장 시 신규로 알림.
5. `changed_at` 은 지문이 바뀐 건만 갱신(스토어가 두 묶음으로 upsert).
6. 엔진은 Supabase 를 모른다 — `WatchStore` 계약만. 테스트는 메모리 스토어.

## 관련

- 어댑터: `.spec/src/lib/watch/sources/kins-sos.md`, `kins-pub.md`
- 알림: `.spec/src/lib/watch/notify.md`
- 엔드포인트: `.spec/src/pages/api/cron/watch.md`
- DB: `.spec/sql_query/migrate_add_watch_tables.md`
- 테스트: `tests/unit/lib/watch/engine.test.ts`
