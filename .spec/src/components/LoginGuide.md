# 명세: src/components/LoginGuide.astro

## 역할 요약

카카오 로그인 안내 배너. /login 또는 /mypage에서만 표시. localStorage login_guide_dismissed_v3로 다시 보지 않기.

## Props

없음.

## 핵심 규칙

1. path.includes('/login') || path.includes('/mypage').
2. 닫기 시 localStorage.setItem('login_guide_dismissed_v3', 'true').
3. astro:page-load 이벤트에서 표시 여부 결정.
