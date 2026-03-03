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
