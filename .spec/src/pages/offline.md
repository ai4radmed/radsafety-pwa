# 명세: src/pages/offline.astro

## 역할 요약

오프라인 fallback 페이지. Service Worker 네트워크 실패 시 표시. 수검준비·지적권고사례 링크, 다시 시도 버튼.

## Props

없음.

## 사이드 이펙트

- online 이벤트 시 location.reload().
- 다시 시도 버튼 클릭 시 location.reload().

## 핵심 규칙

1. prerender = true. precache 대상.
2. DashboardLayout 미사용. BaseHead만 사용.
3. PWA 오프라인 전략(B안)에 따른 읽기 전용 fallback.
