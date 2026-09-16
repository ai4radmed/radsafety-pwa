# 테스트 명세: src/pages/mypage.astro (카드 2 실명·이메일 미표시)

## 대상 구현체

- 경로: src/pages/mypage.astro
- 명세: .spec/src/pages/mypage.md (§2026-09-16 추가)

## 테스트 도구

Vitest (단위, 파일 소스 읽기 기반 회귀 검증)

## 검증 항목

| describe                           | it                                                               | 검증 내용                                                                        |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| mypage 카드 2 — 실명·이메일 미표시 | userRealName/userSocietyEmail DOM 요소를 두지 않는다             | `id="userRealName"`·`id="userSocietyEmail"` 미포함                               |
| mypage 카드 2 — 실명·이메일 미표시 | 스크립트에서 real_name/society_email 값을 화면에 대입하지 않는다 | 해당 `getElementById(...)` 호출 미포함                                           |
| mypage 카드 2 — 실명·이메일 미표시 | 학회·구분·기관·부서는 그대로 유지한다                            | `id="userSocietyName"`·`userSocietyRole`·`userAffiliation`·`userDepartment` 포함 |

## Mock/Setup

- 파일 소스 읽기 기반 검증. Supabase/브라우저 모킹 불필요.

## 기존 테스트 참조

- tests/unit/components/auth/EmailOtpForm.test.ts (파일·소스 검증 패턴)
