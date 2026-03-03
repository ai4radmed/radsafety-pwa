# 명세: src/actions/index.ts

## 역할 요약

Astro server actions 진입점. `defineAction`으로 `saveFinding`, `deleteFinding`, `sendVerificationCode`, `verifyEmailCode`, `sendNotification`, `sendFeedback`를 export한다. Supabase, 이메일, 푸시, 로거를 사용한다.

## Public API (server 객체)

| 액션                   | input                                                                                                                  | 설명                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `saveFinding`          | id?, title, findingType, tags, year, description, violationClause?, solution?                                          | findings 테이블 insert/update. `id`가 `local-`로 시작하면 insert |
| `deleteFinding`        | id                                                                                                                     | findings 삭제. `local-` id는 무시                                |
| `sendVerificationCode` | email, userId                                                                                                          | 6자리 코드 생성, DB 저장, 이메일 발송                            |
| `verifyEmailCode`      | code(6자), userId                                                                                                      | 코드 검증 후 verified 업데이트                                   |
| `sendNotification`     | senderId, targetType, provider?, verificationStatus?, specificUserId?, title, message, link?, actionLabel?, actionUrl? | 관리자만. profiles 조회 후 notifications insert, 웹 푸시 발송    |
| `sendFeedback`         | userId?, userName, userEmail, title, message, attachments?                                                             | feedback insert, 관리자 이메일 발송                              |

## 사이드 이펙트

- DB: findings, email_verification_codes, profiles, notifications, feedback
- 이메일: sendVerificationEmail, sendFeedbackEmail
- 푸시: sendPushToUsers
- 로거: createLogger('actions')

## 핵심 규칙

1. `accept: 'form'`은 saveFinding만 사용.
2. sendVerificationCode: 코드 유효 10분, 이메일 실패해도 DB 저장 성공 시 성공 처리.
3. sendNotification: targetType별 profiles 필터(all/provider/verification_status/specific).
4. sendFeedback: 이메일 실패해도 DB 저장 성공 시 성공 처리.
