# 테스트 명세: E2E view-transitions-null-safety

## 대상 구현체

- 경로: src/pages/_.astro, src/components/_.astro, src/layouts/\*.astro
- 명세: codebase_guide.md (DOM 접근 규칙, null safety)

## 테스트 도구

Playwright (E2E)

## 검증 항목

| describe                     | it                                       | 검증 내용                           |
| ---------------------------- | ---------------------------------------- | ----------------------------------- |
| View Transitions null safety | 비인증 페이지 전환 시 console.error 없음 | 홈↔로그인 전환, console 리스닝      |
| View Transitions null safety | 인증 페이지 전환 시 console.error 없음   | (authenticated 프로젝트, 세션 필요) |

## 유지보수 목적

- 조건부 DOM 요소 null 접근 TypeError 재발 방지
- View Transitions 재방문 시 `!` 강제 접근으로 인한 오류 방지

## 기존 테스트 참조

- view-transitions.spec.ts (재방문 렌더링)
- test_strategy.md 6. 로그 기반 검증 가이드
