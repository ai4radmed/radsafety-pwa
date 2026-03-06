# 명세: src/content/inspection_prep/01-previous-inspection-records.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **과년도 정기검사 관련 문서** 항목. 결과통보 공문·시정조치보고서 예시 자료실 링크를 제공한다. 지침 slug는 `documents/resource_slugs.md`를 따른다.

## 구현체 경로

- `src/content/inspection_prep/01-previous-inspection-records.md`

## 자료실 Slug 링크 요구사항

| 체크 항목                                                            | Slug                                  | 링크 표시 텍스트 |
| -------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| 결과통보 공문(최초 수검일 경우 제외)                                 | `inspection-notification-sample`      | 예시             |
| 지적/권고사항 발생 시 제출한 공문(검사지적, 권고사항 시정조치보고서) | `inspection-corrective-report-sample` | 예시             |

## 핵심 규칙

1. Slug는 `resource_slugs.md` 등록값만 사용한다.
2. 예시 링크는 체크 라인 끝, 동일 스타일(파란색, 새 탭) 유지.
