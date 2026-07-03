# 명세: tests/e2e/rls-policies.spec.ts

## 대상

Supabase **RLS(행 수준 보안) 정책**의 실동작 — 보안 통합 테스트. `/api/health` 가 아니라 e2e 에 두는 이유: 실제 로그인(부작용)·`DEV_TEST_USER_*` 자격(프로덕션 금지 env) 필요 + RLS 는 배포시 불변식이라 런타임 프로브가 아닌 테스트가 맞다.

## 전제

`PUBLIC_SUPABASE_URL`·`PUBLIC_SUPABASE_ANON_KEY`·`DEV_TEST_USER_EMAIL`·`DEV_TEST_USER_PASSWORD` (process.env). 하나라도 없으면 **skip**(CI 미설정 시 실패 아님). CI 활성화 = 위 4개를 secret/ env 로 주입(test.yml e2e job 에 배선).

## 검증 항목

| #   | 시나리오                              | 기대                                                                                                                       |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | 비로그인 anon 이 `findings` head 조회 | 에러 없으면 통과(빈 결과). 에러면 RLS 가드(`PGRST301`·`42501`·`PGRST116`·policy/permission)만 허용, 그 외 일반 에러는 실패 |
| 2   | 테스트 계정 `signInWithPassword`      | 성공(authError null)                                                                                                       |
| 3   | 로그인 상태 `profiles` head 조회      | 에러 없음. 특히 메시지에 `infinite recursion` 미포함(정책 무한 재귀 회귀 감지)                                             |

## 규칙

- 부작용(로그인) 있음 → 테스트 종료 시 `signOut`.
- 자격 미설정 시 전체 `test.skip`.
- 원 구현은 Doctor(`checkRlsPolicies`)였으나 부작용·자격 이유로 e2e 로 이전(값어치 보존, 자리 교정).
