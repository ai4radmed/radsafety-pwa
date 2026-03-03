# 명세: src/pages/mypage.astro

## 역할 요약

마이페이지. 로그인 카드(카카오/이메일 배지), 방사선안전관리정보, 인증요청, 프로필 self-healing, 관리자 링크.

## Props

없음.

## 사이드 이펙트

- profiles select/update.
- verification_requests insert.
- 인증요청 시 actions.sendVerificationCode 등.

## 핵심 규칙

1. 인증 필요. 프로필 없으면 insert 시도.
2. is_admin 이메일 기반, DB와 불일치 시 update.
3. verification_status: none, list, temp_verified, verified.
