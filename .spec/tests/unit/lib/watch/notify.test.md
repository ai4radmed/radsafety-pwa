# 테스트 명세: src/lib/watch/notify.ts

## 대상 구현체

- 경로: src/lib/watch/notify.ts
- 명세: .spec/src/lib/watch/notify.md

## 테스트 도구

Vitest. `supabase-server`(profiles 조회)·`notification-helper`(createBulkNotifications)·`telegram`·logger 모킹.

## 검증 항목

| describe                 | it                                                            | 검증 내용                                                      |
| ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| buildMemberNotification  | 변화 없으면 null                                              | 삭제만 있어도 null                                             |
| buildMemberNotification  | 신규·수정을 한 건으로 묶고 관리번호·분류·경로를 넣는다        | 제목 "신규 1건 · 수정 1건", 본문 `[2.045] 허가/신고 · …`, 경로 |
| buildMemberNotification  | 5건 넘으면 나머지는 "외 N건"                                  | 8건 → 5줄 + "외 3건"                                           |
| buildAdminSummary        | changes 모드: 조용한 정상 실행은 null                         | 1회 실패도 침묵                                                |
| buildAdminSummary        | changes 모드: baseline·변화·3회 연속 실패는 보고              | 문안 포함 확인                                                 |
| buildAdminSummary        | all 모드: 변화 없어도 하트비트 문안                           | 머리말 `— 변화 없음`, `변화 없음 (158건)`, `실패 1회째`        |
| buildAdminSummary        | all 모드: 변화가 있으면 머리말에 "변화 없음" 없음             |                                                                |
| getWatchReportMode       | 기본 all, WATCH_REPORT=changes 면 changes, 이상값은 all       | `vi.stubEnv`                                                   |
| notifyWatchResults       | active 회원 전원에게 소스당 1건, 삭제만 있으면 회원 알림 없음 | ids·type system_notice·link /kins, memberNotified 2, telegram  |
| notifyWatchResults       | 알림 실패는 삼키고 결과만 낮춘다                              | `{ memberNotified: 0, telegram: false }`                       |
| memberFilter · 직접 주소 | 회원 알림은 필터를 통과한 건만, 전부 걸러지면 null            | 제목 "신규 1건", 줄에 게시일·부서·URL, 걸러진 건 미포함        |
| memberFilter · 직접 주소 | 관리자 요약은 전체 신규와 회원 알림 건수를 함께 적는다        | `신규 2 · 수정 0 · 삭제 0 · 회원 알림 1`                       |
