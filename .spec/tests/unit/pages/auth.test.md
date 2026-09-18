# 테스트 명세: pages/auth (인증 라우트)

## 대상 구현체

- 경로: src/pages/auth/callback.ts
- 명세: .spec/src/pages/auth/\*.md, test_strategy.md
- `auth/confirm.ts`(매직링크/이메일 OTP 확인)는 Stage C(privacy_redesign_plan.md 1단계, 2026-09-18)로 삭제됨 — 해당 검증 케이스도 함께 제거.

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe    | it                                            | 검증 내용                   |
| ----------- | --------------------------------------------- | --------------------------- |
| auth 라우트 | callback.ts에 prerender = false가 있어야 한다 | 파일 존재 및 prerender 선언 |

## 유지보수 목적

- 프리렌더링 누락 → 로그인 장애 재발 방지 (test_strategy.md)
- auth/callback은 OAuth 핵심 경로

## 기존 테스트 참조

- prerender-check.test.ts (전체 auth 폴더 검증)
