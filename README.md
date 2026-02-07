# RadSafety Web

## 🚀 전체 초기화 및 재구축 가이드 (Full Reset & Rebuild)

이 문서는 데이터베이스를 완전히 초기화(Drop All Tables)하고, 처음부터 다시 테이블을 생성하여 시스템을 깨끗하게 재구축하는 절차를 설명합니다.

---

### 1단계: 🧹 데이터 완전 삭제 (Clean Slate)

가장 먼저 기존 데이터와 테이블을 모두 날려버립니다.

1. **회원(Auth) 삭제**:
   - **Supabase 대시보드** 접속 -> **Authentication** 메뉴 -> **Users** 탭 이동.
   - 현재 등록된 모든 회원을 체크하고 **[Delete]** 버튼을 눌러 삭제합니다.
   - (주의: `profiles` 테이블과 연결된 Foreign Key 제약 조건 때문에, 이 작업을 먼저 하거나 테이블 삭제 후 다시 해야 할 수 있습니다. 가장 확실한 방법은 "테이블 삭제 -> 유저 삭제" 순서입니다.)

2. **DB 테이블 삭제**:
   - Supabase **SQL Editor**에서 `sql_query/reset_public_schema.sql` 파일을 열고 실행합니다.
   - `public` 스키마의 모든 주요 테이블(`profiles`, `allowed_members`, `findings` 등)이 삭제됩니다.

---

### 2단계: 🏗️ 테이블 재생성 (Rebuild Schema)

이제 깨끗해진 DB에 필요한 테이블을 순서대로 생성합니다.

1. **프로필 테이블 (`profiles`)**:
   - `sql_query/create_profiles.sql` 실행.
   - (회원 가입 시 자동 생성 트리거 포함)

2. **허용 명단 테이블 (`allowed_members`)**:
   - `sql_query/create_allowed_members.sql` 실행.
   - (관리자용 엑셀 업로드 명단)

3. **기타 테이블 (순차 실행)**:
   - `sql_query/create_findings.sql` (지적/권고 사항)
   - `sql_query/create_archives.sql` (자료실)
   - `sql_query/create_verification_requests.sql` (인증 요청)
   - `sql_query/create_notifications.sql` (알림 - **선택사항**)

---

### 3단계: 👤 관리자 및 데이터 등록 (Bootstrap)

1. **최초 관리자 가입**:
   - 웹사이트(`localhost:4321`)에서 **카카오 로그인**으로 가입합니다.
   - 아직은 일반 회원입니다.

2. **관리자 승격**:
   - SQL Editor에서 다음 쿼리 실행:
     ```sql
     UPDATE public.profiles
     SET role = 'admin'  -- (기존 user_tier 아님! role 사용)
     WHERE email = '본인_이메일';
     ```
   - 웹사이트에서 재로그인.

3. **회원 명단 등록**:
   - 관리자 페이지(`admin/members`)에서 엑셀 파일 업로드.

이제 시스템이 완전히 초기화되고 재구축되었습니다! 🎉

---

## 📚 참고 문서

- [데이터베이스 스키마 설명서](./documents/database_schema.md)

