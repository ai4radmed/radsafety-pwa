# 테스트 명세: E2E auth-guard

## 대상 구현체

- 경로: src/layouts/DashboardLayout.astro, src/pages/admin/\*.astro
- 명세: .spec/src/layouts/DashboardLayout.md, .spec/src/pages/admin/\*.md

## 테스트 도구

Playwright (E2E)

## 검증 항목

| describe                        | it                                               | 검증 내용                                        |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| 인증 가드 — 비로그인 리다이렉트 | PROTECTED_PAGES 각 경로 접근 → /login 리다이렉트 | mypage, notifications, settings, feedback 등     |
| 인증 가드 — 비로그인 리다이렉트 | ADMIN_PAGES 각 경로 접근 → /login 리다이렉트     | admin/members, admin/feedback, admin/glossary 등 |
| 인증 가드 — 비로그인 리다이렉트 | /admin/settings 접근 → / (홈) 리다이렉트         | 자체 가드 로직 (설계 동작)                       |
| 인증 가드 — 비로그인 리다이렉트 | / (홈) 접근 → 리다이렉트 없음                    | publicPath                                       |
| 인증 가드 — 비로그인 리다이렉트 | /login 접근 → 리다이렉트 없음                    | publicPath                                       |

## Mock/Setup

- beforeEach: localStorage, sessionStorage clear (mock 로그인 상태 없음 보장)

## 유지보수 목적

- DashboardLayout auth guard 동작 검증
- admin 페이지별 가드 로직 검증 (feedback: 비로그인 시 Layout이 처리, settings: /로 리다이렉트)

## 기존 테스트 참조

- tests/e2e/auth-guard.spec.ts
