# 명세: src/components/Icon.astro

## 역할 요약

Lucide/Feather 스타일 SVG 아이콘. name에 따라 path d 렌더링.

## Props

| 이름  | 타입        | 기본값 |
| ----- | ----------- | ------ |
| name  | union(27종) | -      |
| size  | string      | '24'   |
| class | string      | -      |

## 지원 name

home, clipboard, search, user, lock-closed, chevron-down, document, menu, x, document-text, download, bell, square, check-square, help, settings, adjustments-horizontal, dots, pencil, trash, alert-circle, folder, mail, inbox, book, shield

## 핵심 규칙

1. paths 객체에 name별 path d 문자열.
2. SVG: fill="none", stroke="currentColor", stroke-width="2", viewBox="0 0 24 24".
