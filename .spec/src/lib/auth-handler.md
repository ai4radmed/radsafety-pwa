# 명세: src/lib/auth-handler.ts

## 역할 요약

클라이언트 사이드 인증 및 사용자 상태 관리 핸들러.
Supabase 인증 상태 변경 감지, 프로필 동기화, 알림 체크 및 권한 기반 라우팅 보호를 담당한다.

## 핵심 기능

1. **initAuthHandler()**:
    - `supabase.auth.onAuthStateChange` 리스너 등록.
    - `SIGNED_OUT` 이벤트 발생 시: `clearUser()` 호출 및 보호된 페이지인 경우 `/login` 리다이렉트.
    - `astro:page-load` 이벤트 등록: 매 페이지 로드 시 `saveLastRoute()`(마지막 경로 저장), 이후 `updateUserStore` 실행.

2. **updateUserStore(session)**:
    - 세션 정보(email, id 등)를 기반으로 기본 유저 정보 설정.
    - `profiles` 테이블에서 상세 프로필 조회 (`maybeSingle`).
    - **자가 치유 (Self-healing)**: 프로필이 없으면 기본 정보로 `profiles`에 자동 생성.
    - 관리자 이메일 대조 (`isAdmin` 호출) 및 필요 시 DB `is_admin` 업데이트.
    - 최종 정보를 `setUser()`를 통해 전역 스토어에 저장.
    - 성공 시 `checkNotifications()` 및 `user:loggedin` 이벤트 발생.
    - `/login` 페이지에서 로그인 성공 시 `/mypage`로 리다이렉트.

3. **checkNotifications(userId)**:
    - `notifications` 테이블에서 `is_read: false`인 알림 개수 조회.
    - `.global-noti-dot` 요소들의 표시 여부 업데이트.

## 핵심 규칙

1. **보안 가드 (Auth Guard)**:
    - `publicPaths`: `['/', '/login']` (서브 경로 포함 대응 필요).
    - 비인증 사용자가 보호된 페이지 접근 시 즉시 `/login` 리다이렉트.
2. **중복 실행 방지**: `astro:page-load` 내에서만 초기화 및 동기화 수행 시 중복 호출 주의.
3. **Optional Guard**: DOM 접근 (`.global-noti-dot`) 시 요소 존재 여부 필수 확인.
