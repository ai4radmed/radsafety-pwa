-- ============================================================
-- Archives Foreign Key 진단 쿼리
-- ============================================================
-- 목적: archives 테이블의 외래키 상태와 스키마 캐시 문제 진단

-- 1. archives 테이블 존재 확인
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archives') THEN
        RAISE NOTICE '✅ archives 테이블 존재함';
    ELSE
        RAISE WARNING '❌ archives 테이블 없음';
    END IF;
END $$;

-- 2. profiles 테이블 존재 확인
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE '✅ profiles 테이블 존재함';
    ELSE
        RAISE WARNING '❌ profiles 테이블 없음';
    END IF;
END $$;

-- 3. archives.user_id 컬럼 존재 확인
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archives' AND column_name = 'user_id'
    ) THEN
        RAISE NOTICE '✅ archives.user_id 컬럼 존재함';
    ELSE
        RAISE WARNING '❌ archives.user_id 컬럼 없음';
    END IF;
END $$;

-- 4. 외래키 제약조건 상세 조회
DO $$
DECLARE
    fk_record RECORD;
    fk_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '외래키 제약조건 목록:';
    RAISE NOTICE '========================================';

    FOR fk_record IN
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        LEFT JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'archives'
            AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        fk_count := fk_count + 1;
        RAISE NOTICE '  [%] % (%)',
            fk_count,
            fk_record.constraint_name,
            fk_record.table_name || '.' || fk_record.column_name || ' -> ' ||
            fk_record.foreign_table_name || '.' || fk_record.foreign_column_name ||
            ' (ON DELETE ' || fk_record.delete_rule || ')';
    END LOOP;

    IF fk_count = 0 THEN
        RAISE WARNING '❌ archives 테이블에 외래키 제약조건이 없습니다!';
    ELSE
        RAISE NOTICE '✅ 총 % 개의 외래키 제약조건 발견', fk_count;
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- 5. archives 테이블의 모든 제약조건 확인
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'archives 테이블의 모든 제약조건:';
    RAISE NOTICE '========================================';

    FOR constraint_record IN
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'archives'
        ORDER BY constraint_type, constraint_name
    LOOP
        RAISE NOTICE '  - % (%)', constraint_record.constraint_name, constraint_record.constraint_type;
    END LOOP;
    RAISE NOTICE '========================================';
END $$;

-- 6. archives 테이블의 컬럼 상세 정보
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'archives 테이블 컬럼 정보:';
    RAISE NOTICE '========================================';

    FOR col_record IN
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'archives'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - % (%, nullable: %, default: %)',
            col_record.column_name,
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'none');
    END LOOP;
    RAISE NOTICE '========================================';
END $$;

-- 7. 외래키 강제 재생성 시도
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '외래키 재생성 시도 중...';
    RAISE NOTICE '========================================';

    -- 기존 외래키 삭제 (있으면)
    BEGIN
        ALTER TABLE public.archives DROP CONSTRAINT IF EXISTS archives_user_id_fkey;
        RAISE NOTICE '✓ 기존 외래키 제약조건 삭제 시도 완료';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠ 외래키 삭제 중 오류 (무시): %', SQLERRM;
    END;

    -- 새 외래키 생성
    BEGIN
        ALTER TABLE public.archives
        ADD CONSTRAINT archives_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

        RAISE NOTICE '✅ 외래키 제약조건 생성 성공!';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ 외래키 생성 실패: %', SQLERRM;
    END;

    RAISE NOTICE '========================================';
END $$;

-- 8. 생성 후 확인
DO $$
DECLARE
    fk_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'archives'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'user_id'
            AND tc.constraint_name = 'archives_user_id_fkey'
    ) INTO fk_exists;

    IF fk_exists THEN
        RAISE NOTICE '✅ 최종 확인: archives.user_id -> profiles.id 외래키 존재함';
    ELSE
        RAISE WARNING '❌ 최종 확인: 외래키가 여전히 존재하지 않음';
    END IF;
END $$;

-- 9. PostgREST 스키마 캐시 강제 갱신
DO $$
BEGIN
    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE '✅ PostgREST 스키마 캐시 갱신 요청 완료';
END $$;
