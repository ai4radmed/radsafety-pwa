# 명세: src/components/Sidebar.astro

## 역할 요약

데스크톱 사이드바. 메뉴/사용자/관리자 그룹. userProfile 구독으로 로그인/로그아웃/관리자 메뉴 토글. 768px 이하에서 drawer(.open).

## Props

없음.

## 핵심 규칙

1. adminNavGroup: is_admin이면 flex, 아니면 none.
2. sidebarGlossaryBtn 클릭 → open-glossary 이벤트.
3. navLogoutBtn: confirm 후 signOut, clearUser, location.href='/'.
4. hover 시 width 260px, 로고/그룹타이틀/link-text opacity 1.
