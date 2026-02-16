# RadSafety 데이터베이스 스키마

이 문서는 RadSafety 프로젝트의 Supabase PostgreSQL 데이터베이스 구조를 설명합니다.

이 문서는 RadSafety 프로젝트의 Supabase PostgreSQL 데이터베이스 구조를 설명합니다.

> **Note:** 모든 테이블 스키마 정의와 마이그레이션은 `sql_query/rebuild_all_tables.sql` 파일 하나로 통합 관리됩니다.

## 스키마 개요

PostgreSQL에서 **스키마(Schema)**는 테이블, 함수 등의 객체를 포함하는 논리적 네임스페이스입니다. Supabase의 기본 서비스 스키마는 `public`입니다.

- **데이터베이스 엔진**: PostgreSQL
- **기본 스키마**: `public`

## 주요 테이블

### 1. `profiles`

사용자 프로필 정보를 저장하며, `auth.users` 테이블과 1:1로 연결됩니다.

| 필드명                      | 타입        | 설명                                                                                            | 기본값   |
| :-------------------------- | :---------- | :---------------------------------------------------------------------------------------------- | :------- |
| `id`                        | `uuid` (PK) | `auth.users.id` 참조 (외래키)                                                                   |          |
| `nickname`                  | `text`      | 카카오 닉네임 (표시용)                                                                          |          |
| `login_email`               | `text`      | 로그인 이메일 (auth.users.email 복사본)                                                         |          |
| `provider`                  | `text`      | 로그인 제공자 (`kakao`, `email` 등)                                                             |          |
| `created_at`                | `timestamp` | 프로필 생성 일시 (앱 가입일)                                                                    | `now()`  |
| `is_admin`                  | `boolean`   | 관리자 여부                                                                                     | `false`  |
| `verification_status`       | `text`      | 인증 상태 (`none`:미인증, `list`:명부인증, `temp_verified`:임시인증, `verified`:관리자승인완료) | `'none'` |
| `verification_date`         | `timestamp` | 인증 (요청/완료) 일시                                                                           |          |
| `society`                   | `text`      | 소속 학회 코드 (`nuclear_medicine`, `technology` 등)                                            |          |
| `classification`            | `text`      | 직종 구분 (의사, 방사선사 등)                                                                   |          |
| `society_email`             | `text`      | 학회/특별사용자 인증용 이메일                                                                   |          |
| `real_name`                 | `text`      | 실명 (학회 인증 정보)                                                                           |          |
| `affiliation`               | `text`      | 소속 기관                                                                                       |          |
| `department`                | `text`      | 소속 부서                                                                                       |          |
| `license_type`              | `text`      | 보유 면허 종류 (`none`, `supervisor`, `special`, `general`, `engineer`)                         |          |
| `is_safety_manager`         | `boolean`   | 방사선안전관리자 여부                                                                           | `false`  |
| `safety_manager_start_year` | `text`      | 안전관리자 업무 시작년도                                                                        |          |
| `safety_manager_end_year`   | `text`      | 안전관리자 업무 종료년도                                                                        |          |
| `email_verified`            | `boolean`   | society_email 검증 완료 여부                                                                    | `false`  |
| `verification_method`       | `text`      | 이메일 검증 방법 (`login_email`, `otp`, `list`)                                                 |          |

> **Note**: `verification_status`는 4단계로 구분됩니다:
>
> - `none`: 미인증 (기본값, 권한 없음)
> - `list`: 회원명부 인증 (즉시 인증, 모든 권한)
> - `temp_verified`: 임시 인증 (이메일 검증 완료, 관리자 승인 대기, 권한 부여)
> - `verified`: 관리자 승인 완료 (최종 인증, 모든 권한)

### 2. `findings`

지적 및 권고 사례 데이터를 저장합니다.

| 필드명             | 타입        | 설명                                                                             |
| :----------------- | :---------- | :------------------------------------------------------------------------------- |
| `id`               | `uuid` (PK) | 고유 식별자                                                                      |
| `title`            | `text`      | 사례 제목                                                                        |
| `finding_type`     | `text`      | 구분 (`지적`, `권고`)                                                            |
| `tags`             | `text[]`    | 태그/카테고리 배열                                                               |
| `year`             | `text`      | 수검 년도                                                                        |
| `description`      | `text`      | 상세 내용                                                                        |
| `violation_clause` | `text`      | 관련 법령 조항                                                                   |
| `solution`         | `text`      | 조치 방안                                                                        |
| `created_at`       | `timestamp` | 생성 일시                                                                        |
| `user_id`          | `uuid`      | 작성자 ID (`auth.users.id` 참조, `ON DELETE SET NULL`로 탈퇴 시에도 데이터 보존) |

### 3. `archives`

자료실(Resources)의 게시물 및 파일 정보를 저장합니다.

| 필드명         | 타입        | 설명                           | 기본값              |
| :------------- | :---------- | :----------------------------- | :------------------ |
| `id`           | `uuid` (PK) | 고유 식별자                    | `gen_random_uuid()` |
| `title`        | `text`      | 자료 제목                      |                     |
| `category`     | `text`      | 분류 (작성지침, 가이드북 등)   |                     |
| `file_url`     | `text`      | Supabase Storage 파일 경로     |                     |
| `file_name`    | `text`      | 원본 파일명                    |                     |
| `author`       | `text`      | 표시용 작성자명 (보조/레거시)  |                     |
| `user_id`      | `uuid` (FK) | 등록자 ID (`profiles.id` 참조) | `auth.uid()`        |
| `view_count`   | `integer`   | 조회수                         | 0                   |
| `content_html` | `text`      | HTML/Markdown 내용             |                     |
| `created_at`   | `timestamp` | 생성 일시                      | `now()`             |

> **Note**: `registrant_email` 필드는 제거되었으며, `user_id`를 통해 `profiles` 테이블의 정보(`real_name`, `login_email`)를 참조합니다.

### 4. `allowed_members`

회원 가입 승인을 위한 허용 목록(Whitelist)입니다.

| 필드명           | 타입        | 설명                                                 |
| :--------------- | :---------- | :--------------------------------------------------- |
| `society_email`  | `text` (PK) | 허용된 학회 이메일                                   |
| `society`        | `text`      | 소속 학회 코드 (`nuclear_medicine`, `technology` 등) |
| `classification` | `text`      | 구분 (전공의, 방사선사 등)                           |
| `real_name`      | `text`      | 실명                                                 |
| `affiliation`    | `text`      | 소속 기관                                            |
| `department`     | `text`      | 부서                                                 |
| `created_at`     | `timestamp` | 등록 일시                                            |

### 5. `verification_requests`

등급 상향 또는 정회원 인증 요청 내역입니다.

| 필드명                | 타입        | 설명                                         |
| :-------------------- | :---------- | :------------------------------------------- |
| `id`                  | `uuid` (PK) | 고유 식별자                                  |
| `user_id`             | `uuid`      | 신청자 ID                                    |
| `verification_status` | `text`      | 상태 (`pending`, `approved`, `rejected`)     |
| `verification_date`   | `timestamp` | 신청/인증 일시                               |
| `society`             | `text`      | 학회 코드 (`nuclear_medicine`, `technology`) |
| `classification`      | `text`      | 구분 (전공의, 방사선사 등)                   |
| `society_email`       | `text`      | 연락처 이메일                                |
| `real_name`           | `text`      | 신청자 실명                                  |
| `affiliation`         | `text`      | 근무 기관                                    |
| `department`          | `text`      | 소속 부서                                    |
| `reason`              | `text`      | 신청 사유                                    |
| `reject_reason`       | `text`      | 인증 취소 사유 (관리자가 입력)               |
| `approved_at`         | `timestamp` | 인증 승인 일시                               |
| `rejected_at`         | `timestamp` | 인증 취소 일시                               |

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

> **Note**: 관리자가 인증 승인/취소 시 자동으로 알림이 생성되며, 사용자는 알림함에서 읽음 여부를 관리할 수 있습니다.

### 7. `email_verification_codes`

이메일 소유권 확인을 위한 OTP 코드를 저장합니다.

| 필드명        | 타입        | 설명                             | 기본값              |
| :------------ | :---------- | :------------------------------- | :------------------ |
| `id`          | `uuid` (PK) | 고유 식별자                      | `gen_random_uuid()` |
| `user_id`     | `uuid` (FK) | 사용자 ID (`auth.users.id` 참조) |                     |
| `email`       | `text`      | 인증할 이메일 주소               |                     |
| `code`        | `text`      | 6자리 인증 코드                  |                     |
| `created_at`  | `timestamp` | 생성 일시                        | `now()`             |
| `expires_at`  | `timestamp` | 만료 일시 (생성 후 10분)         | `now() + 10분`      |
| `verified`    | `boolean`   | 인증 완료 여부                   | `false`             |
| `verified_at` | `timestamp` | 인증 완료 일시                   |                     |

> **Note**: 학회 이메일 인증 시 사용되며, 10분 후 자동 만료됩니다.

### 8. `glossary_terms`

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

## SQL 스크립트

`sql_query/` 폴더에는 단 하나의 스크립트만 존재합니다:

| 파일                     | 용도                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `rebuild_all_tables.sql` | 전체 스키마 마이그레이션 (데이터 보존, 멱등성 보장, 반복 실행 가능) |

- 신규 환경 세팅: SQL Editor에서 `rebuild_all_tables.sql` 실행
- 기존 환경 업데이트: 동일 스크립트 재실행 (기존 데이터 자동 보존)
- 전체 초기화: Supabase Dashboard에서 테이블 수동 삭제 후 재실행

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
```
