# 테스트 명세: src/lib/last-route.ts

## 대상 구현체

- 경로: src/lib/last-route.ts
- 명세: .spec/src/lib/last-route.md

## 테스트 도구

Vitest (단위). 브라우저 환경(jsdom)에서 localStorage/sessionStorage/window.location 모킹.

## 검증 항목

| describe                 | it                                             | 검증 내용                                    |
| ------------------------ | ---------------------------------------------- | -------------------------------------------- |
| saveLastRoute            | 제외 경로(/, /login, /auth/\*)는 저장하지 않음 | localStorage.setItem 호출 안 함 또는 키 없음 |
| saveLastRoute            | 일반 경로(/mypage, /resources)는 저장함        | localStorage에 last_route JSON 저장          |
| getLastRoute             | 저장 없으면 null 반환                          | getLastRoute() === null                      |
| getLastRoute             | 유효 JSON 저장 후 path 반환                    | getLastRoute()?.path === 저장한 path         |
| restoreLastRouteIfNeeded | path가 /가 아니면 false, 리다이렉트 없음       | replace 호출 안 함                           |
| restoreLastRouteIfNeeded | sessionStorage에 checked 있으면 false          | replace 호출 안 함                           |
| restoreLastRouteIfNeeded | /이고 저장된 경로 있으면 replace 호출 후 true  | location.replace(last.path) 호출             |

## Mock/Setup

- beforeEach에서 localStorage, sessionStorage, window.location 모킹 초기화.
