# 명세: src/pages/inspection-prep.astro

## 역할 요약

정기검사 수검준비 체크리스트. getCollection('inspection_prep') + 하드코딩 수검협조사항. ChecklistItem, Lightbox. localStorage 자동 저장, 선택해제 버튼.

## Props

없음.

## 사이드 이펙트

- localStorage: inspection-\* 키로 체크박스 상태 저장.
- 선택해제 시 해당 키 삭제.

## 핵심 규칙

1. prerender 가능 (Content Collection 기반). PWA 오프라인 precache 대상.
2. 카테고리: 수검협조 요청사항, 공통 준비사항, 의료/판매/생산분야.
3. 자료실 Slug 링크 제공.
