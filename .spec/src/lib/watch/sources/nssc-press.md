# 명세: src/lib/watch/sources/nssc-press.ts

## 역할 요약

**원자력안전위원회 보도자료** 어댑터(K-3 세 번째 소스, 2026-09-20). 공개 게시판(공공누리)이라 연동 정당성 문제 없음(plan K-1 소스 비교). RASIS 와 달리 최신순·페이지형이라 전체가 아니라 **최신 15건 창(window)** 만 읽는다(엔진 `mode:'window'`). 게시물마다 직접 주소가 있어 알림에 링크를 싣는다.

**사건 중복(Dr. Ben 2026-09-20)**: 같은 사고가 원안위 속보(즉시) → KINS/NSIC 사례집(수개월 뒤 원인·등급) 두 번 나온다. 이 어댑터는 *속보 감지*까지만 하고, 묶기는 K-1 스레드 모델(사건 단위 1건, 후속으로 append, 자동 제안 + 관리자 확정)에서 한다 — `external_id=BBS_SEQ`·`detail.url` 을 남겨 승격 시 그대로 쓴다.

## Public API

| 이름                         | 설명                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | -------- | --- | ---- | ---- | ---- | --------------------------------------------------------------------- |
| `NSSC_LIST_URL`              | `https://www.nssc.go.kr/ajaxf/FR_BBS_SVC/BBSViewList.do` (POST `siteId=www&lang=ko&MENU_ID=190&SITE_NO=2&BOARD_SEQ=5&pageNo=1&pagePerCnt=15`) |
| `NSSC_BOARD_URL`             | 목록 페이지 `…/FR_CON/index.do?MENU_ID=190` — 소스 `link`                                                                                     |
| `pressUrl(bbsSeq)`           | 게시물 직접 주소 `…/FR_BBS_CON/BoardView.do?MENU_ID=190&CONTENTS_NO=1&SITE_NO=2&BOARD_SEQ=5&BBS_SEQ=…` (2026-09-20 열림 확인)                 |
| `isRelevantPress(row)`       | 부서 `방사선안전과·방사성폐기물안전과` 면 true, 아니면 제목 `병원                                                                             | 의료 | 핵의학 | 동위원소 | RI  | 피폭 | 선원 | 분실 | 방사성의약품`. `방사선`·`방사성` 단독은 제외(원전 방재훈련 잡음 실측) |
| `normalizeNsscRows(payload)` | `data.list[]` → `WatchItem[]`                                                                                                                 |
| `fetchNsscItems(fetchImpl?)` | 25초 타임아웃. HTTP 오류·`data.list` 부재 throw                                                                                               |
| `nsscPressSource`            | `id 'nssc-press'`, label `원안위 보도자료`, `mode 'window'`, `memberFilter = detail.relevant === 'Y'`, link = 목록 페이지                     |

## 매핑

| WatchItem     | 응답 필드                                                      | 비고                                                        |
| ------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `externalId`  | `BBS_SEQ`                                                      | 단조 증가                                                   |
| `title`       | `SUBJECT`                                                      |                                                             |
| `category`    | `DEPT_NM`                                                      | 담당 부서                                                   |
| `fingerprint` | sha256(`SUBJECT`, `WRITE_DATE`, `FILE_CNT`, `PUBLIC_NURI_GBN`) | 본문(`CONTENTS`, 행당 ~130KB)은 지문에도 저장에도 쓰지 않음 |
| `detail`      | `{ writeDate, url, relevant:'Y'                                | 'N' }`                                                      | 알림 문안·회원 필터·K-1 승격 재료 |

## 핵심 규칙

1. **회원 알림은 관련 건만**(`memberFilter`), 관리자 하트비트에는 전체 신규 + "회원 알림 N" 병기.
2. 서버가 `pagePerCnt` 를 무시하고 15건 고정 — 창 15. 월 12건 안팎이라 하루 1회 실행에 누락 없음. 더 촘촘히 올라오면 `pageNo=2` 를 붙인다.
3. 본문 재게시 없음(링크+제목). 공공누리 유형(`N0104`/`N0105`)은 전문 게시 시에만 따진다.
4. 창 밖으로 밀려난 글은 삭제가 아니다 — 엔진 window 모드가 누락·삭제 판정을 생략한다.

## 관련

- `.spec/src/lib/watch/engine.md`(window 모드) · `notify.md`(memberFilter·url 줄) · plan K-1(스레드 모델)·K-3
- 테스트: `tests/unit/lib/watch/nssc-press.test.ts`
