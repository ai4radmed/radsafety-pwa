# 테스트 명세: src/lib/watch/sources/nsic-accidents.ts

## 대상 구현체

- 경로: src/lib/watch/sources/nsic-accidents.ts
- 명세: .spec/src/lib/watch/sources/nsic-accidents.md

## 테스트 도구

Vitest. 2026-09-20 실측 목록 HTML 조각(헤더 + 2행) 픽스처, `fetch` 주입 모의.

## 검증 항목

| it                                                            | 검증 내용                                         |
| ------------------------------------------------------------- | ------------------------------------------------- |
| 목록 HTML 을 행으로 파싱 — 헤더는 건너뛰고 [분류] 를 분리한다 | id·사고일·등급·type·title·region·org              |
| 관련 판정 — 기관명 또는 사고명 키워드                         | 병원 true, 방사성의약품 true, 공장 피폭 false     |
| WatchItem — 키 EXMN, 분류=category, detail                    | occurredAt·grade·region·org·relevant, 지문 sha256 |
| 목록 fetch 는 POST listNum, 0건 파싱이면 throw                | URL·body, 구조 변경 감지                          |
| 상세 fetch 는 개요·원인만 취하고 CRLF 를 정리한다             | DETAIL_URL·`seq=`, summary/cause                  |
| 소스 메타 — full 모드, notifyMembers false, link /bulletins   |                                                   |
