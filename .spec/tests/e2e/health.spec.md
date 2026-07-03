# 명세: tests/e2e/health.spec.ts

## 대상

`GET /api/health` (배포/dev 서버 실동작). 비로그인 컨텍스트 기준.

## 검증 항목

| #   | 요청                                | 기대                                                                               |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `GET /api/health`                   | 200, `Content-Type: application/json`, `Cache-Control: no-store`                   |
| 2   | 위 본문                             | `mode:"shallow"`, `status ∈ {ok,degraded,down}`, `version`·`releaseDate`·`ts` 존재 |
| 3   | 위 `checks`                         | 배열, 각 원소 `{name, layer, ok, ms}` 형태                                         |
| 4   | 위 응답                             | 본문 문자열에 anon key·service key 등 **비밀값 미포함**(정규식 검사)               |
| 5   | `GET /api/health?deep=1` (비로그인) | 401                                                                                |
| 6   | `ts`                                | 매 호출 갱신(두 번 호출 시 서로 다름) — 신선도                                     |

## 참고

- deep 200 경로(admin)는 인증 세션이 필요 → 인증 e2e(`TEST_AUTH=true`) 셋업에서만. 기본 스펙은 401 게이트까지 검증.
- status 는 배포 환경 실제 상태에 의존하므로 값 자체가 아닌 **enum 소속**만 단언.
