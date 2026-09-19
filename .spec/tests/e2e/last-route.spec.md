# 테스트 명세: E2E 마지막 방문 경로 복원 (last-route)

## 대상 구현체

- 경로: src/lib/last-route.ts, src/pages/index.astro, src/lib/auth-handler.ts
- 명세: .spec/src/lib/last-route.md

## 테스트 도구

Playwright (E2E)

## 검증 항목

| describe         | it                                                       | 검증 내용                                                                                                              |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 마지막 경로 복원 | 홈(/) 첫 진입 시 localStorage에 저장된 경로로 리다이렉트 | localStorage에 last_route=`/notifications`(회원 전용) 설정 후 / 접속 → 복원 → 비로그인 가드 → 최종 URL `/login?from=…` |

## Mock/Setup

- 비로그인 상태에서 실행 가능. localStorage에 `last_route` 수동 설정 후 `/` 방문.
- 저장 값은 **제외 경로가 아닌** 회원 전용 페이지(`/notifications`)를 쓴다(2026-09-19: `/resources`는 공개 계층이 되어 부적합) — `/login`은 제외 경로라 `getLastRoute()`가 무시한다(2026-09-18, `.spec/src/lib/last-route.md` "읽을 때도 같은 제외 규칙"). 복원이 없으면 공개 페이지 `/`에 머물고, 있으면 `/resources`→`/login`으로 튕기므로 최종 URL이 복원 여부를 판별한다.

## 유지보수 목적

- 마지막 방문 페이지 복원 기능 회귀 방지.
