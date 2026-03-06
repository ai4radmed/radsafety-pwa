# 명세: src/content/inspection_prep/31-patient-consent.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **의료분야 준비자료** 항목에서, 환자/보호자 이해 동의 확인 서류 준비 여부를 점검한다. 특히 RI 치료와 관련된 동의서 서류를 준비할 수 있도록 자료실의 RI 치료동의서 예시를 링크로 제공한다. 지침 slug는 `documents/resource_slugs.md`를 따른다.

## 구현체 경로

- `src/content/inspection_prep/31-patient-consent.md`

## 자료실 Slug 링크 요구사항

| 체크 항목                       | Slug                              | 링크 표시 텍스트   |
| ------------------------------- | --------------------------------- | ------------------ |
| 환자/보호자 이해 동의 확인 서류 | `patient-informed-consent-sample` | RI 치료동의서 예시 |

## 핵심 규칙

1. Slug는 `resource_slugs.md` 등록값만 사용한다.
2. 예시 링크는 해당 체크 라인 끝, 동일 스타일(파란색, 새 탭)으로 추가한다.
