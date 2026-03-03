# 명세: src/pages/resources/[slug].astro

## 역할 요약

/resources/[slug] 동적 라우트. slug 파라미터로 /resources?slug=xxx 리다이렉트. 자료실 상세 뷰어 로직은 resources.astro에서 처리.

## Props

| 파라미터 | 타입                 |
| -------- | -------------------- |
| slug     | string (URL segment) |

## 사이드 이펙트

302 리다이렉트만 수행.

## 핵심 규칙

1. prerender = false.
2. slug 없으면 /resources로 리다이렉트.
3. Slug 기반 링크 일원화 (체크리스트, 알림 등).
