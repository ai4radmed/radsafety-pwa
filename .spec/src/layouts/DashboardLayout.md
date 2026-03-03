# 명세: src/layouts/DashboardLayout.astro

## 역할 요약

대시보드 레이아웃. BaseHead, Sidebar, MobileBottomNav, GlossaryModal, PWAInstall, LoginGuide. ViewTransitions. astro:page-load에서 updateUserStore, checkNotifications. SIGNED_OUT 시 clearUser, 보호 페이지면 /login 리다이렉트.

## Props

| 이름        | 타입    |
| ----------- | ------- |
| title       | string  |
| description | string  |
| scale       | number? |

## 핵심 규칙

1. publicPaths: ['/', '/login']. isPublic이 아니면 미인증 시 /login 리다이렉트.
2. 프로필 없으면 self-healing: profiles insert 시도.
3. isAdmin 이메일 기반, DB is_admin과 불일치 시 update.
4. vapidPublicKey, urlBase64ToUint8Array를 window에 노출.
5. 모바일: menuBtn → sidebar.open, overlay 토글.
