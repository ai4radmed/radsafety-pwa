# 명세: sql_query/migrate_finalize_username.sql

## 역할 요약

Stage 1-C(이메일 OTP 로그인 제거, `documents/privacy_redesign_plan.md` 1단계 "빼기")의 DB 마감 단계. `migrate_add_username.sql`이 nullable로 열어둔 `profiles.username`을 `NOT NULL`로 조이기 전에, 끝내 아이디를 정하지 않은 미전환 계정을 잠금 처리한다.

## Props

없음. Supabase SQL Editor에서 **Dr. Ben이 수동 실행**한다(이 저장소의 CI/CD는 `sql_query/migrate_*.sql`을 자동 실행하지 않음, 기존 `migrate_add_username.sql`·`migrate_add_member_status_hospital.sql`과 동일 관례).

## 사이드 이펙트

- `username IS NULL`인 `profiles` 행에 플레이스홀더 아이디(`u_<id 앞 8자>`) 부여.
- 같은 행의 `auth.users.email`을 `u_<id 앞 8자>@radsafety.invalid`로 교체(이미 `.invalid`면 건드리지 않음).
- `public.profiles.username`에 `NOT NULL` 제약 추가.

## 핵심 규칙

1. **실행 전 DB 백업 1회 필수** — 개인정보 포함, 보관 기간·파기일 명시. `privacy_redesign_plan.md` 1단계가 명시한 "C가 유일한 비가역 지점"이 이 마이그레이션이다.
2. **플레이스홀더를 받는 계정은 의도적으로 로그인 불가 상태가 된다** — OTP로만 로그인했고 비밀번호를 설정한 적이 없어, username/password 경로로도 로그인할 수 없다. 재가입 시 새 `auth.users.id`가 생기므로 옛 글(`findings` 등)은 `user_id`가 끊긴 채 남는다(`ON DELETE SET NULL`과 같은 결과) — 의도된 동작, 코드 변경 불필요.
3. **실행 순서 의존** — 앱 코드가 이메일 OTP UI(`EmailOtpForm.astro`, `/auth/confirm`)를 이미 제거·배포한 뒤에 실행해야 한다. 순서가 뒤바뀌면 OTP로 로그인 중이던 사용자가 이 마이그레이션 시점에 갑자기 잠길 수 있다.
4. **멱등** — 두 UPDATE 모두 조건절에 이미 처리된 행을 제외하는 WHERE가 있어 재실행 안전. `ALTER COLUMN ... SET NOT NULL`도 PostgreSQL에서 이미 NOT NULL인 컬럼에 재실행 시 오류 없이 통과.
5. 트랜잭션(`BEGIN/COMMIT`)으로 묶는다 — 1·2번이 성공해야 3번(NOT NULL)이 실패 없이 통과한다.

## 실행 가이드

1. Supabase Dashboard에서 DB 백업 확인/생성.
2. `sql_query/migrate_finalize_username.sql` 전체를 SQL Editor에서 실행.
3. 확인(선택):

```sql
select count(*) from public.profiles where username is null; -- 0이어야 함

select column_name, is_nullable
from information_schema.columns
where table_name = 'profiles' and column_name = 'username'; -- is_nullable = 'NO'
```

## 성공 기준

- `profiles.username`에 `NULL`인 행이 0건.
- `information_schema.columns`에서 `username.is_nullable = 'NO'`.
- 기존에 이미 아이디를 정한 계정은 값이 바뀌지 않음(플레이스홀더 UPDATE는 `WHERE username IS NULL`로 한정).
