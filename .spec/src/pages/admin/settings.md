# 명세: src/pages/admin/settings.astro

## 역할 요약

관리자 권한 관리 페이지. ADMIN_EMAILS(env) + DB admins 표시, 관리자 추가·제거.

## Props

없음.

## 사이드 이펙트

- profiles is_admin update (추정).

## 핵심 규칙

1. is_admin 체크. 미인증 시 / 리다이렉트.
2. ADMIN_EMAILS는 env 기반 Super Admin.
