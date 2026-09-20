# 테스트 명세: src/lib/watch/sources/kins-sos.ts · kins-pub.ts

## 대상 구현체

- 경로: src/lib/watch/sources/kins-sos.ts, kins-pub.ts
- 명세: .spec/src/lib/watch/sources/kins-sos.md, kins-pub.md

## 테스트 도구

Vitest. 2026-09-20 실측 응답을 축약한 픽스처(`sosRow`/`pubRow`), `fetch` 는 주입(`fetchImpl`)으로 모의.

## 검증 항목

| describe | it                                                                | 검증 내용                                                         |
| -------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| kins-sos | writNo 를 키로, 본문은 지문에만 쓰고 저장하지 않는다              | externalId·category·detail, 직렬화에 본문 없음, sha256 형식       |
| kins-sos | 본문·제목·공개여부·만료일이 바뀌면 지문이 바뀐다, 관리번호는 아님 | 지문 민감도                                                       |
| kins-sos | rowCount 와 실제 건수가 다르면 throw                              | 잘린 응답 → 삭제 오판 방지                                        |
| kins-sos | fetch 는 목록 API 에 POST 하고 HTTP 오류는 throw                  | URL·method·`menuNo=70000011`, 503 throw                           |
| kins-sos | 소스 메타                                                         | id·guide·link                                                     |
| kins-pub | 분류번호-순번을 키로, 첨부 id·수정일시가 지문에 들어간다          | externalId, 첨부·수정일시 변경 시 지문 변경, 배포일 변경은 무변경 |
| kins-pub | delYn=Y 행은 목록에서 뺀다                                        |                                                                   |
| kins-pub | fetch 는 목록 API 에 POST                                         | URL·`prmDclrDivCd=RSP`, id                                        |
