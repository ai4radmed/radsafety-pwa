import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * K-1 사건·사고 화면·액션·cron 배선의 정적 회귀 검증(파일 소스 읽기 — api-health.test.ts 패턴).
 * 명세: .spec/src/pages/bulletins.md · .spec/src/pages/admin/bulletins.md · .spec/src/actions/index.md
 */
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');
const MEMBER = read('src/pages/bulletins.astro');
const ADMIN = read('src/pages/admin/bulletins.astro');
const ACTIONS = read('src/actions/index.ts');
const CRON = read('src/pages/api/cron/watch.ts');
const SIDEBAR = read('src/components/Sidebar.astro');
const AUTH = read('src/lib/auth-handler.ts');
const HOME = read('src/pages/index.astro');
const CHECK = read('src/components/ChecklistItem.astro');
const PWA = read('astro.config.mjs');

describe('회원 /bulletins', () => {
    it('published 만 조회하고 스레드(parent_id)로 묶으며 기본 필터는 의료·RI 관련', () => {
        expect(MEMBER).toMatch(/\.eq\('status', 'published'\)/);
        expect(MEMBER).toMatch(/parent_id/);
        expect(MEMBER).toMatch(/data-filter="relevant"/);
        expect(MEMBER).toMatch(/filter-btn active" data-filter="relevant"/);
    });
    it('"더 보기"는 잘린 내용이 있을 때만(실제 높이 > 표시 높이) — 회원·관리자 화면 공통', () => {
        expect(MEMBER).toMatch(/s\.scrollHeight <= s\.clientHeight \+ 1/);
        expect(ADMIN).toMatch(/s\.scrollHeight <= s\.clientHeight \+ 1/);
    });
    it('원문은 링크(전문 재게시 ✗), 준비 포인트 강조', () => {
        expect(MEMBER).toMatch(/source_url/);
        expect(MEMBER).toMatch(/rel="noopener noreferrer"/);
        expect(MEMBER).toMatch(/정기검사 준비 포인트/);
    });
    it('회원 전용 — publicPaths 에 없고 사이드바에 data-member-only 로 노출', () => {
        expect(AUTH).not.toMatch(/'\/bulletins'/);
        expect(SIDEBAR).toMatch(/href="\/bulletins"\s+data-member-only/);
        expect(SIDEBAR).toMatch(/href="\/admin\/bulletins"/);
    });
});

describe('관리자 /admin/bulletins', () => {
    it('관리자 게이트 + reviewBulletin 액션으로 게시/무시/저장', () => {
        expect(ADMIN).toMatch(/is_admin !== 'true'/);
        expect(ADMIN).toMatch(/actions\.reviewBulletin\(/);
        expect(ADMIN).toMatch(/data-act="publish"/);
        expect(ADMIN).toMatch(/data-act="ignore"/);
    });
    it('스레드 확정은 사람 — 자동 제안(suggested_parent_id)은 미리 골라만 둔다', () => {
        expect(ADMIN).toMatch(/suggested_parent_id/);
        expect(ADMIN).toMatch(/새 사건\(스레드 시작\)/);
        expect(ADMIN).toMatch(/confirm\('게시하면 회원 전체에 알림이 갑니다/);
    });
});

describe('reviewBulletin 액션', () => {
    it('assertAdmin 뒤 게시 시 active 회원 전체 알림, 후속이면 "후속:" 제목', () => {
        const start = ACTIONS.indexOf('reviewBulletin: defineAction');
        const body = ACTIONS.slice(start, ACTIONS.indexOf('reviewSubmission: defineAction'));
        expect(body).toMatch(/await assertAdmin\(adminId\)/);
        expect(body).toMatch(/\.eq\('status', 'active'\)/);
        expect(body).toMatch(/createBulkNotifications\(/);
        expect(body).toMatch(/`후속: \$\{row\.title\}`/);
        expect(body).toMatch(/자기 자신을 상위 사건으로/);
        expect(body).toMatch(/이미 게시된 사건입니다/);
    });
});

describe('cron 배선', () => {
    it('소스별 실행 뒤 ingestBulletins 를 호출하고 dry 면 저장하지 않는다', () => {
        expect(CRON).toMatch(/ingestBulletins\(source\.id, r\.items, \{ persist: !dry \}\)/);
        expect(CRON).toMatch(/bulletins,/);
    });
});

describe('K-1 후속(2026-09-20): 체크리스트 연결 · 홈 배너 · 오프라인 캐시', () => {
    it('체크리스트 항목에 checklist-<slug> 앵커가 있고 해시로 열리며 스크롤한다', () => {
        expect(CHECK).toMatch(/id=\{`checklist-\$\{item\.slug \?\? item\.id\}`\}/);
        expect(CHECK).toMatch(/location\.hash/);
        expect(CHECK).toMatch(/scrollIntoView/);
    });
    it('관리자는 카탈로그(콘텐츠 slug·제목)로 항목을 고르고 액션에 checklistRefs 로 보낸다', () => {
        expect(ADMIN).toMatch(/getCollection\('inspection_prep'\)/);
        expect(ADMIN).toMatch(/id="checklistCatalog"/);
        expect(ADMIN).toMatch(/data-cl=/);
        expect(ADMIN).toMatch(/checklistRefs,/);
        const start = ACTIONS.indexOf('reviewBulletin: defineAction');
        const body = ACTIONS.slice(start, ACTIONS.indexOf('reviewSubmission: defineAction'));
        expect(body).toMatch(/checklistRefs: z\.array\(z\.string\(\)\.regex/);
        expect(body).toMatch(/patch\.checklist_refs = checklistRefs/);
    });
    it('회원 화면은 refs 를 /inspection-prep#checklist-<slug> 링크로, 카탈로그에 없는 slug 는 건너뛴다', () => {
        expect(MEMBER).toMatch(/\/inspection-prep#checklist-\$\{encodeURIComponent\(slug\)\}/);
        expect(MEMBER).toMatch(/CATALOG\.has\(slug\)/);
    });
    it('홈 배너는 회원 전용(data-member-only)·관련 루트 사건 1건·실패 시 숨김', () => {
        expect(HOME).toMatch(/id="latestBulletin"[^>]*data-member-only[^>]*hidden/);
        expect(HOME).toMatch(/\.eq\('relevant', true\)/);
        expect(HOME).toMatch(/\.is\('parent_id', null\)/);
        expect(HOME).toMatch(/\.limit\(1\)/);
    });
    it('PWA: Supabase REST bulletins 응답을 NetworkFirst 로 캐시(bulletins-data, 7일)', () => {
        expect(PWA).toMatch(/rest\\\/v1\\\/bulletins/);
        expect(PWA).toMatch(/cacheName: 'bulletins-data'/);
        expect(PWA).toMatch(/maxAgeSeconds: 7 \* 24 \* 60 \* 60/);
    });
});
