# 테스트 명세: E2E 마지막 방문 경로 복원 (last-route)

## 대상 구현체

- 경로: src/lib/last-route.ts, src/pages/index.astro, src/lib/auth-handler.ts
- 명세: .spec/src/lib/last-route.md

## 테스트 도구

Playwright (E2E)

## 검증 항목

| describe         | it                                                       | 검증 내용                                                           |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| 마지막 경로 복원 | 홈(/) 첫 진입 시 localStorage에 저장된 경로로 리다이렉트 | localStorage에 last_route 설정 후 / 접속 → URL이 저장된 path로 변경 |

## Mock/Setup

- 비로그인 상태에서 실행 가능. localStorage에 `last_route` 수동 설정 후 `/` 방문.

## 유지보수 목적

- 마지막 방문 페이지 복원 기능 회귀 방지.
