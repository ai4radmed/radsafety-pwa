# 테스트 명세: src/content.config.ts

## 대상 구현체

- 경로: src/content.config.ts
- 명세: .spec/src/content.config.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                        | it                                                                 | 검증 내용               |
| ------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| collections 구조                | inspection_prep, findings_recommendations, smart_resources 키 존재 | export collections 구조 |
| inspection_prep 스키마          | title 필수, category, order 등 optional                            | 스키마 필드 정의        |
| findings_recommendations 스키마 | title, severity enum 등                                            | 스키마 필드 정의        |
| smart_resources 스키마          | title, category, order                                             | 스키마 필드 정의        |

## Mock/Setup

- astro:content는 Vitest에서 resolve 불가 → 정적 분석(파일 읽기)으로 검증

## 유지보수 목적

- Content Collection 스키마 변경 시 회귀 방지
