# 명세: src/actions/index.ts

## 역할 요약

Astro server actions 진입점. `defineAction`으로 `saveFinding`, `deleteFinding`, `sendVerificationCode`, `verifyEmailCode`, `sendNotification`, `sendFeedback`, `signUpWithUsername`, `signInWithUsername`, `claimUsername`를 export한다. Supabase, 이메일, 푸시, 로거를 사용한다.

## Public API (server 객체)

| 액션                   | input                                                                                                                  | 설명                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saveFinding`          | id?, title, findingType, tags, year, description, violationClause?, solution?                                          | findings 테이블 insert/update. `id`가 `local-`로 시작하면 insert                                                                                                                                                                                                                                        |
| `deleteFinding`        | id                                                                                                                     | findings 삭제. `local-` id는 무시                                                                                                                                                                                                                                                                       |
| `sendVerificationCode` | email, userId                                                                                                          | 6자리 코드 생성, DB 저장, 이메일 발송                                                                                                                                                                                                                                                                   |
| `verifyEmailCode`      | code(6자), userId                                                                                                      | 코드 검증 후 verified 업데이트                                                                                                                                                                                                                                                                          |
| `sendNotification`     | senderId, targetType, provider?, verificationStatus?, specificUserId?, title, message, link?, actionLabel?, actionUrl? | 관리자만. profiles 조회 후 notifications insert, 웹 푸시 발송                                                                                                                                                                                                                                           |
| `sendFeedback`         | userId?, userName, userEmail, title, message, attachments?                                                             | feedback insert, 관리자 이메일 발송                                                                                                                                                                                                                                                                     |
| `approveVerification`  | adminId, targetUserId                                                                                                  | 관리자 권한 확인 후 타겟 사용자 인증 승인 (verified)                                                                                                                                                                                                                                                    |
| `rejectVerification`   | adminId, targetUserId, reason                                                                                          | 관리자 권한 확인 후 타겟 사용자 인증 반려 (rejected)                                                                                                                                                                                                                                                    |
| `revokeVerification`   | adminId, targetUserId                                                                                                  | 관리자 권한 확인 후 타겟 사용자 인증 회수 (temp_verified)                                                                                                                                                                                                                                               |
| `signUpWithUsername`   | username, password(8자+)                                                                                               | Stage 1-A. `profiles.username` 중복확인 → `auth.admin.createUser`(가짜 이메일 `<username>@radsafety.invalid`, `email_confirm:true`) → `profiles` insert. profiles insert 실패 시 방금 만든 auth 계정 롤백(삭제). 반환 `{success, email}` — 클라이언트가 그 email 로 `signInWithPassword` 를 이어서 호출 |
| `signInWithUsername`   | username                                                                                                               | `profiles.username` → id → `auth.admin.getUserById` 로 email 조회만. 비밀번호 검증은 하지 않음(클라이언트가 반환된 email 로 `signInWithPassword` 호출). 아이디 없음/조회 실패 모두 같은 문구(`아이디 또는 비밀번호가 올바르지 않습니다.`)로 응답해 아이디 존재 여부 비노출                              |
| `claimUsername`        | userId(uuid), username                                                                                                 | Stage B(전환) 몫이지만 UI 없이 재사용 가능하도록 지금 구현. 다른 사용자가 쓰는 아이디면 에러(본인 재확정은 허용). `auth.admin.updateUserById`로 email 을 가짜 이메일로 교체 + `profiles.username/login_email(NULL)/nickname(NULL)` 갱신                                                                 |

## 사이드 이펙트

- DB: findings, email_verification_codes, profiles, notifications, feedback
- Supabase Admin Auth API: `auth.admin.createUser`/`getUserById`/`updateUserById`/`deleteUser` (signUpWithUsername/signInWithUsername/claimUsername)
- 이메일: sendVerificationEmail, sendFeedbackEmail
- 푸시: sendPushToUsers
- 로거: createLogger('actions')

## 핵심 규칙

1. `accept: 'form'`은 saveFinding만 사용.
2. sendVerificationCode: 코드 유효 10분, profiles에서 사용자 이름을 조회하여 이메일 개인화. 이메일 발송 실패 시 에러 처리.
3. sendNotification: targetType별 profiles 필터(all/provider/verification_status/specific).
4. sendFeedback: 이메일 실패해도 DB 저장 성공 시 성공 처리.
5. sendFeedback 수신자: `resolveFeedbackRecipients(title, userEmail, DEVELOPER_EMAILS)` 로 결정. `DEVELOPER_EMAILS` 는 서버 전용 env(쉼표 구분, PUBLIC 아님)를 모듈 로드 시 파싱 — 테스트성 의견(`[월간점검]` + 관리자 발신)만 개발자 목록으로 라우팅되고, 미설정 시 종전대로 관리자 전원.
6. `usernameSchema`(모듈 내부): trim → 소문자화 → `^[a-z0-9_-]{3,20}$` 검증. 세 액션 공통 사용 — DB 에는 항상 소문자만 저장된다(대소문자 구분 없는 로그인은 저장 시 정규화로 구현, DB 단 citext/대소문자무시 인덱스는 쓰지 않음).
7. 가짜 이메일은 `<username>@radsafety.invalid` 로 결정적으로 파생(모듈 내부 `fakeEmailFor`) — RFC 2606 예약 도메인이라 실제 메일 발송·등록 불가.
8. **세션 쿠키는 이 세 액션이 직접 설정하지 않는다.** `context`(cookies/request)를 쓰지 않고 email 만 반환 — 기존 개발자 테스트 로그인(`login.astro`)과 동일하게 **클라이언트의 브라우저 supabase 클라이언트가 `signInWithPassword` 를 호출**해 세션을 연다. 이 코드베이스의 다른 액션들도 context 를 쓰지 않는 관례(테스트 모의 `tests/mocks/astro-actions.ts` 도 context 인자를 지원하지 않음)를 따른 것.
9. `claimUsername` 은 세션이 아니라 클라이언트가 넘긴 `userId` 를 그대로 신뢰한다 — `approveVerification`/`sendNotification` 등 기존 관리자 액션과 같은 관례(명시적 id 전달, context 기반 아님).
