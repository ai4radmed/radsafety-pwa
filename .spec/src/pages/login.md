# 명세: src/pages/login.astro

## 역할 요약

로그인 페이지. 카카오 OAuth, 이메일 매직링크, PUBLIC_DEV_MODE 시 테스트 사용자/관리자 로그인 버튼.

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOAuth, signInWithOtp, signInWithPassword.
- 세션 쿠키 설정.

## 핵심 규칙

1. publicPaths. 미인증 접근 가능.
2. PUBLIC_DEV_MODE=true 시 [테스트 사용자 로그인], [테스트 관리자 로그인], [세션 초기화] 표시.
3. DEV_TEST_USER_EMAIL, DEV_TEST_USER_PASSWORD 등 env 사용.
