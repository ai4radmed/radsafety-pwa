# 테스트 명세: src/lib/email.ts

## 대상 구현체

- 경로: src/lib/email.ts
- 명세: .spec/src/lib/email.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe              | it                                             | 검증 내용             |
| --------------------- | ---------------------------------------------- | --------------------- |
| sendVerificationEmail | API 키 없으면 개발모드로 성공 반환             | messageId: 'dev-mode' |
| sendVerificationEmail | API 키 있으면 resend를 통해 이메일 발송        | mock messageId        |
| sendFeedbackEmail     | API 키 없으면 개발모드로 성공 반환             | messageId: 'dev-mode' |
| sendFeedbackEmail     | 첨부파일이 있어도 개발모드에서 정상 동작       | attachments 포함      |
| sendFeedbackEmail     | API 키 있으면 resend를 통해 피드백 이메일 발송 | mock messageId        |

## Mock/Setup

- vi.mock('resend') — Resend 클래스 mock
- vi.stubEnv('RESEND_API_KEY', '') 또는 're_test_key_12345'
- beforeEach: vi.restoreAllMocks(), console.log spy

## 기존 테스트 참조

- tests/unit/lib/email.test.ts_backup
