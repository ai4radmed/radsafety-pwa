# 명세: src/lib/logger.ts

## 역할 요약

JSON 형식 로그 출력 유틸리티. `createLogger(module)`로 info/warn/error 메서드를 제공하며, `PUBLIC_LOG_LEVEL` 환경변수로 최소 레벨 제어(기본: warn).

## Public API

| 이름                           | 반환                    | 설명                                                                                                                     |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `createLogger(module: string)` | `{ info, warn, error }` | 각 메서드는 (message, data?) 시그니처. `shouldLog`로 레벨 필터링 후 `console.log/warn/error(JSON.stringify(entry))` 호출 |

## 사이드 이펙트

`import.meta.env.PUBLIC_LOG_LEVEL` 읽기. console 출력.

## 핵심 규칙

1. LogEntry: level, module, message, data?, timestamp(ISO).
2. LEVEL_PRIORITY: info=0, warn=1, error=2. minLevel 이상만 출력.
3. `createLog` 내부 함수로 entry 객체 생성.
