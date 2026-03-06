# 명세: src/content/inspection_prep/02e-worker-data.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **방사선작업종사자 및 수시출입자 관련 자료** 항목. 피폭선량 기록, 판독특이자 보고·선량확정 통보 공문, 건강검진 및 법정교육 관련 서류를 준비하도록 안내하며, 일부 항목에 자료실 예시 링크를 제공한다. 지침 slug는 `documents/resource_slugs.md`를 따른다.

## 구현체 경로

- `src/content/inspection_prep/02e-worker-data.md`

## 자료실 Slug 링크 요구사항

| 체크 항목                                  | Slug                                     | 링크 표시 텍스트                   |
| ------------------------------------------ | ---------------------------------------- | ---------------------------------- |
| 판독특이자 발생 보고 및 선량확정 통보 공문 | `dose-determination-notification-sample` | 판독특이자 선량확정 통보 공문 예시 |
| 건강검진 기록부 (건강진단서)               | `worker-health-certificate-sample`       | 종사자 건강진단서 예시             |

## 핵심 규칙

1. Slug는 `resource_slugs.md` 등록값만 사용한다.
2. 예시 링크는 해당 체크 라인 끝, 동일 스타일(파란색, 새 탭)으로 추가한다.
