# 명세: src/lib/notification-helper.ts

## 역할 요약

알림 생성 헬퍼. `createNotification`, `createVerificationApprovedNotification`, `createVerificationRejectedNotification`, `createBulkNotifications`, `getUserIdsByFilter` 제공. notifications 테이블 insert + 웹 푸시 발송.

## Public API

| 함수                                     | 설명                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `createNotification(data)`               | NotificationData로 notifications insert, sendPushToUser 호출 |
| `createVerificationApprovedNotification` | type: verification_approved, link: /mypage                   |
| `createVerificationRejectedNotification` | type: verification_rejected, rejectReason 포함               |
| `createBulkNotifications(userIds, data)` | 여러 사용자에게 동일 알림 insert, sendPushToUsers            |
| `getUserIdsByFilter(filter)`             | targetType별 profiles 조회 후 id[] 반환                      |

## NotificationData

type, userId, senderId?, title, message, priority?, link?, actionLabel?, actionUrl?, expiresInDays?, metadata?

## 사이드 이펙트

notifications insert. profiles select. sendPushToUser/sendPushToUsers.

## 핵심 규칙

1. expiresInDays 기본 30. metadata는 JSON.stringify.
2. 푸시 실패해도 알림 생성은 완료로 처리(.catch).
3. getUserIdsByFilter: targetType specific/provider/verification_status/all.
