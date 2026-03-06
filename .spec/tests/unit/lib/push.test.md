# 테스트 명세: src/lib/push.ts

## 대상 구현체

- 경로: src/lib/push.ts
- 명세: .spec/src/lib/push.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe              | it                                      | 검증 내용                  |
| --------------------- | --------------------------------------- | -------------------------- |
| sendPushToUser        | VAPID 키가 없으면 조기 반환 (에러 없음) | DB/sendNotification 미호출 |
| sendPushToUsers       | 빈 배열 전달 시 에러 없이 완료          | resolves                   |
| sendPushToUsers       | 여러 userId를 Promise.allSettled로 처리 | 부분 실패해도 완료         |
| PushPayload 타입 검증 | 필수 필드(title, body)만으로 구성 가능  | 타입 오류 없음             |
| PushPayload 타입 검증 | 선택 필드(url, tag) 포함해도 정상 동작  | 정상                       |

## Mock/Setup

- vi.mock('web-push'), vi.mock('supabase-server')
- vi.stubEnv('PUBLIC_VAPID_KEY', ''), vi.stubEnv('VAPID_PRIVATE_KEY', '')
- beforeEach: vi.clearAllMocks(), console spy

## 기존 테스트 참조

- tests/unit/lib/push.test.ts_backup
