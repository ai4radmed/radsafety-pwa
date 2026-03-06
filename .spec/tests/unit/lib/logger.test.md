# 테스트 명세: src/lib/logger.ts

## 대상 구현체

- 경로: src/lib/logger.ts
- 명세: .spec/src/lib/logger.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe     | it                                      | 검증 내용                               |
| ------------ | --------------------------------------- | --------------------------------------- |
| createLogger | info는 console.log로 JSON 출력          | level, module, message, data, timestamp |
| createLogger | warn은 console.warn으로 출력            | level warn                              |
| createLogger | error는 console.error로 출력            | level error, data                       |
| createLogger | data 없이 호출 시 data 필드는 undefined | data undefined                          |
| createLogger | timestamp는 ISO 8601 형식               | toISOString() 일치                      |

## Mock/Setup

- beforeEach: vi.restoreAllMocks()
- console.log, console.warn, console.error spy

## 기존 테스트 참조

- tests/unit/lib/logger.test.ts_backup
