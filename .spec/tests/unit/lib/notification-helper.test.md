# 테스트 명세: src/lib/notification-helper.ts

## 대상 구현체

- 경로: src/lib/notification-helper.ts
- 명세: .spec/src/lib/notification-helper.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                               | it                                                     | 검증 내용       |
| -------------------------------------- | ------------------------------------------------------ | --------------- |
| NotificationData 타입                  | type, userId, title, message 필수                      | 인터페이스 검증 |
| createNotification                     | supabaseAdmin.from insert 호출                         | mock 검증       |
| createNotification                     | sendPushToUser 호출 (실패해도 완료)                    | .catch 패턴     |
| getUserIdsByFilter                     | targetType specific 시 specificUserId 반환             | 특정 사용자     |
| getUserIdsByFilter                     | targetType all 시 profiles select                      | 전체 조회       |
| createVerificationRejectedNotification | createNotification 호출하여 verification_rejected 타입 | mock 검증       |
| createBulkNotifications                | 여러 userId에 insert 호출                              | mock 검증       |

## Mock/Setup

- vi.mock supabase-server, logger, push
- supabaseAdmin.from().insert().select().single() 체인 mock

## 유지보수 목적

- 알림 생성 로직 변경 시 회귀 방지
