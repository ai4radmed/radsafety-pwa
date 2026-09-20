# 테스트 명세: src/lib/watch/notify.ts

## 대상 구현체

- 경로: src/lib/watch/notify.ts
- 명세: .spec/src/lib/watch/notify.md

## 테스트 도구

Vitest. `supabase-server`(profiles 조회)·`notification-helper`(createBulkNotifications)·`telegram`·logger 모킹.

## 검증 항목

| describe                | it                                                            | 검증 내용                                                      |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| buildMemberNotification | 변화 없으면 null                                              | 삭제만 있어도 null                                             |
| buildMemberNotification | 신규·수정을 한 건으로 묶고 관리번호·분류·경로를 넣는다        | 제목 "신규 1건 · 수정 1건", 본문 `[2.045] 허가/신고 · …`, 경로 |
| buildMemberNotification | 5건 넘으면 나머지는 "외 N건"                                  | 8건 → 5줄 + "외 3건"                                           |
| buildAdminSummary       | 조용한 정상 실행은 null                                       | 1회 실패도 침묵                                                |
| buildAdminSummary       | baseline·변화·3회 연속 실패는 보고                            | 문안 포함 확인                                                 |
| notifyWatchResults      | active 회원 전원에게 소스당 1건, 삭제만 있으면 회원 알림 없음 | ids·type system_notice·link /kins, memberNotified 2, telegram  |
| notifyWatchResults      | 알림 실패는 삼키고 결과만 낮춘다                              | `{ memberNotified: 0, telegram: false }`                       |
