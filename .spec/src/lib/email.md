# 명세: src/lib/email.ts

## 역할 요약

Resend 기반 이메일 발송. `sendVerificationEmail`(인증 코드), `sendFeedbackEmail`(관리자 피드백 알림) 제공. API Key 없으면 개발 모드(콘솔/스킵).

## Public API

| 함수                    | 입력                                                                       | 설명                                                                                 |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `sendVerificationEmail` | to, code, userName?                                                        | 인증 코드 이메일. from: 방사선안전관리앱 <noreply@radsafety.kr>, subject: [RadSafety] 이메일 인증 코드 |
| `sendFeedbackEmail`     | adminEmails, userName, userEmail, title, message, feedbackId, attachments? | 관리자에게 피드백 알림. replyTo: userEmail                                           |

## 사이드 이펙트

Resend API 호출. `RESEND_API_KEY`, `PUBLIC_SITE_URL` 환경변수.

## 핵심 규칙

1. API Key 없으면 개발 모드: sendVerificationEmail은 콘솔에 코드 출력, sendFeedbackEmail은 스킵.
2. getEmailTemplate, getFeedbackEmailTemplate: HTML 인라인 스타일, 한국어.
3. adminUrl: `${PUBLIC_SITE_URL}/admin/feedback`.
