# 테스트 명세: src/lib/canonical.ts

## 대상 구현체

- 경로: src/lib/canonical.ts (+ src/components/BaseHead.astro 배선)
- 명세: .spec/src/lib/canonical.md

## 테스트 도구

Vitest. 순수 함수라 모의 없음. 배선은 파일 소스 읽기로 고정.

## 검증 항목

| describe  | it                                              | 검증 내용                        |
| --------- | ----------------------------------------------- | -------------------------------- |
| 표준 URL  | 슬래시 없는 경로와 있는 경로가 같은 표준을 낸다 | `/guide` · `/guide/` → `/guide/` |
| 표준 URL  | 중첩 경로도 슬래시로 끝난다                     |                                  |
| 표준 URL  | 홈은 그대로                                     |                                  |
| 표준 URL  | 파일 경로에는 슬래시를 붙이지 않는다            | `/rss.xml`                       |
| 표준 URL  | site 가 URL 객체여도 동작한다                   | `Astro.site` 는 `URL`            |
| 소스 계약 | BaseHead 가 canonicalUrl 로 표준 태그를 만든다  |                                  |
| 소스 계약 | og:url · twitter:url 도 같은 표준 주소를 쓴다   |                                  |
