# 테스트 명세: 정기검사 수검준비 31-patient-consent

## 대상 구현체

- 경로: src/content/inspection_prep/31-patient-consent.md
- 파일 명세: .spec/src/content/inspection_prep-31-patient-consent.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                           | it                                                                            | 검증 내용                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| inspection_prep 31 환자/보호자 이해 동의 확인 서류 | 환자/보호자 이해 동의 확인 서류 항목 끝에 RI 치료동의서 예시 slug 링크가 있다 | 해당 파일에 `patient-informed-consent-sample` 포함                     |
| inspection_prep 31 환자/보호자 이해 동의 확인 서류 | 환자/보호자 이해 동의 확인 서류 항목의 링크 텍스트가 RI 치료동의서 예시이다   | 해당 파일에 링크 텍스트 `RI 치료동의서 예시` 포함                      |
| inspection_prep 31 환자/보호자 이해 동의 확인 서류 | 중복된 의료피폭 방사선방호 대책 항목이 없다                                   | 해당 파일에 `의료피폭에 대한 방사선방호 대책` 문자열이 포함되지 않는다 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
