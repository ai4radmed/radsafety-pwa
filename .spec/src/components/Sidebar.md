# 명세: src/components/Sidebar.astro

## 역할 요약

데스크톱 사이드바. 메뉴/사용자/관리자 그룹. userProfile 구독으로 로그인/로그아웃/관리자 메뉴 토글. 768px 이하에서 drawer(.open). 하단에는 앱 버전/릴리스 날짜를 표시.

## Props

없음.

## 핵심 규칙

1. adminNavGroup: is_admin이면 flex, 아니면 none.
2. sidebarGlossaryBtn 클릭 → open-glossary 이벤트.
3. navLogoutBtn: confirm 후 signOut, clearUser, location.href='/'.
4. hover 시 width 260px, 로고/그룹타이틀/link-text opacity 1.
5. sidebar-footer: `APP_VERSION`, `APP_RELEASE_DATE`를 import 해서 `RadSafety v{APP_VERSION} · {APP_RELEASE_DATE}` 형식으로 표시하고, 버전 문자열을 하드코딩하지 않는다.
6. 사이드바 본문 영역은 `.nav-links` 래퍼 안에 메뉴/사용자/관리자 그룹을 감싸고, `.nav-links`에 `overflow-y: auto`를 적용하여 **모바일 높이에서도 전체 메뉴가 스크롤 가능**해야 한다. `.sidebar`에는 `overflow-y`를 직접 막지 않는다.
7. nav 구조: `사용자` 그룹에 `/feedback`(의견보내기), `/my-feedback`(내 의견함), 그리고 `/feedback-query`(개선의견조회) 링크가 포함되어야 한다.
