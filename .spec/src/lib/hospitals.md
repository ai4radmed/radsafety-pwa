# 명세: src/lib/hospitals.ts

## 역할 요약

회원기관 조회의 **서버 측 단일 진입점**. 정적 목록 `src/data/hospitals.ts`(`HOSPITALS`)와 관리자가 화면에서 등록한 DB 테이블 `hospitals_custom`(`sql_query/migrate_add_hospitals_custom.sql`)을 하나의 목록처럼 다룬다. 2026-09-19 신설(`documents/privacy_redesign_plan.md` §2-3 개정 2).

## Public API

| 이름                             | 설명                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `CUSTOM_ID_PREFIX`               | `'c-'`. 커스텀 기관 id 접두 — 정적 id와 구분해 DB 조회 여부를 결정한다.                                                         |
| `normalizeHospitalName(name)`    | 공백 제거 + 소문자화. 이름 비교·해시의 기준.                                                                                    |
| `customHospitalId(name)`         | `'c-' + sha256(normalize(name))[:10]`. **결정적** — 같은 이름은 같은 id. slug 규칙(`^[a-z0-9-]+$`) 만족.                        |
| `isStaticHospitalId(id)`         | 정적 목록에 있는 id인가(동기).                                                                                                  |
| `findStaticHospitalByName(name)` | 정규화한 이름이 정적 목록과 일치하는 항목(`'other'` 제외). 관리자가 요청 기관명을 등록할 때 표기만 다른 기존 기관으로 합치기용. |
| `isKnownHospitalId(id)`          | 정적 → 없으면 `c-` 접두일 때만 `hospitals_custom` 조회. 액션의 `hospitalId` 검증에 쓴다(비동기라 zod refine 대신 핸들러에서).   |
| `getHospitalName(id)`            | 표시용 이름. 정적 → 커스텀 → 못 찾으면 id 그대로.                                                                               |

## 핵심 규칙

1. 정적 목록이 항상 우선 — 같은 id가 양쪽에 있을 수 없도록 커스텀 id는 `c-` 접두를 강제한다(정적 id는 이 접두를 쓰지 않는다).
2. DB 조회는 `supabaseAdmin`(서비스 롤). 클라이언트(자동완성·관리자 화면)는 이 모듈을 쓰지 않고 `supabase-browser`로 `hospitals_custom`을 직접 읽는다(anon SELECT 허용).
3. `supabaseAdmin`이 없으면(env 미설정) 커스텀 조회는 조용히 "없음"으로 처리 — 정적 목록만으로 동작.
4. 한글 기관명은 음역 slug를 만들 수 없어 해시를 쓴다. 이름이 바뀌면 id도 바뀌므로 **등록 후 개명은 `name`만 UPDATE**(id 유지) — 정적 목록의 규칙 2와 동일.

## 관련

- 데이터: `src/data/hospitals.ts`(`.spec/src/data/hospitals.md`), 테이블: `.spec/sql_query/migrate_add_hospitals_custom.md`
- 사용처: `src/actions/index.ts`(`signUpWithUsername`·`claimUsername`·`resolveHospitalRequest`·`registerHospitalFromRequest`)
