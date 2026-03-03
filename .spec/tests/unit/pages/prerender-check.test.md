# 테스트 명세: pages prerender 검증

## 대상 구현체

- 경로: src/pages/\*\* (다수)
- 명세: .spec/src/pages/\*.md, ARCHITECTURE.md (prerender = false 정책)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe               | it                                       | 검증 내용                                  |
| ---------------------- | ---------------------------------------- | ------------------------------------------ |
| prerender = false 검증 | 서버 API 사용 페이지에 prerender = false | createSupabaseServerClient 등 사용 시 필수 |
| prerender = false 검증 | API route에 prerender = false            | pages/api/\*.ts                            |
| prerender = false 검증 | auth route에 prerender = false           | pages/auth/\*.ts                           |

## Mock/Setup

- fs, path (Node.js 내장)
- findFiles 재귀, SERVER_PATTERNS 정규식

## 기존 테스트 참조

- tests/unit/pages/prerender-check.test.ts_backup
