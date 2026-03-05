# 테스트 명세: 정기검사 수검준비 02-1-safety-management-organization

## 대상 구현체

- 경로: src/content/inspection_prep/02-1-safety-management-organization.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                 | it                                                                     | 검증 내용                     |
| ---------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| inspection_prep 02-1 방사선안전관리 조직 | 대표자 변경 관련 항목에 경미한사항변경신고서 법령 링크가 포함되어 있다 | 파일에 해당 법령 URL이 포함됨 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 URL 포함 여부를 검증.
