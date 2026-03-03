# 테스트 명세: lib 런타임 분리 검증

## 대상 구현체

- 경로: src/lib/supabase-browser.ts
- 명세: codebase_guide.md (환경 분리 원칙)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe         | it                                       | 검증 내용                            |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| supabase-browser | supabase-server를 import하지 않아야 한다 | 소스에 'supabase-server' import 없음 |
| supabase-browser | createBrowserClient 사용                 | 'createBrowserClient' 포함           |

## 유지보수 목적

- 브라우저/서버 클라이언트 분리 검증
- Multiple GoTrueClient instances 경고 방지

## 기존 테스트 참조

없음 (신규)
