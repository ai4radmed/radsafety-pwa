# 테스트 명세: src/data/glossary.ts

## 대상 구현체

- 경로: src/data/glossary.ts
- 명세: .spec/src/data/glossary.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe      | it                                   | 검증 내용                      |
| ------------- | ------------------------------------ | ------------------------------ |
| glossaryTerms | 모든 항목에 term과 definition이 존재 | term, definition 비어있지 않음 |
| glossaryTerms | 최소 1개 이상의 항목이 존재          | length > 0                     |
| glossaryTerms | 중복된 term이 없어야 함              | Set으로 유일성 검증            |

## Mock/Setup

없음.

## 기존 테스트 참조

- tests/unit/data/glossary.test.ts_backup
