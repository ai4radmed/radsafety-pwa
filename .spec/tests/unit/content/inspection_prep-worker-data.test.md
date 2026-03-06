# 테스트 명세: 정기검사 수검준비 02e-worker-data

## 대상 구현체

- 경로: src/content/inspection_prep/02e-worker-data.md
- 파일 명세: .spec/src/content/inspection_prep-02e-worker-data.md
- 지침: documents/resource_slugs.md (체크리스트별 필요 자료 매핑)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                                  | it                                                                             | 검증 내용                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| inspection_prep 02e 방사선작업종사자 자료 | 피폭선량 기록부 항목 끝에 수시출입자 피폭선량 기록 예시 slug 링크가 있다       | 해당 파일에 `occasional-visitor-dose-record-sample` 포함          |
| inspection_prep 02e 방사선작업종사자 자료 | 피폭선량 기록부 항목의 링크 텍스트가 수시출입자 피폭선량 기록 예시이다         | 해당 파일에 링크 텍스트 `수시출입자 피폭선량 기록 예시` 포함      |
| inspection_prep 02e 방사선작업종사자 자료 | 판독특이자 발생 보고 및 선량확정 통보 공문 항목 끝에 예시 slug 링크가 있다     | 해당 파일에 `dose-determination-notification-sample` 포함         |
| inspection_prep 02e 방사선작업종사자 자료 | 판독특이자 공문 항목의 링크 텍스트가 판독특이자 선량확정 통보 공문 예시이다    | 해당 파일에 링크 텍스트 `판독특이자 선량확정 통보 공문 예시` 포함 |
| inspection_prep 02e 방사선작업종사자 자료 | 건강검진 기록부 항목 끝에 종사자 건강진단서 예시 slug 링크가 있다              | 해당 파일에 `worker-health-certificate-sample` 포함               |
| inspection_prep 02e 방사선작업종사자 자료 | 법정교육(기본/직장교육) 수료증 항목 끝에 법정교육 수료증 예시 slug 링크가 있다 | 해당 파일에 `radiation-training-cert-sample` 포함                 |
| inspection_prep 02e 방사선작업종사자 자료 | 법정교육 수료증 항목의 링크 텍스트가 법정교육 수료증 예시이다                  | 해당 파일에 링크 텍스트 `법정교육 수료증 예시` 포함               |

## Mock/Setup

- Node.js fs로 마크다운 파일을 읽어 문자열 포함 여부를 검증.
