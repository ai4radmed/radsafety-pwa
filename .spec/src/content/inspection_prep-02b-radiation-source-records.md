# 명세: src/content/inspection_prep/02b-radiation-source-records.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **방사선원 생산, 판매, 구매, 취득, 사용, 저장, 폐기 기록부** 항목. 사용현황·생산·판매현황·구매요구서 등 예시 자료실 링크를 제공한다. 지침 slug는 `documents/resource_slugs.md`를 따른다.

## 구현체 경로

- `src/content/inspection_prep/02b-radiation-source-records.md`

## 자료실 Slug 링크 요구사항

| 체크 항목                                                   | Slug                                        | 링크 표시 텍스트       |
| ----------------------------------------------------------- | ------------------------------------------- | ---------------------- |
| 방사선원 구매요구서 (안전관리규정에 반영된 업체만 해당)     | `radiation-source-order-sample`             | 예시                   |
| 방사선원 관리현황보고(분기) 또는 생산 판매현황보고(월) 사본 | `ri-production-sales-record-sample`         | 예시                   |
| 방사선관리구역 출입기록 (기록 유지 시)                      | `controlled-area-access-log-sample`         | 예시                   |
| 핵심점검 1: 생산·판매·사용현황                              | `radiation-source-usage-example`            | 사용현황 작성예시      |
| 핵심점검 1: 생산·판매·사용현황                              | `radiation-source-production-sales-example` | 생산·판매현황 작성예시 |

## 핵심 규칙

1. Slug는 `resource_slugs.md` 등록값만 사용한다.
2. 예시 링크는 해당 체크 라인 끝, 동일 스타일(파란색, 새 탭) 유지.
