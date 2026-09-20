# 명세: src/lib/watch/sources/nsic-accidents.ts

## 역할 요약

**NSIC(원자력안전정보공개센터) 방사선사고 사례집** 어댑터 — K-1 의 본체(2026-09-20). 목록은 HTML 조각(POST `currPage=1&listNum=1000`, 2026-09-20 실측 103건·의료 19건), 상세는 JSON(POST `seq=EXMN…`). 사건 ID(`EXMN…`)는 RASIS 보고와 동일. 등급 평가 후 게재라 사고 뒤 수개월 늦지만 개요·원인·등급이 있다. 속보(원안위 보도자료)와의 사건 중복은 `bulletins` 스레드에서 묶는다.

## Public API

| 이름                                                  | 설명                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | ------ | ------------ | ---- | ------ | ----------------- |
| `NSIC_LIST_URL` / `NSIC_DETAIL_URL` / `NSIC_PAGE_URL` | `…/information/ajaxRadAccidentList.do` / `…/ajaxRadAccidentListPop.do` / 사람용 목록 페이지(`source_url`)                          |
| `parseNsicList(html)`                                 | 순수. `<tr>` 중 `gotoDtl('EXMN…')` 가 있는 행만. 셀 = 사고일자·등급·`[분류]사고명`·`[지역]`·기관. `[분류]` 를 `type` 으로 분리     |
| `isRelevantAccident({org,title})`                     | 기관 `병원                                                                                                                         | 의료원 | 의원`또는 사고명`치료용 | 진료용 | 방사성의약품 | 환자 | 핵의학 | 진단용`(plan K-1) |
| `toWatchItem(row)`                                    | `externalId=EXMN`, `category=type`, `detail={occurredAt, grade, region, org, url, relevant}`                                       |
| `fetchNsicItems()`                                    | 전량 1페이지. 파싱 0건이면 throw(구조 변경 감지 → 삭제 오판 방지)                                                                  |
| `fetchNsicDetail(seq)`                                | `{summary: inciMainCntn, cause: inciCausCntn}` — CRLF 정리. `inciSummCntn` 은 개요와 중복이라 생략                                 |
| `nsicAccidentSource`                                  | `id 'nsic-accidents'`, `mode 'full'`, `memberFilter relevant`, **`notifyMembers:false`**(회원 알림은 게시 시점), link `/bulletins` |

## 핵심 규칙

1. **마스킹 그대로** — 기관명 'OO대학교병원' 형태를 저장(실명·상세주소 필드 없음). 개인정보 0.
2. 상세는 감시 단계에서 부르지 않는다(103건 × 매일 ✗) — `bulletins/ingest.ts` 가 **신규 건에만** 호출(백필 1회 + 이후 월 몇 건).
3. 목록 구조가 바뀌면 0건 throw → 연속 실패 3회 텔레그램. 파서는 정규식(서버에 DOM 라이브러리 없음) — 헤더 행은 EXMN 부재로 자연 제외.
4. `mode 'full'` — 전량 목록이므로 누락·삭제 판정 정상 적용(사례집에서 내려가는 일은 드묾).

## 관련

- `.spec/src/lib/bulletins/ingest.md`, `.spec/sql_query/migrate_add_bulletins.md`, plan K-1 · 테스트 `tests/unit/lib/watch/nsic-accidents.test.ts`
