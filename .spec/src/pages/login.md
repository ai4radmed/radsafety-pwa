# 명세: src/pages/login.astro

## 역할 요약

로그인 페이지. 카카오 OAuth, 이메일 6자리 OTP(EmailOtpForm), PUBLIC_DEV_MODE 시 테스트 사용자/관리자 로그인 버튼.

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOAuth, signInWithOtp, signInWithPassword.
- 세션 쿠키 설정.

## 핵심 규칙

1. publicPaths. 미인증 접근 가능.
2. PUBLIC_DEV_MODE=true 시 [테스트 사용자 로그인], [테스트 관리자 로그인], [세션 초기화] 표시.
3. DEV_TEST_USER_EMAIL, DEV_TEST_USER_PASSWORD 등 env 사용.
4. **[iOS PWA 호환성 제약]**: 인증 진행 시 외부 브라우저(Safari 새 창)로의 화면 전환(Redirect)을 발생시켜서는 안 됩니다. 이메일 인증 시 반드시 클릭용 매직링크 방식 대신 **6자리 OTP 코드 입력 방식**을 사용하여 PWA 샌드박스 내부에서 세션이 유지되도록 구현해야 합니다.
