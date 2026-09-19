# 명세: sql_query/migrate_drop_legacy_profile_columns.sql

## 역할 요약

2단계 2-2(`documents/privacy_redesign_plan.md`) — 회원 인증(명부 대조) 체계 폐지와 `profiles` 개인정보 컬럼 삭제. 앱이 실명·이메일·명부를 갖지 않는다는 2026-09-10 KSNM 방안위 교육팀 합의를 DB 스키마에서 실현하는 **비가역** 단계.

## Props

없음. Dr. Ben이 Supabase SQL Editor에서 수동 실행(전체 백업 `pg_dump -F c` 선행 — 2026-09-19 `radsafety_20260919_pre-2-2.dump`).

## 사이드 이펙트

- 테이블 삭제: `allowed_members`, `verification_requests`, `email_verification_codes`(각 CASCADE — 정책·인덱스 함께).
- `profiles` 컬럼 14개 삭제: `login_email`·`nickname`·`society_email`·`real_name`·`affiliation`·`department`·`verification_date`·`verification_method`·`email_verified`·`classification`·`license_type`·`is_safety_manager`·`safety_manager_start_year`·`safety_manager_end_year`.
- 데이터 소실: 알파테스터의 실명·학회 이메일·소속 자유입력값 등(의도된 개인정보 최소화, Dr. Ben 승인 2026-09-19). 백업 덤프에만 남는다.

## 핵심 규칙

1. **`verification_status`는 남긴다** — 자료실·지적사례 업로드 게이트(`resources.astro`·`findings-recommendations.astro`의 `canUpload` + `archives` INSERT RLS)가 참조. 2-1(`can_publish`)에서 게이트를 교체한 뒤 삭제.
2. **컬럼 DROP에 CASCADE를 쓰지 않는다** — 의존 정책·뷰·함수가 있으면 실패하게 두고, 에러의 객체명을 보고 개별 판단한다(중요 RLS를 모르고 지우는 사고 방지). 테이블 DROP은 CASCADE(테이블 자체를 없애는 것이 목적).
3. **실행 순서**: 코드(PR) 배포 → 실행. 새 코드는 삭제 컬럼을 참조하지 않고, 옛 코드도 `select('*')`라 읽기는 안 깨지므로 어느 순서든 치명적이지 않지만, 옛 코드의 쓰기(자가 치유의 `login_email: null` 등)는 컬럼이 없으면 실패한다.
4. `rebuild_all_tables.sql`(통합 스키마)도 같은 커밋에서 동기 — 신규 설치 시 이 컬럼·테이블이 처음부터 없어야 한다.
5. 멱등 — `IF EXISTS`.

## 실행 가이드

```sql
-- 사전 점검(선택): 삭제 컬럼에 의존하는 정책이 있는지
select policyname, tablename, qual, with_check from pg_policies
where schemaname = 'public' and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'society_email|real_name|login_email|classification';
```

SQL Editor에서 파일 전체 실행 → "Success" → 확인 쿼리(파일 하단)로 컬럼 목록 점검.

## 성공 기준

- `profiles` 컬럼 = `id, created_at, is_admin, verification_status, society, username, status, hospital_id, provider, hospital_request`(순서 무관).
- 세 테이블이 `information_schema.tables`에 없음.
- 마이페이지·가입·가입승인·회원 목록·알림 발송이 정상 동작.
