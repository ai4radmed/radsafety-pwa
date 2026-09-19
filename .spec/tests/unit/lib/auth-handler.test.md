# 명세: tests/unit/lib/auth-handler.test.ts

## 역할 요약

`auth-handler.ts`의 클라이언트 사이드 인증 로직 및 프로필 동기화 기능을 검증하는 단위 테스트.
모드(mock)된 Supabase 클라이언트와 DOM 환경(jsdom)을 사용하여 실시간 동작을 시뮬레이션한다.

## 테스트 케이스

1. **initAuthHandler**:
    - `supabase.auth.onAuthStateChange`가 등록되는지 확인.
    - `astro:page-load` 이벤트 리스너가 등록되는지 확인.

1-1. **(2026-09-16) SIGNED_OUT 시 `forceClearSupabaseCookies()`가 `clearUser()`보다 먼저 호출되는지 확인** (호출 순서 검증).

2. **updateUserStore (로그인 성공 시)**:
    - 세션 정보를 기반으로 `setUser()`가 올바르게 호출되는지 확인.
    - 프로필 존재 시 알림 체크가 실행되는지 확인.
    - `/login` 페이지에서 로그인 성공 시 `/mypage`로 이동하는지 확인.
    - **(Stage 1-A)** `is_admin`은 `profiles.is_admin` 단일 기준 — 이메일이 관리자 목록에 있어도 DB 값이 `false`면 `setUser`에 `is_admin: false`가 전달되고, `profiles` 테이블 `update`(이메일 대조 승격)는 더 이상 호출되지 않는다.
    - **(Stage 1-A)** `profiles.is_admin`이 `true`면 로그인 이메일이 `<username>@radsafety.invalid`(관리자 목록에 없음)여도 `setUser`에 `is_admin: true`가 전달된다.

3. **updateUserStore (프로필 부재 시 - Self-healing)**:
    - 프로필이 없을 경우 `supabase.from('profiles').upsert(data, {onConflict:'id'})`가 호출되는지 확인(insert 아님 — Stage B, auth.users→profiles 자동생성 트리거 충돌 방지).
    - 삽입 성공 후 유저 정보가 정상적으로 스토어에 저장되는지 확인.
    - **(2-2, 2026-09-19)** provider와 무관하게(`kakao`·`email` 모두) upsert 대상에 `nickname`·`login_email` **키 자체가 없는지** 확인 — 컬럼이 삭제돼 값을 보내면 upsert가 실패한다. `provider`는 포함.
    - **(Phase 2)** upsert 대상에 항상 `status: 'pending'`이 포함되는지 확인 — 자가 치유는 신규 계정에서만 실행되므로 항상 대기 상태로 시작.

4. **updateUserStore (비인증 접근 시)**:
    - 세션이 없을 경우 `clearUser()`가 호출되는지 확인.
    - 보호된 페이지인 경우 `/login`으로 리다이렉트되는지 확인.

5. **checkNotifications**:
    - 알림 개수에 따라 `.global-noti-dot` 요소의 `display` 스타일이 변경되는지 확인.

6. **(Stage B) 아이디 정하기 강제 게이트**:
    - `profiles.username`이 없으면 현재 경로와 무관하게 `window.location.href`가 `/claim-username`으로 바뀌는지 확인.
    - 이미 `/claim-username`에 있으면 리다이렉트하지 않는지(무한루프 방지) 확인.
    - `username`이 있으면 게이트가 발동하지 않는지 확인.

## 핵심 규칙

1. **Mocking**: `supabase-browser`, `nanostores` 등을 필수 모킹. `config/auth`는 Stage 1-A(2026-09) 이후 `auth-handler.ts`가 더 이상 import하지 않으므로 모킹 불필요.
2. **Environment**: `jsdom` 환경에서 실행하여 `window.location`, `document` 조작 가능해야 함.
3. **Async**: 비동기 함수(`.getSession`, `.from`)의 결과를 기다려 단언(assertion) 수행.
