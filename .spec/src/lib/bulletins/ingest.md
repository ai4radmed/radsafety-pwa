# 명세: src/lib/bulletins/ingest.ts

## 역할 요약

감시 결과(`WatchItem[]`) → `bulletins` 사건 레코드. `/api/cron/watch` 가 소스별 `runSource` 뒤에 호출. 감시 엔진(watch_items, "무엇이 바뀌었나")과 분리해 **baseline(최초 실행)에도 백필**이 되게 한다. K-1(2026-09-20).

## Public API

| 이름                                                 | 설명                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `bulletinSourceOf(watchSourceId)`                    | `'nsic-accidents'→'nsic'`, `'nssc-press'→'nssc'`, 그 외 `null`(대상 아님)                                                     |
| `planIngest(source, items, existingIds, {firstRun})` | 순수. 기존 (source, external_id) 제외. **nsic**: 최초 = `published` 백필, 이후 = `pending`. **nssc**: `relevant` 만 `pending` |
| `suggestParent(occurredAt, candidates)`              | 순수. 사고일 ±`SUGGEST_WINDOW_DAYS`(60) 안 가장 가까운 속보 id, 없으면 null                                                   |
| `toIsoDate(s)`                                       | `'2026.09.18'`·`'2026-08-02'` → ISO, 그 외 null                                                                               |
| `ingestBulletins(watchSourceId, items, {persist})`   | throw 없이 `IngestResult{source, inserted, backfilled, pendingTitles, error?}`. NSIC 신규는 건별 상세(개요·원인) 조회         |

## 사이드 이펙트

`bulletins` upsert(`onConflict source,external_id`, **ignoreDuplicates** — 관리자 편집 보존), `nssc` 루트 후보 조회, NSIC 상세 fetch(신규만). `persist:false`(dry) 면 읽기·계획만.

## 핵심 규칙

1. **NSIC 백필은 published** — 이미 정제된 공개 사례집이라 검토 없이 첫날부터 채운다(관리자는 이후 prep_note 만 보태면 됨). 이후 신규는 pending.
2. **NSSC 는 관련 건만** 사건 후보(회의 개최·IAEA 등 무관 보도는 bulletins 에 안 들어간다 — watch 관리자 하트비트에는 남는다).
3. **스레드 후보만 자동**(`suggested_parent_id`) — 확정(`parent_id`)은 관리자. 근거: 두 기관 사이 공통 ID 없음, 오판 = 회원 오알림(Dr. Ben 2026-09-20).
4. 상세 조회 실패 시 목록 정보만 저장(개요·원인 null) — 수집을 막지 않는다.
5. 소스 하나의 실패가 다른 소스·감시 결과를 막지 않는다(결과 객체로 보고).

## 관련

- 어댑터 `.spec/src/lib/watch/sources/nsic-accidents.md`·`nssc-press.md` · 액션 `reviewBulletin`(`.spec/src/actions/index.md`) · 화면 `.spec/src/pages/admin/bulletins.md`·`bulletins.md` · DB `.spec/sql_query/migrate_add_bulletins.md`
- 테스트 `tests/unit/lib/bulletins/ingest.test.ts`
