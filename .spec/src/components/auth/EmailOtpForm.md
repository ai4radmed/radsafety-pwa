# 명세: src/components/auth/EmailOtpForm.astro

## 역할 요약

이메일 6자리 OTP 인증 폼. 1단계: 이메일 입력 → signInWithOtp. 2단계: 6자리 코드 입력 → verifyOtp. PWA 내부에서 세션 유지(리다이렉트 없음).

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOtp(이메일 발송), verifyOtp(세션 생성). 성공 시 동일 창에서 /mypage 이동.

## 핵심 규칙

1. signInWithOtp 호출 시 emailRedirectTo 미사용(6자리 코드 이메일만 발송). Supabase 이메일 템플릿에 `{{ .Token }}` 사용 필요.
2. verifyOtp({ email, token, type: 'email' })로 검증 후 window.location으로 /mypage 이동.
3. 1단계·2단계 UI 전환은 클라이언트 상태로 처리.
