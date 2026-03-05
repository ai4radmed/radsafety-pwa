# 테스트 명세: 정기검사 수검준비 02-safety-management-regulations-report

## 대상 구현체

- 경로: src/content/inspection_prep/02-safety-management-regulations-report.md
- 명세: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                         | it                                                          | 검증 내용                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| inspection_prep 02 안전관리규정/방사선안전보고서 | 안전관리규정 항목에 작성지침/예시 slug 링크가 포함되어 있다 | 해당 파일에 `safety-management-regulations-preparation-guide` 및 `safety-management-regulations-sample` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
