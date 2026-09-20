# 명세: src/lib/watch/sources/kins-pub.ts

## 역할 요약

RASIS **이용자지원간행물** 어댑터. SOS 와 같은 구조(프레임 의존 화면 `/rsp/rsi/RadSafeInfoSysRadSafeInfo050101.do` + 로그인 없는 목록 API). 2026-09-20 실측 40건.

## Public API

| 이름                         | 설명                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `KINS_PUB_LIST_URL`          | `https://rasis.kins.re.kr/adm/pim/selectPblcList.do`                                                           |
| `normalizePubRows(payload)`  | 순수. `pblcList[]` → `WatchItem[]`. `delYn='Y'` 행 제외. rowCount 불일치 throw.                                |
| `fetchPubItems(fetchImpl?)`  | POST `pageIndex=1&pageSize=500&prmDclrDivCd=RSP&searchTy=PBLC_TITL&searchKeyword=&pblcClNo=&pblcClSn=`         |
| `kinsPubSource: WatchSource` | `id 'kins-pub'`, label `KINS 이용자지원간행물`, guide `RASIS 메인 → 알림마당 → 이용자지원간행물`, link `/kins` |

## 매핑

| WatchItem     | 응답 필드                                                                                           | 비고                                                    |
| ------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `externalId`  | `pblcClNo-pblcClSn`                                                                                 | 분류번호-순번                                           |
| `title`       | `pblcTitl`                                                                                          |                                                         |
| `category`    | `pblcClNm`                                                                                          | "원자력안전법령집/고시집", "의료/공급" 등               |
| `fingerprint` | sha256(`pblcTitl`, `atchFileId`, `atchFileIdHwp`, `atchFileIdPdf`, `atchFileIdEtc`, `lastUpdtDttm`) | 같은 제목으로 파일만 새 판이 올라와도 "수정"으로 잡힌다 |
| `detail`      | `{ wdtbDt }`                                                                                        | 배포일                                                  |

## 핵심 규칙

1. 간행물은 **파일 교체가 곧 갱신**(법령집·고시집 연도판). 그래서 첨부 id·수정일시를 지문에 넣고, 배포일(`wdtbDt`)은 넣지 않는다(표기만 바뀌는 잡음).
2. `delYn='Y'` 는 목록에서 빼서 엔진이 "누락 → 삭제"로 처리하게 한다.
3. 나머지(본문 미저장·UA 표기·pageSize)는 `kins-sos.md` 와 동일.

## 관련

- `.spec/src/lib/watch/engine.md`, `kins-sos.md` · 테스트 `tests/unit/lib/watch/sources.test.ts`
