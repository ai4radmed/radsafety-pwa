# 명세: src/components/ChecklistItem.astro

## 역할 요약

수검준비 체크리스트 아코디언 항목. item.render() 또는 set:html, example/exampleImage 토글, resourceId 시 스마트 뷰어 버튼. localStorage로 체크 상태 저장.

## Props

| 이름 | 타입                   | 기본값 |
| ---- | ---------------------- | ------ |
| item | ContentCollectionEntry | -      |
| open | boolean                | false  |

## 핵심 규칙

1. item.render가 함수면 Content 컴포넌트, 아니면 set:html.
2. localStorage: inspection-{id}, inspection-{id}-sub-{index}.
3. view-resource-btn: /api/archives/{resourceId} fetch, increment_archive_view_count RPC, openSmartViewer.
4. 외부 링크(law.go.kr 포함): target="\_blank", rel="noopener noreferrer".

## 딥링크 앵커 (2026-09-20, K-1 후속)

루트 요소에 `id="checklist-<slug>"`(`item.slug ?? item.id`). 페이지 로드 시 `location.hash` 가 자기 id 와 같으면 패널을 열고 `scrollIntoView` — 사건·사고(`/bulletins`)의 "관련 체크리스트" 링크가 여기로 온다.
