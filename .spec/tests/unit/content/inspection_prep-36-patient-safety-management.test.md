# 테스트 명세: 정기검사 수검준비 36-patient-safety-management

## 대상 구현체

- 경로: src/content/inspection_prep/36-patient-safety-management.md
- 파일 명세: .spec/src/content/inspection_prep-36-patient-safety-management.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                     | it                                                                            | 검증 내용                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| inspection_prep 36 RI 투여환자 안전관리 기록 | 퇴원 일시/격리/퇴원방법 항목 끝에 RI 치료 퇴원 선량측정 예시 slug 링크가 있다 | 해당 파일에 `ri-tx-release-doserate-measurement-sample` 포함 |
| inspection_prep 36 RI 투여환자 안전관리 기록 | 퇴원 일시/격리/퇴원방법 항목의 링크 텍스트가 RI 치료 퇴원 선량측정 예시이다   | 해당 파일에 링크 텍스트 `RI 치료 퇴원 선량측정 예시` 포함    |
| inspection_prep 36 RI 투여환자 안전관리 기록 | RI 투여 치료병실 퇴원지침서 항목 끝에 RI치료 퇴원지침서 예시 slug 링크가 있다 | 해당 파일에 `ri-tx-release-instruction-sample` 포함          |
| inspection_prep 36 RI 투여환자 안전관리 기록 | RI 투여 치료병실 퇴원지침서 항목의 링크 텍스트가 RI치료 퇴원지침서 예시이다   | 해당 파일에 링크 텍스트 `RI치료 퇴원지침서 예시` 포함        |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
