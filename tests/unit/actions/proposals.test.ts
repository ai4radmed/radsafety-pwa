import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 3단계 제안 채널 — "글에 문을 지나간 흔적을 남기지 않는다"는 설계가 코드에 있는지 정적으로 검증.
 * 명세: .spec/src/actions/proposals.md · .spec/src/pages/{proposals,proposal-lookup,my-proposals}.md · admin/proposals.md
 */
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');
const ACT = read('src/actions/proposals.ts');
const IDX = read('src/actions/index.ts');
const SQL = read('sql_query/migrate_add_proposals.sql');
const SUBMIT = read('src/pages/proposals.astro');
const LOOKUP = read('src/pages/proposal-lookup.astro');
const MINE = read('src/pages/my-proposals.astro');
const ADMIN = read('src/pages/admin/proposals.astro');
const AUTH = read('src/lib/auth-handler.ts');
const SIDEBAR = read('src/components/Sidebar.astro');
const PRIVACY = read('src/pages/privacy.astro');

describe('actions/proposals — 문지기는 세션', () => {
    it('index.ts 에 spread 되어 있고, 사용자는 세션 쿠키로만 판정한다(클라이언트 userId/adminId 입력 없음)', () => {
        expect(IDX).toMatch(/\.\.\.proposalActions/);
        expect(ACT).toMatch(/createSupabaseServerClient\(context\.request, context\.cookies\)/);
        expect(ACT).not.toMatch(/adminId: z\./);
        expect(ACT).not.toMatch(/userId: z\./);
    });
    it('submitProposal — anonymous 는 author_id·created_at 비움 + receipt_hash, signed 는 반대', () => {
        expect(ACT).toMatch(/author_id: mode === 'signed' \? user\.id : null/);
        expect(ACT).toMatch(/created_at: mode === 'signed' \? new Date\(\)\.toISOString\(\) : null/);
        expect(ACT).toMatch(/receipt_hash: receipt \? hashReceiptCode\(receipt\) : null/);
    });
    it('submitProposal — 쿼터(1인 1일·전체) + 지난 날 정리, 로그에 본문·사용자 없음', () => {
        expect(ACT).toMatch(/DAILY_QUOTA_GLOBAL/);
        expect(ACT).toMatch(/DAILY_QUOTA_PER_USER/);
        expect(ACT).toMatch(/from\('proposal_quota'\)\.delete\(\)\.lt\('day', day\)/);
        const start = ACT.indexOf('submitProposal: defineAction');
        const end = ACT.indexOf('lookupProposal: defineAction');
        const body = ACT.slice(start, end);
        // 로그 호출에 body/user 가 실리지 않는다
        for (const m of body.matchAll(/logger\.(info|warn|error)\([^)]*\)/g)) {
            expect(m[0]).not.toMatch(/body|user\.id|userId/);
        }
    });
    it('텔레그램은 건수·모드·분류만(본문 ✗)', () => {
        expect(ACT).toMatch(/새 제도 개선 제안 1건/);
        expect(ACT).not.toMatch(/sendTelegramMessage\([^)]*body/);
    });
    it('첨부 — 매직 바이트 판정, 메타 제거, 서비스 롤 업로드, 원본 파일명 미저장', () => {
        expect(ACT).toMatch(/sniffKind\(bytes\)/);
        expect(ACT).toMatch(/stripImageMetadata|stripPdfMetadata/);
        expect(ACT).toMatch(/supabaseAdmin\.storage\s*\.from\(ATTACHMENT_BUCKET\)\s*\.upload\(/);
        expect(ACT).not.toMatch(/file\.name/);
    });
    it('answered 전환 시 signed 작성자에게만 알림(익명은 코드 조회)', () => {
        expect(ACT).toMatch(/becameAnswered && row\.mode === 'signed' && row\.author_id/);
        expect(ACT).toMatch(/link: '\/my-proposals'/);
    });
});

describe('migrate_add_proposals.sql — 없는 컬럼이 설계', () => {
    it('ip·user_agent·hospital_id 컬럼 없음, 익명 행 신원 NULL 을 CHECK 로 강제', () => {
        const table = SQL.slice(
            SQL.indexOf('CREATE TABLE IF NOT EXISTS public.proposals'),
            SQL.indexOf('CREATE INDEX'),
        );
        expect(table).not.toMatch(/\bip\b|user_agent|hospital_id/);
        expect(table).toMatch(
            /mode = 'anonymous' AND author_id IS NULL AND created_at IS NULL AND receipt_hash IS NOT NULL/,
        );
    });
    it('클라이언트 INSERT 정책 없음(쓰기는 서비스 롤), SELECT 는 본인 signed 또는 관리자', () => {
        expect(SQL).not.toMatch(/FOR INSERT/);
        expect(SQL).toMatch(/USING \(author_id = auth\.uid\(\) OR public\.is_current_user_admin\(\) = true\)/);
        expect(SQL).toMatch(/'proposal-attachments', 'proposal-attachments', false/);
    });
});

describe('화면·경로', () => {
    it('제출: 익명이 기본, 법적 방어선 문구, 접수증 코드 1회 표시', () => {
        expect(SUBMIT).toMatch(/value="anonymous" checked/);
        expect(SUBMIT).toMatch(/PROPOSAL_NOTICES\.common1/);
        expect(SUBMIT).toMatch(/id="receiptCode"/);
        expect(SUBMIT).toMatch(/actions\.uploadProposalAttachment\(fd\)/);
        // grid 라벨의 글자 수 span 이 줄을 쪼개지 않도록 label-text 로 감싼다 · hidden 이 display:grid 에 지지 않도록
        expect(SUBMIT).toMatch(/<span class="label-text">내용 \(<span id="bodyCount">/);
        expect(SUBMIT).toMatch(/\.form\[hidden\],\s*\.result\[hidden\]\s*\{\s*display: none;/);
    });
    it('조회는 공개 경로(publicPaths), 제출·내 제안은 회원 전용(data-member-only)', () => {
        expect(AUTH).toMatch(/'\/proposal-lookup'/);
        expect(AUTH).not.toMatch(/'\/proposals'/);
        expect(SIDEBAR).toMatch(/href="\/proposals"\s+data-member-only/);
        expect(SIDEBAR).toMatch(/href="\/my-proposals"\s+data-member-only/);
        expect(SIDEBAR).toMatch(/href="\/admin\/proposals"/);
        // 조회는 공개 메뉴(data-member-only 없음)
        expect(SIDEBAR).toMatch(/href="\/proposal-lookup"\s+class=/);
        expect(SUBMIT).toMatch(/로그인 뒤 작성자를 기록하지 않는 것/);
        expect(LOOKUP).toMatch(/actions\.lookupProposal/);
        expect(MINE).toMatch(/\.eq\('mode', 'signed'\)/);
        expect(MINE).toMatch(/actions\.withdrawProposal/);
    });
    it('관리자: 익명 행은 "작성자 기록 없음", 저장·삭제는 액션, 첨부는 서명 URL', () => {
        expect(ADMIN).toMatch(/작성자 기록 없음/);
        expect(ADMIN).toMatch(/actions\.reviewProposal/);
        expect(ADMIN).toMatch(/actions\.deleteProposal/);
        expect(ADMIN).toMatch(/actions\.proposalAttachmentUrl/);
    });
    it('처리방침에 "작성자 정보를 기록하지 않으며 제안과 계정을 연결하지 않는다" 문장', () => {
        expect(PRIVACY).toMatch(/작성자 정보를 기록하지 않으며 제안과 계정을 연결하지 않습니다/);
    });
});
