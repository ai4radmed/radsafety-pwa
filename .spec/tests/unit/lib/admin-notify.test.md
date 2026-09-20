# 테스트 명세: src/lib/admin-notify.ts

## 대상 구현체

- 경로: src/lib/admin-notify.ts (+ src/actions/index.ts·proposals.ts 배선)
- 명세: .spec/src/lib/admin-notify.md

## 테스트 도구

Vitest. `resend` 모듈과 logger 를 모의하고 env 는 `vi.stubEnv`. 배선은 파일 소스 읽기로 고정.

## 검증 항목

| describe  | it                                                                 | 검증 내용                                             |
| --------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| 수신자    | ADMIN_NOTIFY_EMAILS 우선, 없으면 PUBLIC_ADMIN_EMAILS 폴백          | 쉼표·공백 처리                                        |
| 수신자    | 둘 다 비면 빈 목록                                                 |                                                       |
| 발송      | `[RadSafety] ` 접두 제목, 링크는 절대 URL(html·text 모두)          |                                                       |
| 발송      | 수신자·API 키 미설정이면 조용히 생략(0, 발송 없음)                 |                                                       |
| 발송      | 발송 실패(에러 응답·예외)도 throw 하지 않는다                      | 업무 처리 보존                                        |
| 소스 계약 | 새 가입 신청 — 앱 알림 + 메일, 아이디/카카오 양쪽, pending 일 때만 | `notifyAdminsOfSignup`, `currentStatus === 'pending'` |
| 소스 계약 | 기관 등록 요청·검토 대기 제출물에도 메일                           |                                                       |
| 소스 계약 | 제안 메일에 본문·작성자 없음                                       | 익명 채널 원칙                                        |
