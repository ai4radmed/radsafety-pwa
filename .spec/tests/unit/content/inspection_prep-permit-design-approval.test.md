# 테스트 명세: 정기검사 수검준비 00a-permit-design-approval

## 대상 구현체

- 경로: src/content/inspection_prep/00a-permit-design-approval.md
- 파일 명세: .spec/src/content/inspection_prep-00a-permit-design-approval.md (자료실 slug 링크 요구사항)
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                          | it                                                                     | 검증 내용                                                        |
| --------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| inspection_prep 00a-permit 디자인 | 방사선기기 설계승인서 항목에 예시 slug 링크 존재                       | 해당 파일에 `radiation-equipment-design-approval-sample` 포함    |
| inspection_prep 00a-permit 디자인 | 허가증 사본 항목에 방사선발생장치 사용허가증 예시 slug 링크 존재       | 해당 파일에 `radiation-generating-device-permit-sample` 포함     |
| inspection_prep 00a-permit 디자인 | 허가증 사본 항목 링크 표시 텍스트가 방사선발생장치 사용허가증 예시이다 | 해당 파일에 링크 내 텍스트 `방사선발생장치 사용허가증 예시` 포함 |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
