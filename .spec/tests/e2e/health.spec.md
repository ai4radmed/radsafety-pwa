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
| 7   | `?deep=1` + 잘못된 `x-health-token` | 401 (틀린 머신 토큰은 deep 을 열지 못함 — 토큰 미설정/불일치 모두)                        |

## 참고

- deep 200 경로는 두 가지: (a) admin 쿠키 — 인증 세션 필요, 인증 e2e(`TEST_AUTH=true`) 셋업에서만; (b) 머신 토큰(`x-health-token`=`HEALTH_CHECK_TOKEN`) — 실 토큰이 필요해 기본 스펙에서 성공 경로는 단언하지 않는다. 기본 스펙은 **게이트가 닫혀 있음**(미인증·오토큰 모두 401)까지만 검증.
- status 는 배포 환경 실제 상태에 의존하므로 값 자체가 아닌 **enum 소속**만 단언.
