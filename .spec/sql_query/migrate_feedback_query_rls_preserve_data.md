# 명세: sql_query/migrate_feedback_query_rls_preserve_data.sql

## 역할 요약

`rebuild_all_tables.sql` 실행 없이(데이터 보존), 일반 사용자가 다른 사용자의 `feedback`을 “관리자가 관리자 의견(`admin_note`)을 남긴 경우에만” 조회할 수 있도록 RLS 정책을 추가합니다.

## Props

없음. Supabase SQL Editor에서 실행합니다.

## 사이드 이펙트

- `public.feedback`에 대한 `FOR SELECT` 정책 1개를 추가합니다(이미 존재하면 스킵).

## 핵심 규칙

1. 정책 조건은 아래와 같습니다.
    - `admin_note IS NOT NULL`
    - `admin_note <> ''`
2. existing policy:
    - `Users can view own feedback` 정책은 유지되며 OR 조건으로 결합됩니다.

## 성공 기준

- 로그인한 일반 사용자에서 `feedback-query` 페이지의 조회가 RLS에 의해 막히지 않아야 합니다.
- `admin_note`가 없는 접수는 목록에 노출되지 않아야 합니다.
