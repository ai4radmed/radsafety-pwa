# SQL Query Scripts

이 디렉토리는 Supabase 데이터베이스 스키마 관리를 위한 SQL 스크립트를 포함합니다.

## 📋 주요 파일

### 🔄 `rebuild_all_tables.sql` (메인)
**용도**: 안전한 스키마 마이그레이션 (데이터 보존)

- ✅ 기존 데이터를 **보존**하면서 스키마 변경 적용
- ✅ 중복 실행 가능 (`IF NOT EXISTS` 체크)
- ✅ 프로덕션 환경에 안전하게 적용 가능

**실행 방법**:
```sql
-- Supabase Dashboard → SQL Editor
-- rebuild_all_tables.sql 내용 복사 후 실행
```

**최신 변경사항 (v2.0)**:
- 이메일 검증 시스템 추가
- `email_verification_codes` 테이블 생성
- `profiles` 테이블에 `email_verified`, `verification_method` 컬럼 추가

---

### 📦 백업 파일

#### `rebuild_all_tables.sql.backup`
**원본 전체 재구축 스크립트**

- ⚠️ 모든 테이블을 DROP 후 재생성
- ⚠️ **모든 데이터 손실** (명부, 지적권고사례 등)
- 🔴 프로덕션 환경에서 사용 금지
- ✅ 개발 환경 초기화 용도로만 사용

**언제 사용하나요?**
- 로컬 개발 환경을 완전히 초기화할 때
- 테스트 데이터를 모두 삭제하고 새로 시작할 때

#### `add_email_verification.sql.backup`
**이메일 검증 기능만 추가하는 스크립트**

- 현재는 `rebuild_all_tables.sql`에 통합됨
- 참고용으로만 보관

---

### 🛠️ 유틸리티 스크립트

#### `check_profile_access.sql`
프로필 테이블 접근 권한 확인

#### `fix_rls.sql`
Row Level Security (RLS) 정책 수정

---

## 📖 사용 가이드

### 신규 환경 설정
```bash
1. Supabase 프로젝트 생성
2. SQL Editor에서 rebuild_all_tables.sql 실행
3. 완료!
```

### 기존 환경 업데이트
```bash
1. SQL Editor에서 rebuild_all_tables.sql 실행
2. 기존 데이터는 자동 보존됨
3. 새 기능(이메일 검증) 추가됨
```

### 개발 환경 초기화 (데이터 삭제)
```bash
⚠️ 주의: 모든 데이터가 삭제됩니다!

1. SQL Editor에서 rebuild_all_tables.sql.backup 실행
2. 모든 테이블이 재생성됨
3. 테스트 데이터 추가 필요
```

---

## 🔒 안전 수칙

1. **프로덕션 환경**: `rebuild_all_tables.sql`만 사용
2. **백업 필수**: 중요한 변경 전 Supabase 백업 수행
3. **테스트 먼저**: 로컬/개발 환경에서 먼저 테스트
4. **버전 관리**: 스키마 변경 시 git commit

---

## 📝 변경 이력

### v2.0 (2026-02-14)
- 이메일 검증 시스템 추가
- 안전한 마이그레이션 스크립트로 전환
- 기존 데이터 보존 로직 추가

### v1.0 (2026-02-13)
- 초기 스키마 설계
- profiles, findings, archives, verification_requests 테이블

---

## 💡 참고 문서

- [데이터베이스 스키마 문서](../documents/database_schema.md)
- [인수인계 가이드](../documents/handover_guide.md)
