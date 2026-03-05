# 명세: src/lib/last-route.ts

## 역할 요약

마지막 방문한 페이지를 기억하여, 앱을 다시 열었을 때(홈(/)으로 첫 진입 시) 해당 페이지로 복원한다. 유효기간은 두지 않는다.

## Public API

- **saveLastRoute()**: 현재 `location.pathname + search`를 저장 대상이면 `localStorage['last_route']`에 JSON 저장. (제외 경로면 저장하지 않음)
- **restoreLastRouteIfNeeded()**: 현재 경로가 `/`이고, 이 탭에서 아직 복원 시도를 하지 않았으며, 저장된 경로가 있고 `/`가 아니면 해당 경로로 `window.location.replace()` 후 `true` 반환. 그 외 `false`.

## 저장 제외 경로

다음 경로는 저장하지 않음(무한 루프·인증 플로우 방지).

- `/`
- `/login`
- `/auth` 및 `/auth/*`
- `/offline`
- `/api` 및 `/api/*`

## 복원 규칙

1. **복원 시점**: 홈(`/`) 페이지에서 `astro:page-load` 시 한 번만 검사.
2. **탭당 1회**: `sessionStorage['last_route_checked']`가 있으면 복원하지 않음(사용자가 홈을 눌러서 온 경우에도 그대로 홈 표시).
3. **저장된 경로가 `/`이면** 복원하지 않음.
4. **유효기간**: 없음. 저장된 경로가 있으면 기간과 관계없이 복원 대상으로 간주.

## 저장 형식

`localStorage['last_route']` = `JSON.stringify({ path: string })`

## 호출처

- **저장**: `auth-handler.ts`의 `astro:page-load` 리스너 맨 앞에서 `saveLastRoute()` 호출.
- **복원**: `src/pages/index.astro`의 `astro:page-load`에서 `restoreLastRouteIfNeeded()` 호출. `true`면 리다이렉트 발생.

## 핵심 규칙

1. 복원 시 `replace` 사용으로 히스토리에 `/`가 쌓이지 않도록 함.
2. auth-handler의 인증 가드와 독립 동작. 복원된 페이지가 보호 페이지면 기존대로 `/login` 리다이렉트됨.
