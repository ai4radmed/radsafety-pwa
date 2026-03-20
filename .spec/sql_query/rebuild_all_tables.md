# 명세: sql_query/rebuild_all_tables.sql

## 역할 요약

마스터 DB 스키마 스크립트. profiles, findings, archives, allowed_members, verification_requests, notifications, push_subscriptions, glossary_terms, feedback 등 전체 테이블 생성·RLS·함수. SSOT 단일 마이그레이션.

## Public API

없음. Supabase SQL Editor에서 실행.

## 사이드 이펙트

- CREATE TABLE IF NOT EXISTS, ALTER TABLE, CREATE POLICY, RPC 함수 등.
- 기존 데이터 보존 (Safe Migration).

## 핵심 규칙

1. AGENTS.md: 모든 DB 스키마 변경은 이 파일에 통합.
2. 변경 이력은 파일 상단 주석에 버전·날짜 기록.
3. is_current_user_admin() SECURITY DEFINER로 RLS 재귀 방지.
4. profiles: 관리자에게 모든 프로필 수정/삭제 권한 부여 (RLS).

## 데이터 보존 최우선 시 주의

일부 운영 환경에서는 `rebuild_all_tables.sql` 실행이 정책상 금지될 수 있습니다(데이터 보존이 최우선).
이 경우에는 “전체 재빌드”가 아닌 **최소 변경 마이그레이션**을 사용합니다.

- 예: `public.feedback.feedback_status_check` CHECK 제약이 legacy 값만 허용하는 환경
    - 전체 재실행 대신 `sql_query/migrate_feedback_status_check_preserve_data.sql`로 제약만 확장합니다.
