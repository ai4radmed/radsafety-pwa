# 명세: src/lib/notification-helper.ts

## 역할 요약

알림 생성 헬퍼. `createNotification`, `createBulkNotifications`, `getUserIdsByFilter` 제공. notifications 테이블 insert + 웹 푸시 발송. (2-2, 2026-09-19: `createVerificationApprovedNotification`·`createVerificationRejectedNotification` 삭제 — 명부 대조 인증 체계 폐지.)

## Public API

| 함수                                     | 설명                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `createNotification(data)`               | NotificationData로 notifications insert, sendPushToUser 호출 |
| `createBulkNotifications(userIds, data)` | 여러 사용자에게 동일 알림 insert, sendPushToUsers            |
| `getUserIdsByFilter(filter)`             | targetType별 profiles 조회 후 id[] 반환                      |

## NotificationData

- **type**: `verification_approved` | `verification_rejected` | `admin_message` | `system_notice` | `announcement` (앞 둘은 과거 알림 행 호환용 값 — 새로 만들지 않는다)
- **fields**: userId, senderId?, title, message, priority?, link?, actionLabel?, actionUrl?, expiresInDays?, metadata?

## 사이드 이펙트

notifications insert. profiles select. sendPushToUser/sendPushToUsers.

## 핵심 규칙

1. expiresInDays 기본 30. metadata는 JSON.stringify.
2. 푸시 실패해도 알림 생성은 완료로 처리(.catch).
3. getUserIdsByFilter: targetType specific/provider/all (`verification_status` 대상은 2-2에서 제거).
