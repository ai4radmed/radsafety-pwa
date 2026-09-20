# 명세: src/lib/watch/notify.ts

## 역할 summary

감시 결과(`SourceRunResult[]`)를 **회원 알림(앱 내 + 웹푸시)** 과 **관리자 텔레그램** 으로 전달. 엔진과 분리해 dry-run 에서 통째로 건너뛸 수 있게 한다.

## Public API

| 이름                                      | 설명                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildMemberNotification(source, result)` | 순수. 신규+수정 0건이면 `null`. 제목 `"<label> 신규 N건 · 수정 M건"`, 본문 = 최대 5줄 `[관리번호] 분류 · 제목` + `… 외 K건` + `경로: <guide>`. |
| `buildAdminSummary(results)`              | 순수. 알릴 것 없으면 `null`. 변화(신규·수정·삭제)·baseline·연속 실패 ≥ `FAILURE_ALERT_THRESHOLD`(3) 만 적는다.                                 |
| `notifyWatchResults(sources, results)`    | 위 둘을 실행. 회원 = `profiles.status='active'` 전원, `createBulkNotifications(type 'system_notice', link source.link, 60일)`. 텔레그램 1통.   |

## 사이드 이펙트

`notifications` insert(소스당 실행당 **1건**), 웹푸시(helper 가 담당), 텔레그램 `sendMessage`. 전달 실패는 로그만 — cron 응답을 실패로 바꾸지 않는다.

## 핵심 규칙

1. **묶음 알림** — 한 실행에 여러 건이 와도 소스당 1건. 알림함 폭주 방지.
2. **삭제는 회원에게 알리지 않는다** — 관리자 텔레그램에만("삭제 N").
3. **보고 모드 = env `WATCH_REPORT`** (2026-09-20 Dr. Ben): 당분간 **`all`(기본)** — 변화가 없어도 매일 "변화 없음 · SOS 158건 · 간행물 40건" 하트비트를 보내 **점검 프로세스 자체가 살아 있음**을 확인한다. 운영이 안정되면 Vercel env `WATCH_REPORT=changes` + 재배포로 전환(코드 변경 없음) — 그때부터 변화·baseline·3회 연속 실패만 보고하고 조용한 정상은 침묵.
4. baseline 은 관리자에게만 "N건 저장" 1통 — 첫 배포가 제대로 붙었는지 확인용.
5. 수신 대상은 `active` 만(pending·suspended·banned 제외). 관리자도 active 면 받는다.
6. 링크는 앱 내 `/kins`(외부 직접 주소가 없으므로) — 카드에서 경로 안내를 다시 본다.

## 관련

- `.spec/src/lib/notification-helper.md`, `.spec/src/lib/telegram.md` · 테스트 `tests/unit/lib/watch/notify.test.ts`
