# 명세: sql_query/diagnose_archives_fkey.sql

## 역할 요약

archives 테이블 외래키 진단 스크립트. 테이블·컬럼·제약조건 확인, archives_user_id_fkey 재생성 시도, PostgREST 스키마 캐시 갱신.

## Public API

없음. Supabase SQL Editor에서 수동 실행.

## 사이드 이펙트

- ALTER TABLE archives (FK 삭제/추가).
- NOTIFY pgrst, 'reload schema'.

## 핵심 규칙

1. rebuild_all_tables.sql과 별도. 진단·수정용.
2. RAISE NOTICE/WARNING으로 결과 출력.
