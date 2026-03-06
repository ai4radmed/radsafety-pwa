# 명세: src/content/inspection_prep/02d-measurement-records.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **방사선/능 측정 관련 기록부** 항목. 시설별 외부 방사선량률·표면오염도 측정기록 등 측정 관련 기록을 준비하도록 안내하며, 선량률∙표면오염도 측정기록부 예시 자료실 링크를 제공한다. 지침 slug는 `documents/resource_slugs.md`를 따른다.

## 구현체 경로

- `src/content/inspection_prep/02d-measurement-records.md`

## 자료실 Slug 링크 요구사항

| 체크 항목                                       | Slug                                           | 링크 표시 텍스트                  |
| ----------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| 시설별 외부 방사선량률, 표면오염도 측정기록부   | `doserate-surface-contamination-record-sample` | 선량률∙표면오염도 측정기록부 예시 |
| 배출 전 방사능 농도 기록부 (감시기 측정결과 등) | `pre-discharge-concentration-log-sample`       | 예시                              |
| 밀봉선원 누설 점검기록부                        | `sealed-source-leak-test-record-sample`        | 예시                              |

## 핵심 규칙

1. Slug는 `resource_slugs.md` 등록값만 사용한다.
2. 예시 링크는 해당 체크 라인 끝, 동일 스타일(파란색, 새 탭)으로 추가한다.
