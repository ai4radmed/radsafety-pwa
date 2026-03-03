# 명세: src/pages/api/archives/[id].ts

## 역할 요약

GET /api/archives/[id]. archives 테이블 ID 조회. content_html, file_url, profiles 조인. public_file_url, display_author 반환.

## Public API

| Method | 경로              | 설명                         |
| ------ | ----------------- | ---------------------------- |
| GET    | /api/archives/:id | archive 단건 조회, JSON 반환 |

## 사이드 이펙트

없음 (읽기 전용).

## 핵심 규칙

1. prerender = false.
2. supabaseAnon 사용. RLS 적용.
3. Cache-Control: public, max-age=60.
