# 명세: sql_query/migrate_feedback_status_check_preserve_data.sql

## 역할 요약

기존 `public.feedback` 데이터는 보존하면서, `feedback_status_check` 제약조건만 확장하여 앱이 사용하는 신규 상태값(`reviewing`, `on_hold`, `completed`)이 DB에서 허용되도록 수정합니다.

`sql_query/rebuild_all_tables.sql` 실행이 금지된(데이터 보존 최우선) 환경에서 사용합니다.

## Props

없음. Supabase SQL Editor에서 실행합니다.

## 사이드 이펙트

- `public.feedback`의 `feedback_status_check` CHECK 제약조건을 교체(DROP + ADD)합니다.
- 테이블/데이터 자체를 삭제하거나 재생성하지 않습니다.
- `public.feedback.status`의 default를 `reviewing`으로 정렬합니다(기존 데이터에는 영향 없음).

## 핵심 규칙

1. 기존 레거시 상태값(`pending`, `processing`, `resolved`, `reflected`)도 함께 허용해야 합니다.
2. 신규 상태값(`reviewing`, `on_hold`, `completed`)도 함께 허용해야 합니다.
3. 트랜잭션(`BEGIN/COMMIT`)으로 묶어 실패 시 변경이 부분 적용되지 않도록 합니다.

## 실행 가이드

1. Supabase SQL Editor에서 `sql_query/migrate_feedback_status_check_preserve_data.sql` 전체 실행
2. 아래 제약 정의 확인(선택)

```sql
select conname,
       pg_get_constraintdef(oid) as constraint_def
from pg_constraint
where conname = 'feedback_status_check';
```

## 성공 기준

- 앱의 `상태 저장`이 `feedback_status_check` 위반(23514)으로 실패하지 않아야 합니다.
