# 테스트 명세: 정기검사 수검준비 02g-radiation-security-management

## 대상 구현체

- 경로: src/content/inspection_prep/02g-radiation-security-management.md
- 파일 명세: .spec/src/content/inspection_prep-02g-radiation-security-management.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                   | it                                                                       | 검증 내용                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| inspection_prep 02g 방사선원 보안관리 자료 | 선원보안관리 현황 항목 끝에 RI 취급시설 보안점검표 예시 slug 링크가 있다 | 해당 파일에 `ri-facility-security-checklist-sample` 포함   |
| inspection_prep 02g 방사선원 보안관리 자료 | 선원보안관리 현황 항목의 링크 텍스트가 RI 취급시설 보안점검표 예시이다   | 해당 파일에 링크 텍스트 `RI 취급시설 보안점검표 예시` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
