# 명세: src/components/MobileBottomNav.astro

## 역할 요약

모바일 하단 네비게이션. 홈, 수검준비, 지적권고사례, 자료실, 의견보내기. 768px 이하에서만 표시.

## Props

없음.

## navItems

홈(/), 수검준비(/inspection-prep), 지적권고사례(/findings-recommendations), 자료실(/resources), 의견보내기(/feedback).

## 핵심 규칙

1. isActive: path==='/'이면 pathname==='/'||'', 아니면 pathname.startsWith(path).
2. env(safe-area-inset-bottom) padding.
