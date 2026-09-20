# 명세: src/lib/admin-notify.ts

## 역할 요약

관리자 업무 **메일 알림**. 2026-09-20 신설 — 관리자 업무 알림이 앱 내 알림 + **Dr. Ben 개인 텔레그램 DM** 뿐이라, 개발자가 아닌 관리자(위원회 담당자)는 앱을 열기 전에는 처리할 일을 알 수 없었다. 특히 **새 가입 신청은 알림이 아예 없었다**.

## Public API

| 이름                                                     | 설명                                                                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `adminNotifyRecipients()`                                | 서버 전용 `ADMIN_NOTIFY_EMAILS` 우선 → 없으면 `PUBLIC_ADMIN_EMAILS`(기존 목록) 폴백. 쉼표 구분, 공백 정리            |
| `sendAdminNotice({subject, lines, linkPath, linkLabel})` | Resend 로 1통. `[RadSafety] ` 접두 제목 + 본문 줄 + 절대 URL 버튼. **throw 하지 않고** 발송한 수신자 수 반환(0=생략) |

## 사이드 이펙트

Resend 메일 1통. 수신자 0명이거나 `RESEND_API_KEY` 미설정이면 생략.

## 핵심 규칙

1. **본문·첨부·제안 내용은 싣지 않는다** — 제목·건수·분류·아이디·링크만(텔레그램 규칙과 동일). 익명 제안의 내용이 메일함에 남지 않게 하는 것이 요점.
2. **실패해도 throw 하지 않는다** — 메일이 안 가는 것이 가입·제출·제안 처리를 되돌릴 이유는 아니다. 경고 로그만.
3. **수신자 목록 폴백** — 관리자 목록을 기존 `PUBLIC_ADMIN_EMAILS` 한 곳에서 관리하던 흐름을 깨지 않으면서, 이메일을 클라이언트 번들에 노출하고 싶지 않을 때 서버 전용 `ADMIN_NOTIFY_EMAILS` 로 옮겨갈 수 있다(`PUBLIC_` 접두는 번들에 인라인된다).
4. 발신 `noreply@radsafety.kr`(Resend 검증 도메인), 링크는 절대 URL(`https://radsafety.kr` + path).

## 붙은 이벤트 (2026-09-20)

| 이벤트                | 앱 알림     | 텔레그램 | **메일**                     | 위치                                                                                                          |
| --------------------- | ----------- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 새 가입 신청(pending) | ✅ **신설** | —        | ✅ **신설**                  | `notifyAdminsOfSignup` — `signUpWithUsername`(아이디) · `claimUsername`(카카오, `status==='pending'` 일 때만) |
| 회원기관 등록 요청    | ✅          | —        | ✅                           | `notifyAdminsOfHospitalRequest`                                                                               |
| 검토 대기 제출물      | ✅          | ✅       | ✅                           | `notifySubmission`                                                                                            |
| 새 제도개선 제안      | —           | ✅       | ✅                           | `submitProposal`(proposals.ts)                                                                                |
| 의견보내기            | —           | —        | ✅(기존 `sendFeedbackEmail`) | `sendFeedback`                                                                                                |
| KINS 감시 요약        | —           | ✅       | —                            | 매일 오는 하트비트라 메일은 과함                                                                              |

**중복 방지**: 아이디 가입은 첫 접속 게이트(`claimUsername`)를 타지 않고, 카카오 가입은 `signUpWithUsername` 을 타지 않는다. 기존 active 회원의 아이디 전환은 `currentStatus === 'pending'` 조건에서 걸러진다.

## 관련

- `.spec/src/lib/email.ts`(의견보내기) · `.spec/src/lib/telegram.md` · 테스트 `tests/unit/lib/admin-notify.test.ts`
