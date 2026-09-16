# 명세: src/components/LoginGuide.astro

## 역할 요약

카카오 로그인 안내 배너. /login 또는 /mypage에서만 표시. localStorage login_guide_dismissed_v3로 다시 보지 않기.

## Props

없음.

## 핵심 규칙

1. path.includes('/login') || path.includes('/mypage').
2. 닫기 시 localStorage.setItem('login_guide_dismissed_v3', 'true').
3. astro:page-load 이벤트에서 표시 여부 결정.
4. **위치는 뷰포트 하단 고정**(`position: fixed; bottom: 1rem`) — 예전에는 `top: 60%`였는데, 로그인 폼이 자랄 때마다(Stage 1-A UsernamePasswordForm 추가 등) 그 자리에 있던 버튼을 다시 가리는 문제가 반복됐다(2026-09-16, e2e `public-pages.spec.ts` "이메일 미입력 → 폼 제출 차단"이 이 배너에 가려 클릭 자체가 실패하는 것으로 발견 — dev HEAD에서 재현, `top:60%` 도입 이전 커밋에서는 통과함을 대조 확인). 하단 고정은 폼 내용이 얼마나 길어지든 겹칠 일이 없어 근본적으로 더 견고하다.
