# 명세: src/pages/api/archives/view/[slug].ts

## 역할 요약

GET /api/archives/view/[slug]. slug로 자료 조회, increment_view_count RPC, PDF public URL로 302 리다이렉트.

## Public API

| Method | 경로                     | 설명                               |
| ------ | ------------------------ | ---------------------------------- |
| GET    | /api/archives/view/:slug | slug 자료 조회, PDF URL 리다이렉트 |

## 사이드 이펙트

- increment_view_count RPC (fire-and-forget).

## 핵심 규칙

1. prerender = false.
2. file_url 없으면 404.
3. 체크리스트에서 PDF 직접 열기용.
