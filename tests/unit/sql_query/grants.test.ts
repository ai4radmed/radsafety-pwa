import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// 명세: .spec/tests/unit/sql_query/grants.test.md

const DIR = join(process.cwd(), 'sql_query');

// 2026-10-30 전에 운영 DB 에 만들어진 테이블 — 옛 자동 권한이 남아 있어 검사에서 뺀다.
// 새 테이블은 여기에 추가하지 말고 SQL 에 GRANT 를 넣는다.
const LEGACY_TABLES = new Set([
    'archives',
    'bulletins',
    'feedback',
    'findings',
    'glossary_terms',
    'hospitals_custom',
    'notifications',
    'profiles',
    'proposal_quota',
    'proposals',
    'push_subscriptions',
    'usage_active',
    'usage_daily',
    'usage_events',
    'usage_page_daily',
    'watch_items',
    'watch_sources',
]);

/** 주석(-- …)을 뺀 SQL 본문. */
function stripComments(sql: string): string {
    return sql
        .split('\n')
        .map((line) => line.replace(/--.*$/, ''))
        .join('\n');
}

function createdTables(sql: string): string[] {
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi;
    return [...sql.matchAll(re)].map((m) => m[1].toLowerCase());
}

function hasServiceRoleGrant(sql: string, table: string): boolean {
    const re = new RegExp(
        `grant\\s+[^;]*?\\son\\s+(?:table\\s+)?public\\.${table}\\s+to\\s+[^;]*\\bservice_role\\b`,
        'i',
    );
    return re.test(sql);
}

describe('sql_query — 새 테이블의 권한(GRANT) 명시', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.sql'));

    it('SQL 파일을 읽는다', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it('2026-10-30 이후 만드는 테이블은 같은 파일에서 service_role 에 GRANT 한다', () => {
        const missing: string[] = [];
        for (const file of files) {
            const sql = stripComments(readFileSync(join(DIR, file), 'utf-8'));
            for (const table of createdTables(sql)) {
                if (LEGACY_TABLES.has(table)) continue;
                if (!hasServiceRoleGrant(sql, table)) missing.push(`${file}: public.${table}`);
            }
        }
        expect(missing, `GRANT 누락 — sql_query/_template_new_table.sql 참고`).toEqual([]);
    });

    it('검사기 자체 — 누락은 잡고, 있으면 통과시킨다', () => {
        const bad = stripComments('CREATE TABLE IF NOT EXISTS public.new_thing (id int);');
        const good = stripComments(
            'CREATE TABLE public.new_thing (id int);\nGRANT SELECT, INSERT ON public.new_thing TO authenticated, service_role;',
        );
        const commented = stripComments('-- CREATE TABLE public.new_thing (id int);');
        expect(createdTables(bad)).toEqual(['new_thing']);
        expect(hasServiceRoleGrant(bad, 'new_thing')).toBe(false);
        expect(hasServiceRoleGrant(good, 'new_thing')).toBe(true);
        expect(createdTables(commented)).toEqual([]);
    });
});
