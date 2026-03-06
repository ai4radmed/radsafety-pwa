# 테스트 명세: 정기검사 수검준비 02-1-safety-management-organization

## 대상 구현체

- 경로: src/content/inspection_prep/02-1-safety-management-organization.md
- 파일 명세: .spec/src/content/inspection_prep-02-1-safety-management-organization.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                 | it                                                                          | 검증 내용                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| inspection_prep 02-1 방사선안전관리 조직 | 대표자 변경 관련 항목에 경미한사항변경신고서 법령 링크가 포함되어 있다      | 파일에 해당 법령 URL이 포함됨              |
| inspection_prep 02-1 방사선안전관리 조직 | 방사선 안전관리자 대리자 지정 항목 끝에 대리자 지정서 예시 slug 링크가 있다 | 파일에 `rsm-proxy-designation-sample` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 URL 포함 여부를 검증.
