# 명세: src/content/inspection_prep/00a-permit-design-approval.md

## 역할 요약

정기검사 수검준비 체크리스트 중 **분야별 허가증 및 방사선기기 설계승인서 사본(필요 시)** 항목. 인허가/서류 카테고리, 필수 중요도. 수검자가 생산/판매/사용 등 해당 분야별 허가증과 방사선기기 설계승인서 사본을 준비할 수 있도록 예시 자료실 링크를 제공한다.

## 구현체 경로

- `src/content/inspection_prep/00a-permit-design-approval.md`

## 상위 명세

- `documents/resource_slugs.md` — 체크리스트별 필요 자료(슬러그) 매핑
- `.spec/src/content.config.md` — inspection_prep 컬렉션 스키마

## 자료실 Slug 링크 요구사항

구현체 마크다운 본문은 아래 slug에 대한 자료실 뷰 링크를 **반드시** 포함한다. 링크 형식: `/api/archives/view/{slug}`. 표시 텍스트는 각 행의 "링크 표시 텍스트" 컬럼대로 한다.

| 체크 항목                                      | Slug                                         | 링크 표시 텍스트               |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------ |
| 허가증 사본 (생산/판매/사용 등 해당 분야별)    | `radiation-generating-device-permit-sample`  | 방사선발생장치 사용허가증 예시 |
| 방사선기기 설계승인서 사본 (해당 기기 보유 시) | `radiation-equipment-design-approval-sample` | 예시                           |

## 핵심 규칙

1. Slug는 `resource_slugs.md`에 등록된 값만 사용한다. 한 번 설정한 slug는 변경하지 않는다.
2. 예시 링크는 해당 체크 라인 끝에 괄호 안에 배치하며, 동일 스타일(파란색, 새 탭)을 유지한다.
