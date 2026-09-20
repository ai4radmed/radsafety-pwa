# 테스트 명세: src/lib/watch/sources/nssc-press.ts

## 대상 구현체

- 경로: src/lib/watch/sources/nssc-press.ts
- 명세: .spec/src/lib/watch/sources/nssc-press.md

## 테스트 도구

Vitest. 2026-09-20 실측 응답(`data.list[]`) 축약 픽스처, `fetch` 주입 모의.

## 검증 항목

| it                                                             | 검증 내용                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| BBS_SEQ 를 키로, 직접 주소·게시일·관련 여부를 detail 에 넣는다 | externalId·category·detail(url/writeDate/relevant), `pressUrl` 형식         |
| 관련 판정 — 부서가 주 기준, 제목 키워드는 보조                 | 두 부서 true, 회의 개최·IAEA false, 병원·동위원소 true, `방사선` 단독 false |
| 지문은 제목·게시일·첨부수·공공누리 — 본문은 쓰지 않는다        | FILE_CNT·SUBJECT 변경 시 변경, DEPT_NM 변경은 무변경                        |
| fetch 는 목록 XHR 에 POST 하고, data.list 가 없으면 throw      | URL·`MENU_ID=190`·`BOARD_SEQ=5`, 형식 불일치·HTTP 500 throw                 |
| 소스 메타 — window 모드 + 회원 필터                            | mode·memberFilter(relevant Y/N)                                             |
