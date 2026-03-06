# 테스트 명세: src/middleware.ts

## 대상 구현체

- 경로: src/middleware.ts
- 명세: .spec/src/middleware.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe        | it                                               | 검증 내용          |
| --------------- | ------------------------------------------------ | ------------------ |
| middleware 구조 | createSupabaseServerClient를 import하고 호출한다 | 소스에 패턴 존재   |
| middleware 구조 | getSession을 호출하고 session을 추출한다         | 소스에 패턴 존재   |
| middleware 구조 | locals.supabase, locals.session을 설정한다       | 소스에 패턴 존재   |
| middleware 구조 | next()를 호출하여 반환한다                       | return next() 존재 |

## Mock/Setup

- astro:middleware는 Vitest에서 resolve 불가 → 정적 분석(파일 읽기)으로 검증

## 유지보수 목적

- 인증 핵심 경로. 미들웨어 세션 주입 로직 변경 시 회귀 방지
