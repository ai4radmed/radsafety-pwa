# 테스트 명세: 정기검사 수검준비 02d-measurement-records

## 대상 구현체

- 경로: src/content/inspection_prep/02d-measurement-records.md
- 파일 명세: .spec/src/content/inspection_prep-02d-measurement-records.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                  | it                                                                            | 검증 내용                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| inspection_prep 02d 방사선/능 측정 기록부 | 시설별 외부 방사선량률, 표면오염도 측정기록부 항목 끝에 예시 slug 링크가 있다 | 해당 파일에 `doserate-surface-contamination-record-sample` 및 링크 텍스트 `선량률∙표면오염도 측정기록부 예시` 포함 |
| inspection_prep 02d 방사선/능 측정 기록부 | 배출 전 방사능 농도 기록부 항목 끝에 예시 slug 링크가 있다                    | 해당 파일에 `pre-discharge-concentration-log-sample` 포함                                                          |
| inspection_prep 02d 방사선/능 측정 기록부 | 밀봉선원 누설 점검기록부 항목 끝에 예시 slug 링크가 있다                      | 해당 파일에 `sealed-source-leak-test-record-sample` 포함                                                           |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
