# 테스트 명세: src/components/Sidebar.astro

## 대상 구현체

- 경로: `src/components/Sidebar.astro`
- 명세: `.spec/src/components/Sidebar.md`

## 테스트 방식

소스 파일을 문자열로 읽어, **스크롤 래퍼(`.nav-links`)와 버전 푸터 구조**가 명세와 일치하는지 정적 검사한다.

## 검증 항목

| describe | it                            | 검증 내용                                                                |
| -------- | ----------------------------- | ------------------------------------------------------------------------ |
| Sidebar  | nav-links 래퍼가 존재한다     | `<div class=\"nav-links\">` 안에 메뉴/사용자/관리자 그룹이 감싸져 있는지 |
| Sidebar  | sidebar overflow 확인         | `.sidebar {` 블록에 `overflow: hidden`이 남아있지 않은지                 |
| Sidebar  | nav-links overflow 확인       | `.nav-links` 스타일에 `overflow-y: auto`가 포함되는지                    |
| Sidebar  | 버전 푸터 문자열 확인         | `RadSafety v{APP_VERSION} · {APP_RELEASE_DATE}` 문자열이 포함되는지      |
| Sidebar  | 사용자 개선의견조회 링크 확인 | `href="/feedback-query"` 및 링크 텍스트 `개선의견조회`가 존재해야 한다   |

## 유지보수 목적

- 모바일에서 사이드바 하단 메뉴(관리자 영역 포함)가 잘리지 않고 스크롤 가능한 구조를 보장한다.
- 버전 표기 형식이 명세와 일치하는지 정적으로 검증한다.
