# 테스트 명세: 정기검사 수검준비 01-previous-inspection-records

## 대상 구현체

- 경로: src/content/inspection_prep/01-previous-inspection-records.md
- 파일 명세: .spec/src/content/inspection_prep-01-previous-inspection-records.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                    | it                                                         | 검증 내용                                                                                |
| ------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| inspection_prep 01-previous 과년도 정기검사 | 결과통보 공문 및 시정조치보고서 항목에 예시 slug 링크 존재 | 해당 파일에 `inspection-notification-sample`, `inspection-corrective-report-sample` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
