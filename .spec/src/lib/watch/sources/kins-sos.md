# 명세: src/lib/watch/sources/kins-sos.ts

## 역할 요약

RASIS **방사선규제해석 SOS** 어댑터. 화면(`/rsp/nob/pii/RadSafeInfoSysPtcp070101.do`)은 부모 프레임 함수(`top.fn_getRealMenu`)에 의존해 직접 주소가 없지만(2026-09-20 headless 실측 — GET 은 "알 수 없는 오류", 단독 POST 는 목록 0건), 목록을 채우는 내부 API 는 로그인·프레임 없이 JSON 을 돌려준다. 그 API 만 읽어 `WatchItem[]` 로 정규화한다.

## Public API

| 이름                         | 설명                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `KINS_SOS_LIST_URL`          | `https://rasis.kins.re.kr/rsp/nob/pii/selectIntrprtInstList.do`                                                      |
| `normalizeSosRows(payload)`  | 순수. `faqList[]` → `WatchItem[]`. `pageInfo.rowCount` 와 실제 건수가 다르면 **throw**(잘린 응답 → 삭제 오판 방지).  |
| `fetchSosItems(fetchImpl?)`  | POST `pageIndex=1&pageSize=500&menuNo=70000011`, `x-requested-with: XMLHttpRequest`, 20초 타임아웃. HTTP 오류 throw. |
| `sha256(text)`               | 지문 해시(다른 어댑터도 재사용).                                                                                     |
| `kinsSosSource: WatchSource` | `id 'kins-sos'`, label `KINS 방사선규제해석 SOS`, guide `RASIS 메인 → 알림마당 → 방사선규제해석SOS …`, link `/kins`  |

## 매핑 (2026-09-20 실측 응답 158건 기준)

| WatchItem     | 응답 필드                                                                        | 비고                                          |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| `externalId`  | `writNo`                                                                         | 158개 모두 유일. `mngNo`(2.001)는 분류번호    |
| `title`       | `writTitl`                                                                       |                                               |
| `category`    | `questtypcd · questtypcds`                                                       | "허가/신고 · 규제대상"                        |
| `fingerprint` | sha256(`writTitl`, `bdtxtCntn`, `questtypcd`, `questtypcds`, `oppbYn`, `exprDt`) | 본문은 지문에만. `mngNo` 변경은 지문 무변경   |
| `detail`      | `{ mngNo, opertnDt }`                                                            | 알림 문안의 "[2.001]" 표기와 사람이 찾는 열쇠 |

## 핵심 규칙

1. **본문 미저장**(`bdtxtCntn` 은 해시 재료로만). 답변 본문(`answCntn`)은 목록에 비어 있어 지문에 못 넣는다 — 답변만 바뀌는 수정은 못 잡는다(알려진 한계).
2. `pageSize=500` 한 페이지로 전부 받는다(158건·1.3MB). 500 을 넘기면 rowCount 불일치로 throw 되어 실패로 표면화된다 — 그때 페이징을 붙인다.
3. User-Agent 에 앱 주소를 밝힌다(`RadSafety-watch/1.0 (+https://radsafety.kr/kins)`) — 공개 API 를 기계가 읽는다는 사실을 숨기지 않는다. 하루 1회.
4. `robots.txt` 는 RASIS 의 이 경로를 막지 않는다(K-1 검토 때 "전면 차단"으로 본 것은 `보고사건조회` 쪽 — 이 목록 API 는 브라우저가 매 방문 호출하는 공개 XHR). 그래도 저작물 재게시는 하지 않는다(제목·분류만).

## 관련

- 엔진: `.spec/src/lib/watch/engine.md` · 간행물 어댑터 `kins-pub.md`
- 앱 링크 페이지: `.spec/src/pages/kins.md`
- 테스트: `tests/unit/lib/watch/sources.test.ts`
