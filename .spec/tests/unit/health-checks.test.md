# 명세: tests/unit/lib/health-checks.test.ts

## 대상

`src/lib/health-checks.ts` — 점검 함수·`runChecks`. Supabase(`supabase-server`)는 mock, env 는 `vi.stubEnv`.

## 검증 항목

| #   | 대상                 | 시나리오                                            | 기대                                                                    |
| --- | -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | checkAppHost         | 항상                                                | `ok:true`, layer 1                                                      |
| 2   | checkConfig          | 필수 env 전부 존재 + 유효 URL                       | `ok:true`                                                               |
| 3   | checkConfig          | 필수 env 누락                                       | `ok:false`, detail 에 누락 키 이름                                      |
| 4   | checkConfig          | PUBLIC_SUPABASE_URL 형식 불량                       | `ok:false`                                                              |
| 5   | checkConfig          | 값·비밀 미노출                                      | detail 에 실제 키 값이 없음(이름만)                                     |
| 6   | checkSupabase(false) | DB 핑 성공                                          | `db-ping` 1개, `ok:true`                                                |
| 7   | checkSupabase(false) | DB 에러                                             | `db-ping` `ok:false`, detail=`error:<code>`                             |
| 8   | checkSupabase(true)  | deep                                                | `db-ping`·`auth-reach`·`storage-reach` 3개                              |
| 9   | checkSchema          | 모든 핵심 테이블 존재                               | `ok:true`                                                               |
| 10  | checkSchema          | 한 테이블 42P01                                     | `ok:false`, detail 에 그 테이블명                                       |
| 11  | checkFunctional      | Resend 키 `re_` 접두·유효 발신 + VAPID 페어 형식 OK | 둘 다 `ok:true`                                                         |
| 12  | checkFunctional      | Resend 키 형식 불량                                 | `resend-config` `ok:false`                                              |
| 13  | checkMeta            | 항상                                                | `ok:true`, detail 에 APP_VERSION                                        |
| 14  | runChecks('shallow') |                                                     | `app-host`·`config`·`db-ping`·`meta` 4개(스키마·기능·auth·storage 없음) |
| 15  | runChecks('deep')    |                                                     | 위 + `auth-reach`·`storage-reach`·`schema`·`resend-config`·`vapid-pair` |

## 규칙

- 프로브가 throw 해도 `runChecks` 는 reject 하지 않고 `ok:false` 로 흡수(항목 7·10·12 로 간접 검증).
- 비밀값 미노출(항목 5)은 회귀 방지 핵심.
