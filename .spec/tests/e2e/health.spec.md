# 명세: tests/e2e/health.spec.ts

## 대상

`GET /api/health` (배포/dev 서버 실동작). 비로그인 컨텍스트 기준.

## 검증 항목

| #   | 요청                                | 기대                                                                                      |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `GET /api/health`                   | 200, `Content-Type: application/json`, `Cache-Control: no-store`                          |
| 2   | 위 본문                             | `mode:"shallow"`, `status ∈ {ok,degraded,down}`, `version`·`releaseDate`·`ts` 존재        |
| 3   | 위 `checks`                         | 배열, 각 원소 `{name, layer, ok, ms}` 형태                                                |
| 4   | 위 응답                             | 본문에 실제 비밀 **값**(JWT `eyJ…` 형태) 미포함. env 변수 _이름_(공개)은 값 아니므로 허용 |
| 5   | `GET /api/health?deep=1` (비로그인) | 401                                                                                       |
| 6   | `ts`                                | 매 호출 갱신(두 번 호출 시 서로 다름) — 신선도                                            |

## 참고

- deep 200 경로(admin)는 인증 세션이 필요 → 인증 e2e(`TEST_AUTH=true`) 셋업에서만. 기본 스펙은 401 게이트까지 검증.
- status 는 배포 환경 실제 상태에 의존하므로 값 자체가 아닌 **enum 소속**만 단언.
