# 테스트 명세: src/pages/api/health.ts

## 대상 구현체

- 경로: src/pages/api/health.ts
- 명세: .spec/src/pages/api/health.md

## 테스트 도구

Vitest (단위, 파일 소스 읽기 기반 — Supabase/astro:content 모킹 없이 회귀만 검증)

## 검증 항목

| describe                | it                                                 | 검증 내용                                                        |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| /api/health deep 게이트 | isAdmin(이메일 대조)을 더 이상 쓰지 않는다         | `import { isAdmin }` 미포함, `isAdmin(` 호출 미포함              |
| /api/health deep 게이트 | profiles.is_admin 을 조회해 관리자 여부를 판정한다 | `from('profiles')`·`select('is_admin')`·`profile?.is_admin` 포함 |

## Mock/Setup

- 파일 소스 읽기 기반 검증. Supabase/astro:content 모킹 불필요(런타임 동작은 tests/e2e/health.spec.ts 담당).

## 기존 테스트 참조

- tests/unit/pages/prerender-check.test.ts (파일·소스 검증 패턴)
