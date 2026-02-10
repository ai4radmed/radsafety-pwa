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

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | `auth.users.id` 참조 (외래키) |
| `nickname` | `text` | 카카오 닉네임 (표시용) |
| `login_email` | `text` | 로그인 이메일 (auth.users.email 복사본) |
| `created_at` | `timestamp` | 프로필 생성 일시 (앱 가입일) |
| `is_admin` | `boolean` | 관리자 여부 |
| `verification_request_date` | `timestamp` | 인증 요청 일시 |
| `verification_type` | `text` | 인증 유형 (`none`:미인증, `society_list`:명부인증, `admin`:앱관리자승인) |
| `member_type` | `text` | 회원 구분 (`general`, `society`, `special`) |
| `society` | `text` | 소속 학회 코드 (`nuclear_medicine`, `technology` 등) |
| `affiliation` | `text` | 소속 기관 |
| `department` | `text` | 소속 부서 |
| `society_name` | `text` | 실명 (학회 인증 정보) |
| `society_email` | `text` | 학회/특별사용자 인증용 이메일 |
| `society_role` | `text` | 학회 직책/구분 |
| `classification` | `text` | 직종 구분 (의사, 방사선사 등) |
| `license_type` | `text` | 보유 면허 종류 |
| `is_safety_manager` | `boolean` | 방사선안전관리자 여부 |
| `safety_manager_start_year` | `text` | 업무 시작년도 |
| `safety_manager_end_year` | `text` | 업무 종료년도 |
| `safety_manager_start_unknown` | `boolean` | 시작년도 기억 안 남 여부 |
| `is_safety_manager_deputy` | `boolean` | 대리자 여부 |
| `is_safety_manager_practical` | `boolean` | 실무 담당자 여부 |
| `is_approved` | `boolean` | 일반 접근 승인 여부 |
| `updated_at` | `timestamp` | 수정 일시 |

### 2. `findings`
지적 및 권고 사례 데이터를 저장합니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | 고유 식별자 |
| `title` | `text` | 사례 제목 |
| `finding_type` | `text` | 구분 (`지적`, `권고`) |
| `tags` | `text[]` | 태그/카테고리 배열 |
| `year` | `text` | 수검 년도 |
| `description` | `text` | 상세 내용 |
| `violation_clause` | `text` | 관련 법령 조항 |
| `solution` | `text` | 조치 방안 |
| `created_at` | `timestamp` | 생성 일시 |
| `user_id` | `uuid` | 작성자 ID (`auth.users.id` 참조, `ON DELETE SET NULL`로 탈퇴 시에도 데이터 보존) |

### 3. `archives`
자료실(Resources)의 게시물 및 파일 정보를 저장합니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | 고유 식별자 |
| `title` | `text` | 자료 제목 |
| `category` | `text` | 분류 (예: 작성지침, 가이드북) |
| `file_url` | `text` | Supabase Storage 파일 경로 |
| `file_name` | `text` | 원본 파일명 |
| `author` | `text` | 표시용 작성자명 |
| `registrant_email` | `text` | 등록자 이메일 |
| `view_count` | `integer` | 조회수 |
| `content_html` | `text` | HTML/Markdown 미리보기 내용 |
| `created_at` | `timestamp` | 생성 일시 |
| `updated_at` | `timestamp` | 최종 수정 일시 |

### 4. `allowed_members`
회원 가입 승인을 위한 허용 목록(Whitelist)입니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `email` | `text` (PK) | 허용된 이메일 |
| `department` | `text` | 기본 배정 부서 |
| `classification` | `text` | 구분 (기존 'role'에서 변경됨) |
| `society` | `text` | 소속 학회 코드 |

### 5. `verification_requests`
등급 상향 또는 정회원 인증 요청 내역입니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | 고유 식별자 |
| `user_id` | `uuid` | 신청자 ID |
| `status` | `text` | 상태 (`pending`, `approved`, `rejected`) |
| `type` | `text` | 요청 유형 (`society`, `special`) |
| `full_name` | `text` | 신청자 실명 |
| `society` | `text` | 학회 코드 (`nuclear_medicine`, `technology`) |
| `society_name` | `text` | 학회/실명 (인증 후 저장용) |
| `role` | `text` | 구분 (전공의, 방사선사 등) |
| `affiliation` | `text` | 근무 기관 |
| `department` | `text` | 소속 부서 |
| `email` | `text` | 연락처 이메일 |
| `reason` | `text` | 신청 사유 |
| `created_at` | `timestamp` | 신청 일시 |

## RPC 함수 (Stored Procedures)

### `delete_own_account()`
사용자가 스스로 계정을 삭제할 수 있는 함수입니다.

- **권한**: `SECURITY DEFINER` (인증된 사용자가 자신의 계정만 삭제 가능)
- **동작**: `auth.users` 테이블에서 현재 로그인한 사용자(`auth.uid()`)의 레코드를 삭제
- **연쇄 효과**: 
  - `profiles` 테이블: `ON DELETE CASCADE`로 인해 함께 삭제됨
  - `findings` 테이블: `ON DELETE SET NULL`로 인해 작성자 정보만 NULL로 변경되고 데이터는 보존됨
  - `archives` 테이블: `ON DELETE SET NULL`로 인해 작성자 정보만 NULL로 변경되고 데이터는 보존됨

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
