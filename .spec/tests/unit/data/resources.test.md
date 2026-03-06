# 테스트 명세: src/data/resources.ts

## 대상 구현체

- 경로: src/data/resources.ts
- 명세: .spec/src/data/resources.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe  | it                                          | 검증 내용                      |
| --------- | ------------------------------------------- | ------------------------------ |
| resources | 모든 항목에 id, title, category가 존재      | id, title, category 정의됨     |
| resources | 최소 1개 이상의 항목이 존재                 | length > 0                     |
| resources | 중복된 id가 없어야 함                       | Set으로 유일성 검증            |
| resources | 모든 항목에 previewUrl과 downloadUrl이 존재 | previewUrl, downloadUrl 정의됨 |

## Mock/Setup

없음.

## 기존 테스트 참조

- tests/unit/data/resources.test.ts_backup
