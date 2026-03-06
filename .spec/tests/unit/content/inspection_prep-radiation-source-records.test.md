# 테스트 명세: 정기검사 수검준비 02b-radiation-source-records

## 대상 구현체

- 경로: src/content/inspection_prep/02b-radiation-source-records.md
- 파일 명세: .spec/src/content/inspection_prep-02b-radiation-source-records.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                            | it                                                                      | 검증 내용                                            |
| ----------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| inspection_prep 02b 방사선원 기록부 | 방사선원 구매요구서 항목 끝에 예시 slug 링크가 있다                     | 해당 파일에 `radiation-source-order-sample` 포함     |
| inspection_prep 02b 방사선원 기록부 | 방사선원 관리현황보고/생산 판매현황보고 항목 끝에 예시 slug 링크가 있다 | 해당 파일에 `ri-production-sales-record-sample` 포함 |
| inspection_prep 02b 방사선원 기록부 | 방사선관리구역 출입기록 항목 끝에 예시 slug 링크가 있다                 | 해당 파일에 `controlled-area-access-log-sample` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
