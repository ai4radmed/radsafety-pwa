# 명세: sql_query/migrate_add_publish_gate.sql

## 역할 요약

2단계 2-1 업로드 권한(`documents/privacy_redesign_plan.md` §2-1). "누가 올릴 수 있는가"를 신원(`verification_status`)이 아닌 실적(`can_publish`)으로 바꾼다. 2026-09-19 실행.

## Props

없음. Dr. Ben이 Supabase SQL Editor에서 수동 실행. 코드 배포 전·후 어느 쪽이든 안전하지만 권장 순서는 **이 파일 → 코드 배포(PR) → `migrate_drop_verification_status.sql`**.

## 사이드 이펙트

- `profiles.can_publish boolean not null default false`, `profiles.reject_count integer not null default 0` 추가. 백필: 관리자 또는 `verification_status in (list, temp_verified, verified)` → `can_publish=true`.
- `archives.status`·`findings.status`(`pending`/`published`/`rejected`, 기본 `pending`), `archives.file_bucket`(`resources`/`resources-pending`, 기본 `resources`) 추가. 기존 행(생성 1분 이상 지난 것)은 `published`로 백필. 인덱스 `idx_*_status`.
- 트리거 함수 `enforce_submission_status()`(SECURITY DEFINER) + `archives_enforce_status`·`findings_enforce_status`(BEFORE INSERT OR UPDATE).
- RLS 교체 — archives: `Anyone can view archives`·`Verified users can create archives` 삭제 → `Published archives are visible to members`(SELECT: published 또는 본인 또는 관리자)·`Active members can submit archives`(INSERT: 본인 행이고 관리자 또는 `status='active' and reject_count<3`). findings: `Anyone can view findings` 삭제 → 같은 SELECT/INSERT + `Authors can update/delete own findings`(기존엔 관리자 ALL 뿐이라 일반 회원 등록 정책이 없었음). update/delete 기존 archives 정책 유지.
- 비공개 버킷 `resources-pending` + storage.objects 정책: 본인 폴더(`<uid>/…`) INSERT, 본인·관리자 SELECT/DELETE.

## 핵심 규칙

1. **status는 DB가 정한다** — 클라이언트가 보낸 값은 트리거가 덮어쓴다: INSERT 시 `is_admin or can_publish`면 `published`, 아니면 `pending`. 일반 사용자의 UPDATE는 status를 OLD로 되돌린다(관리자만 변경). `auth.uid()`가 NULL(서비스 롤 = 서버 액션 `reviewSubmission`)이면 손대지 않는다.
2. **pending은 작성자와 관리자만 본다**(RLS). 파일도 마찬가지 — 비공개 버킷이라 URL을 알아도 못 받는다(계획서 "미공개는 파일도 미공개").
3. **제출 자격 = 정상 회원(`status='active'`) + 반려 3회 미만**. 관리자는 항상.
4. 승인 시 파일 이동(pending→public)·`can_publish=true`·알림은 서버 액션 몫(`.spec/src/actions/index.md` 규칙 17). 이 파일은 스키마·정책만.
5. 멱등 — `IF NOT EXISTS`, `DROP POLICY IF EXISTS` 후 재생성, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`.

## 실행 가이드

SQL Editor에서 전체 실행 → 확인:

```sql
select policyname, cmd from pg_policies where tablename in ('archives','findings') order by tablename, policyname;
select count(*) filter (where can_publish) as publishers, count(*) as total from public.profiles;
select id, public from storage.buckets where id = 'resources-pending';
```

## 성공 기준

- 정책 목록에 위 이름들이 있고 옛 `Verified users can create archives`가 없음.
- `can_publish` 백필 수 = 옛 인증 회원 + 관리자 수. 기존 자료·사례는 전부 `published`.
- 첫 제출자가 자료를 올리면 `pending`으로 들어가고 다른 회원에게는 안 보임.
