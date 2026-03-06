# 테스트 명세: 정기검사 수검준비 02f-waste-data

## 대상 구현체

- 경로: src/content/inspection_prep/02f-waste-data.md
- 파일 명세: .spec/src/content/inspection_prep-02f-waste-data.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                   | it                                                                                   | 검증 내용                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| inspection_prep 02f 방사성폐기물 관련 자료 | 방사선원 위탁폐기 관련 증빙자료 항목 끝에 RI 위탁폐기 증빙자료 예시 slug 링크가 있다 | 해당 파일에 `ri-waste-disposal-consignment-proof-sample` 포함 |
| inspection_prep 02f 방사성폐기물 관련 자료 | 방사선원 위탁폐기 관련 증빙자료 항목의 링크 텍스트가 RI 위탁폐기 증빙자료 예시이다   | 해당 파일에 링크 텍스트 `RI 위탁폐기 증빙자료 예시` 포함      |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
