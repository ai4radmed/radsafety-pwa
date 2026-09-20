# 테스트 명세: src/lib/watch/engine.ts

## 대상 구현체

- 경로: src/lib/watch/engine.ts
- 명세: .spec/src/lib/watch/engine.md

## 테스트 도구

Vitest. `WatchStore` 계약을 메모리 구현(`memoryStore`)으로 채워 Supabase 없이 엔진 흐름 전체를 돌린다. logger 모킹.

## 검증 항목

| describe                | it                                                                    | 검증 내용                                                         |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| isSuspiciousDrop        | 0건은 항상 의심                                                       | prev null/100 모두 true                                           |
| isSuspiciousDrop        | 직전 건수가 없으면 의심하지 않는다                                    | 최초 실행                                                         |
| isSuspiciousDrop        | 절반 미만이면 의심, 절반 이상이면 정상                                | 158→78 true, 158→79 false, 증가 false                             |
| computeDiff             | 집합 비교 — 순서와 무관                                               | added/changed/missing 분리                                        |
| computeDiff             | 안 보이는 기존 건은 missing (삭제 확정 행 제외)                       | `removedAt` 행은 missing 에 안 들어감                             |
| computeDiff             | 삭제 확정됐던 건이 다시 보이면 신규                                   | added 로                                                          |
| runSource               | 최초 실행은 baseline                                                  | status baseline, added 비움, 스토어에 저장, baselineAt·lastCount  |
| runSource               | 두 번째 실행부터 신규·수정 보고 + 상태 갱신                           | upsert 호출 인자(changed 1), lastCount, failures 0                |
| runSource               | 누락은 MISSING_THRESHOLD 회 연속일 때만 삭제 확정                     | 1회: missingCount 1·removedAt null / 2회: removed 확정            |
| runSource               | 수집 실패는 throw 하지 않고 error + 연속 실패 증가                    | failures 2→3, upsert 미호출                                       |
| runSource               | 급감은 diff 를 돌리지 않는다                                          | suspicious, markMissing 미호출, 기존 행 무변경                    |
| runSource               | persist:false 는 스토어에 아무것도 쓰지 않는다                        | calls 비어 있음, diff 결과는 반환                                 |
| runSource — 스토어 오류 | 테이블 미생성 등 스토어 예외도 throw 하지 않고 error + 즉시 경고 수준 | `error` 에 원인 포함, `consecutiveFailures ≥ 3`(관리자 경고 대상) |
