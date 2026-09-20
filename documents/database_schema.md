# RadSafety 데이터베이스 스키마

이 문서는 RadSafety 프로젝트의 Supabase PostgreSQL 데이터베이스 구조를 설명합니다.

이 문서는 RadSafety 프로젝트의 Supabase PostgreSQL 데이터베이스 구조를 설명합니다.

> **Note:** 모든 테이블 스키마 정의와 마이그레이션은 `sql_query/rebuild_all_tables.sql` 파일 하나로 통합 관리됩니다.
>
> 다만, 운영 환경에서 “기존 데이터 보존이 최우선”인 경우에는 전체 재빌드 실행이 금지될 수 있으므로,
> 이때는 테이블/제약을 최소 단위로 수정하는 별도 마이그레이션(`sql_query/migrate_*.sql`)을 우선 사용합니다.

## 스키마 개요

PostgreSQL에서 **스키마(Schema)**는 테이블, 함수 등의 객체를 포함하는 논리적 네임스페이스입니다. Supabase의 기본 서비스 스키마는 `public`입니다.

- **데이터베이스 엔진**: PostgreSQL
- **기본 스키마**: `public`

## 주요 테이블

### 1. `profiles`

사용자 프로필 정보를 저장하며, `auth.users` 테이블과 1:1로 연결됩니다.

> ⚠️ **`auth.users` → `profiles` 자동생성 트리거 존재** (2026-09-16, Stage 1-A 프리뷰 테스트로 발견). `auth.users`에 새 행이 INSERT되면 `profiles`에도 빈 행(`id`만 채워진)이 자동으로 생긴다. 이 저장소의 `sql_query/*.sql`에는 정의가 없다 — 대시보드에서만 존재하는 것으로 추정. **이 테이블에 `id`로 새 행을 쓰는 코드는 반드시 `upsert(onConflict:'id')`를 쓸 것** — 평범한 `insert`는 `duplicate key value violates unique constraint "profiles_pkey"`로 매번 실패한다(`src/actions/index.ts`의 `signUpWithUsername`이 실제 사례, `.spec/src/actions/index.md` 규칙 10). 정확한 트리거 정의는 SQL Editor에서 `select pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'auth.users'::regclass;`로 확인.

| 필드명                    | 타입            | 설명                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 기본값     |
| :------------------------ | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- |
| `id`                      | `uuid` (PK)     | `auth.users.id` 참조 (외래키)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |            |
| `username`                | `text` (UNIQUE) | 로그인 아이디 (영문 소문자·숫자·`_`·`-`, 3~20자). `sql_query/migrate_add_username.sql` (2026-09-15, Stage 1-A). `auth.users.email` 은 `<username>@radsafety.invalid` 파생값. **코드는 운영 배포 완료**(이메일 OTP 로그인 제거, PR #56, 2026-09-18). **nullable 유지 — `sql_query/migrate_finalize_username.sql` 은 불채택**(카카오 사용자가 자리표시 아이디로 게이트를 못 타는 문제; `privacy_redesign_plan.md` 1단계 진행 상태 참조). NULL 은 `auth-handler.ts` 첫 접속 게이트가 막는다 | `NULL`     |
| `status`                  | `text`          | 회원 상태 (`pending`:가입 후 승인 대기, `active`:정상, `suspended`:정지, `banned`:탈퇴처리). `sql_query/migrate_add_member_status_hospital.sql` (2026-09-16). 기존 행은 전부 `active`로 시작 — `pending`은 Phase 2 구현 후 신규 가입에서만 명시적으로 발생                                                                                                                                                                                                                               | `'active'` |
| `hospital_id`             | `text`          | 소속기관 (`src/data/hospitals.ts`의 `id` 참조, DB 외래키 아님). `sql_query/migrate_add_member_status_hospital.sql` (2026-09-16). 가입 폼(Phase 2)·아이디 전환 화면이 채운다. 목록에 없는 기관을 적으면 `'other'`(기타)로 들어간다(2026-09-19, 아래 `hospital_request`)                                                                                                                                                                                                                   | `NULL`     |
| `hospital_request`        | `text`          | 회원기관 등록 요청 — 목록에 없는 기관을 타이핑한 채 가입/전환하면 그 텍스트가 여기 남고 `hospital_id='other'`. `NOT NULL` = 관리자 검토 대기. `admin/member-approval.astro` "기관 등록 요청" → `resolveHospitalRequest`(등록: `hospital_id` 갱신·비움 / 거절: 비움만). `sql_query/migrate_add_hospital_request.sql` (2026-09-19)                                                                                                                                                         | `NULL`     |
| `can_publish`             | `boolean`       | 직접 게시 권한(2-1, `sql_query/migrate_add_publish_gate.sql`, 2026-09-19). 첫 제출이 승인되면 `true`, 관리자가 회수 가능. 트리거가 이 값으로 제출 행 `status`를 정한다. 백필: 옛 인증 회원·관리자 `true`                                                                                                                                                                                                                                                                                 | `false`    |
| `reject_count`            | `integer`       | 반려 누적(2-1). 3 이상이면 RLS INSERT 정책이 제출을 막는다                                                                                                                                                                                                                                                                                                                                                                                                                               | `0`        |
| `provider`                | `text`          | 로그인 제공자(`kakao`/`email`). `sql_query/migrate_add_profile_provider.sql` (2026-09-18) — `admin/member-approval.astro`가 다른 사용자의 로그인 방식을 보여주려 select 했으나 컬럼이 없어 나던 로드 실패("column profiles.provider does not exist")를 계기로 신설. `signUpWithUsername`/`auth-handler.ts` 자가 치유가 가입 시점에 채움, 이 컬럼 신설 전 가입자는 `NULL`                                                                                                                 |            |
| `created_at`              | `timestamp`     | 프로필 생성 일시 (앱 가입일)                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `now()`    |
| `is_admin`                | `boolean`       | 관리자 여부                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `false`    |
| ~~`verification_status`~~ | —               | **삭제됨(2-1, `sql_query/migrate_drop_verification_status.sql`, 2026-09-19)** — 업로드 게이트가 `can_publish`로 교체된 뒤 제거                                                                                                                                                                                                                                                                                                                                                           |            |
| `society`                 | `text`          | 소속 학회 코드 (`nuclear_medicine`, `technology` 등)                                                                                                                                                                                                                                                                                                                                                                                                                                     |            |

> **Note (2-2·2-1, 2026-09-19)**: 실명·이메일·닉네임·부서·구분·면허 컬럼 14개는 `migrate_drop_legacy_profile_columns.sql`로, `verification_status`는 `migrate_drop_verification_status.sql`로 삭제됐다. 옛 4단계 인증 상태(참고용):
>
> - `none`: 미인증 (기본값, 권한 없음)
> - `list`: 회원명부 인증 (즉시 인증, 모든 권한)
> - `temp_verified`: 임시 인증 (이메일 검증 완료, 관리자 승인 대기, 권한 부여)
> - `verified`: 관리자 승인 완료 (최종 인증, 모든 권한)

### 2. `findings`

지적 및 권고 사례 데이터를 저장합니다.

| 필드명             | 타입        | 설명                                                                                                                                                                                                                                                                                |
| :----------------- | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `uuid` (PK) | 고유 식별자                                                                                                                                                                                                                                                                         |
| `title`            | `text`      | 사례 제목                                                                                                                                                                                                                                                                           |
| `finding_type`     | `text`      | 구분 (`지적`, `권고`)                                                                                                                                                                                                                                                               |
| `tags`             | `text[]`    | 태그/카테고리 배열                                                                                                                                                                                                                                                                  |
| `year`             | `text`      | 수검 년도                                                                                                                                                                                                                                                                           |
| `description`      | `text`      | 상세 내용                                                                                                                                                                                                                                                                           |
| `violation_clause` | `text`      | 관련 법령 조항                                                                                                                                                                                                                                                                      |
| `solution`         | `text`      | 조치 방안                                                                                                                                                                                                                                                                           |
| `created_at`       | `timestamp` | 생성 일시                                                                                                                                                                                                                                                                           |
| `user_id`          | `uuid`      | 작성자 ID (`auth.users.id` 참조, `ON DELETE SET NULL`로 탈퇴 시에도 데이터 보존)                                                                                                                                                                                                    |
| `status`           | `text`      | `pending`/`published`/`rejected`(2-1). 트리거 `findings_enforce_status`가 정함. pending은 작성자·관리자만 조회(RLS). **anon(비가입자)은 열 단위 GRANT로 `id,title,finding_type,tags,year,created_at,status,user_id`만**, published 행만(`migrate_public_tier_read.sql`, 2026-09-19) |

### 3. `archives`

자료실(Resources)의 게시물 및 파일 정보를 저장합니다.

| 필드명           | 타입            | 설명                                                                                        | 기본값              |
| :--------------- | :-------------- | :------------------------------------------------------------------------------------------ | :------------------ |
| `id`             | `uuid` (PK)     | 고유 식별자                                                                                 | `gen_random_uuid()` |
| `title`          | `text`          | 자료 제목                                                                                   |                     |
| `category`       | `text`          | 분류 (작성지침, 가이드북 등)                                                                |                     |
| `slug`           | `text` (UNIQUE) | URL 친화적 고유 식별자                                                                      |                     |
| `year`           | `integer`       | 자료 저작년도 (제작년도)                                                                    |                     |
| `file_url`       | `text`          | Supabase Storage 파일 경로                                                                  |                     |
| `file_name`      | `text`          | 원본 파일명                                                                                 |                     |
| `author`         | `text`          | 표시용 작성자명 (보조/레거시)                                                               |                     |
| `user_id`        | `uuid` (FK)     | 등록자 ID (`profiles.id` 참조)                                                              | `auth.uid()`        |
| `view_count`     | `integer`       | 조회수                                                                                      | `0`                 |
| `download_count` | `integer`       | 다운로드 횟수                                                                               | `0`                 |
| `content_html`   | `text`          | HTML/Markdown 내용                                                                          |                     |
| `status`         | `text`          | `pending`/`published`/`rejected`(2-1). 트리거 `archives_enforce_status`가 정함              | `'pending'`         |
| `file_bucket`    | `text`          | `resources`(공개) / `resources-pending`(비공개, `<uid>/…`). 승인 시 서버가 공개로 이동(2-1) | `'resources'`       |
| `created_at`     | `timestamp`     | 생성 일시 (DB 등록 일시)                                                                    | `now()`             |

> **Note**:
>
> - **`slug`**: URL 친화적 고유 식별자 (예: `safety-regulations-guide`)
>     - 체크리스트, 알림 등에서 자료를 안정적으로 참조하기 위해 사용
>     - 한 번 설정하면 **절대 변경 금지** (링크 깨짐 방지)
>     - 자료 삭제 후 재등록 시 동일한 slug 재사용 가능
>     - 관리: `documents/resource_slugs.md` 참조
> - **`year`**: 자료의 저작년도(제작년도)를 저장하며, `created_at`(DB 등록일시)과 구별됩니다.
> - **`view_count`, `download_count`**: 자료의 조회수와 다운로드 횟수를 추적합니다.
> - `registrant_email` 필드는 제거되었으며, `user_id`를 통해 `profiles.username`을 참조합니다(등록자 표시 `@username`, 2-2 이후 실명·이메일 미보관).

### 4. `hospitals_custom` (2026-09-19)

> `allowed_members`(회원명부)·`verification_requests`(인증 요청)·`email_verification_codes`(OTP)는 2단계 2-2(2026-09-19)에서 삭제됐다 — 앱은 명부·실명·이메일을 갖지 않는다.

관리자가 가입승인 화면에서 **배포 없이** 등록한 회원기관. 정적 목록 `src/data/hospitals.ts`와 합쳐서 하나의 목록처럼 쓰인다(`src/lib/hospitals.ts`). `sql_query/migrate_add_hospitals_custom.sql`.

| 필드명       | 타입          | 설명                                                                                                                    | 기본값  |
| :----------- | :------------ | :---------------------------------------------------------------------------------------------------------------------- | :------ |
| `id`         | `text` (PK)   | `'c-' + sha256(공백제거·소문자 name)[:10]` — 이름에서 결정적으로 도출, slug 규칙. `profiles.hospital_id`가 이 값을 저장 |         |
| `name`       | `text`        | 기관명(관리자가 요청 기관명을 그대로 또는 고쳐서 등록)                                                                  |         |
| `created_by` | `uuid` (FK)   | 등록한 관리자 (`profiles.id`, ON DELETE SET NULL)                                                                       |         |
| `created_at` | `timestamptz` | 등록 일시                                                                                                               | `now()` |
| `retired`    | `boolean`     | 폐업·통합 시 자동완성에서 제외(행은 유지)                                                                               | `false` |

RLS: SELECT는 전원(`anon` 포함 — 로그인 전 가입 폼 자동완성이 읽음), 쓰기는 서비스 롤(서버 액션 `registerHospitalFromRequest`)만.

### 6. `notifications`

사용자 알림 메시지를 저장합니다.

| 필드명       | 타입        | 설명                           | 기본값              |
| :----------- | :---------- | :----------------------------- | :------------------ |
| `id`         | `uuid` (PK) | 고유 식별자                    | `gen_random_uuid()` |
| `user_id`    | `uuid` (FK) | 수신자 ID (`profiles.id` 참조) |                     |
| `title`      | `text`      | 알림 제목 (짧은 요약)          |                     |
| `message`    | `text`      | 알림 메시지 본문               |                     |
| `link`       | `text`      | 클릭 시 이동할 URL (선택적)    |                     |
| `is_read`    | `boolean`   | 읽음 여부                      | `false`             |
| `created_at` | `timestamp` | 생성 일시                      | `now()`             |

> **Note**: 가입 승인·기관 등록 요청 처리 등 관리자 조치와 시스템 공지가 알림으로 생성되며, 사용자는 알림함에서 읽음 여부를 관리할 수 있습니다. 외부 자원 갱신(아래 `watch_*`)도 `system_notice` 로 소스당 실행당 1건 들어온다.

### 7. `watch_items` · `watch_sources` (2026-09-20, K-3)

외부 게시판(KINS RASIS 규제해석 SOS·이용자지원간행물) 갱신 감시 상태. `/api/cron/watch` 가 하루 1회 목록 API 를 읽어 집합 비교한다. `sql_query/migrate_add_watch_tables.sql`. **본문 미저장·개인정보 0**, 서비스 롤 전용(클라이언트 정책 없음).

`watch_items` — 게시물 1건 = 1행, PK `(source, external_id)`:

| 필드명          | 타입          | 설명                                                      | 기본값  |
| :-------------- | :------------ | :-------------------------------------------------------- | :------ |
| `source`        | `text`        | `kins-sos` \| `kins-pub`                                  |         |
| `external_id`   | `text`        | 소스 고유키(SOS `writNo`, 간행물 `pblcClNo-pblcClSn`)     |         |
| `title`         | `text`        | 제목                                                      |         |
| `category`      | `text`        | 분류 라벨                                                 |         |
| `fingerprint`   | `text`        | sha256(변화 감지 필드) — 목록이 분류순이라 건별 지문 비교 |         |
| `detail`        | `jsonb`       | 안내용 소량 메타(관리번호·게시일)                         |         |
| `first_seen_at` | `timestamptz` | 최초 관측                                                 | `now()` |
| `last_seen_at`  | `timestamptz` | 마지막 관측                                               | `now()` |
| `changed_at`    | `timestamptz` | 지문이 마지막으로 바뀐 시각                               |         |
| `missing_count` | `integer`     | 연속 누락 횟수 — 2회면 삭제 확정                          | `0`     |
| `removed_at`    | `timestamptz` | 삭제 확정 시각(행은 남김 — 재등장 시 신규 알림)           |         |

`watch_sources` — 소스별 실행 상태, PK `source`: `last_run_at`, `last_ok_at`, `last_count`(급감 판정 기준), `consecutive_failures`(3회부터 관리자 텔레그램), `last_error`, `baseline_at`(최초 저장만 한 실행).

### 8. `push_subscriptions`

웹 푸시 알림 구독 정보를 저장합니다.

| 필드명       | 타입          | 설명                                    | 기본값              |
| :----------- | :------------ | :-------------------------------------- | :------------------ |
| `id`         | `uuid` (PK)   | 고유 식별자                             | `gen_random_uuid()` |
| `user_id`    | `uuid` (FK)   | 사용자 ID (`profiles.id` 참조, CASCADE) |                     |
| `endpoint`   | `text` (UQ)   | 브라우저 푸시 서비스 URL (기기별 고유)  |                     |
| `p256dh`     | `text`        | 공개키 (암호화용)                       |                     |
| `auth`       | `text`        | 인증 시크릿                             |                     |
| `user_agent` | `text`        | 구독한 기기 UA (디버깅용, 선택적)       |                     |
| `created_at` | `timestamptz` | 생성 일시                               | `now()`             |
| `updated_at` | `timestamptz` | 갱신 일시 (트리거 자동 갱신)            | `now()`             |

> **Note**: 같은 `endpoint`(기기)로 중복 구독 시 `upsert`로 처리합니다. 사용자 탈퇴 시 `CASCADE`로 자동 삭제됩니다.

### 10. `glossary_terms`

법령용어사전의 용어 데이터를 저장합니다.

| 필드명       | 타입          | 설명                                 | 기본값              |
| :----------- | :------------ | :----------------------------------- | :------------------ |
| `id`         | `uuid` (PK)   | 고유 식별자                          | `gen_random_uuid()` |
| `term`       | `text`        | 용어명                               |                     |
| `definition` | `text`        | 용어 정의                            |                     |
| `category`   | `text`        | 분류 (인물/자격, 장소/시설, 측정 등) |                     |
| `sort_order` | `integer`     | 표시 순서                            | `0`                 |
| `created_at` | `timestamptz` | 생성 일시                            | `now()`             |
| `updated_at` | `timestamptz` | 수정 일시                            | `now()`             |

> **Note**: 누구나 조회 가능하며, 관리자만 추가/수정/삭제할 수 있습니다 (RLS 정책).

## RPC 함수 (Stored Procedures)

### `delete_own_account()`

사용자가 스스로 계정을 삭제할 수 있는 함수입니다.

- **권한**: `SECURITY DEFINER` (인증된 사용자가 자신의 계정만 삭제 가능)
- **동작**: `auth.users` 테이블에서 현재 로그인한 사용자(`auth.uid()`)의 레코드를 삭제
- **연쇄 효과**:
    - `profiles` 테이블: `ON DELETE CASCADE`로 인해 함께 삭제됨
    - `findings` 테이블: `ON DELETE SET NULL`로 인해 작성자 정보만 NULL로 변경되고 데이터는 보존됨
    - `archives` 테이블: `ON DELETE SET NULL`로 인해 작성자 정보만 NULL로 변경되고 데이터는 보존됨

## SQL 스크립트 관리

`sql_query/` 폴더에는 두 개의 스크립트가 있습니다:

| 파일                         | 용도                                                                                           | 실행 시점                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| `rebuild_all_tables.sql`     | 완전한 단일 설치 스크립트 (신규 설치 + 마이그레이션, 데이터 보존, 멱등성 보장, 반복 실행 가능) | 신규 환경 구축, 스키마 업데이트 |
| `diagnose_archives_fkey.sql` | archives 외래키 진단 및 강제 재생성 (트러블슈팅용)                                             | 외래키 오류 발생 시             |

**Version 3.2 (2026-02-21)**:

- RLS 무한 재귀 문제 완전 해결 (SECURITY DEFINER 함수 사용)
- archives 외래키 제약조건을 별도 블록으로 분리하여 안정성 향상
- 이제 신규 Supabase 환경에서 `rebuild_all_tables.sql` 하나만 실행하면 모든 필수 테이블이 생성됩니다.

- **신규 환경 세팅**: SQL Editor에서 `rebuild_all_tables.sql` 실행 → 모든 테이블 + RLS 정책 + 인덱스 자동 생성
- **기존 환경 업데이트**: 동일 스크립트 재실행 (기존 데이터 자동 보존, 누락된 컬럼만 추가)
- **전체 초기화**: Supabase Dashboard에서 테이블 수동 삭제 후 재실행

### 생성되는 테이블 목록

섹션 0에서 핵심 테이블을 생성합니다:

1. `profiles` - 사용자 프로필 (auth.users와 1:1 관계)
2. `findings` - 지적 및 권고 사례
3. `notifications` - 사용자 알림
4. `glossary_terms` - 법령용어사전 (섹션 10)
5. `feedback` - 사용자 의견/문의 (섹션 10)
6. `push_subscriptions` - 웹 푸시 알림 구독 (섹션 11)
7. `archives` - 자료실 게시물 (**섹션 12**, profiles 외래키 포함)
8. `hospitals_custom` - 관리자 등록 회원기관 (`migrate_add_hospitals_custom.sql`, 통합 스크립트 밖)
9. 스토리지 버킷 `resources-pending`(비공개, 2-1, 섹션 15) — 검토 대기 파일

> 2-2(2026-09-19): `allowed_members`·`verification_requests`·`email_verification_codes`와 profiles 개인정보 컬럼은 통합 스크립트에서도 제거됨. 기존 환경은 `migrate_drop_legacy_profile_columns.sql`로 정리.

### 스크립트 구성 (섹션별)

| 섹션   | 내용                                                                                      |
| ------ | ----------------------------------------------------------------------------------------- |
| **0**  | **핵심 테이블 전체 생성 (profiles, findings, notifications)**                             |
| 3      | 인증 상태 마이그레이션 (admin → verified) — `verification_status` 잔재, 2-1에서 제거 예정 |
| 8      | `notifications` 컬럼 추가                                                                 |
| 9      | `notifications` 인덱스/코멘트                                                             |
| 10     | `glossary_terms` 테이블 + `feedback` 테이블 + Storage 버킷                                |
| 11     | `push_subscriptions` 테이블 (웹 푸시)                                                     |
| **12** | **`archives` 테이블 전체 생성 + RLS 정책 + 인덱스 + RPC 함수**                            |
| 13     | 테스트 계정 초기 profiles 설정                                                            |

### 주요 기술적 개선 사항

#### RLS 무한 재귀 방지 (업계 표준 방식)

**문제**: RLS 정책 내에서 동일 테이블(`profiles`)을 조회하면 무한 재귀 발생

```sql
-- ❌ 무한 재귀 발생
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
```

**해결**: SECURITY DEFINER 함수를 사용하여 RLS 우회

```sql
-- ✅ 안전한 방식
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(is_admin, false)
        FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() OR public.is_current_user_admin() = true
);
```

이 패턴은 `profiles`, `findings`, `notifications`, `glossary_terms`, `feedback`, `archives` 등 모든 관리자 권한 RLS 정책에 적용되었습니다.

#### archives 외래키 안정성 보강

**문제**: 긴 SQL 스크립트 실행 시 일부 블록이 누락되어 외래키가 생성되지 않음

**해결**: CREATE TABLE에서 외래키 인라인 정의 제거, 별도 DO 블록으로 명시적 생성

```sql
-- ✅ 안전한 방식
CREATE TABLE IF NOT EXISTS public.archives (
    ...
    user_id UUID,  -- 외래키는 별도로 추가
    ...
);

-- 외래키 제약조건 명시적 추가 (테이블 생성 후 별도 실행)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'archives' AND constraint_name = 'archives_user_id_fkey'
    ) THEN
        ALTER TABLE public.archives
        ADD CONSTRAINT archives_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

        RAISE NOTICE '✅ [archives] Foreign key constraint created';
    END IF;
END $$;
```

## SQL 조회 쿼리 참고

Supabase SQL Editor에서 아래 쿼리를 사용하여 직접 스키마를 조회할 수 있습니다:

```sql
-- public 스키마의 모든 테이블 목록 조회
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- 특정 테이블(예: profiles)의 컬럼 정보 조회
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 외래키 제약조건 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```
