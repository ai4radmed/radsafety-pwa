import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 2026-09-20 액션 인증 전환 — "클라이언트가 보낸 adminId/userId 를 믿지 않는다"를 소스 수준에서 고정.
 * 명세: .spec/src/actions/auth.md
 */
const IDX = fs.readFileSync(path.resolve('src/actions/index.ts'), 'utf-8');
const AUTH = fs.readFileSync(path.resolve('src/actions/auth.ts'), 'utf-8');

function block(name: string): string {
    const start = IDX.indexOf(`${name}: defineAction(`);
    expect(start, `${name} 액션이 없다`).toBeGreaterThan(-1);
    const rest = IDX.slice(start);
    const end = rest.search(/\n {4}\w+: defineAction\(/); // 다음 액션
    return end === -1 ? rest : rest.slice(0, end);
}

const ADMIN_ACTIONS = [
    'sendNotification',
    'reviewBulletin',
    'reviewSubmission',
    'setPublishPermission',
    'approvePendingMember',
    'rejectPendingMember',
    'resolveHospitalRequest',
    'registerHospitalFromRequest',
];
const USER_ACTIONS = ['sendFeedback', 'claimUsername', 'updateAffiliation', 'notifySubmission'];

describe('actions/auth.ts', () => {
    it('세션 쿠키로 사용자를 읽고, context 가 없으면 미인증으로 거부한다', () => {
        expect(AUTH).toMatch(/createSupabaseServerClient\(context\.request, context\.cookies\)/);
        expect(AUTH).toMatch(/if \(!context\?\.request \|\| !context\.cookies\)/);
        expect(AUTH).toMatch(/code: 'UNAUTHORIZED'/);
        expect(AUTH).toMatch(/if \(!u\.isAdmin\) throw/);
    });
});

describe('actions/index.ts — 클라이언트 id 불신', () => {
    it('assertAdmin(클라이언트 adminId 대조)이 사라졌다', () => {
        expect(IDX).not.toMatch(/assertAdmin/);
        expect(IDX).not.toMatch(/\.eq\('id', adminId\)/);
        expect(IDX).not.toMatch(/\.eq\('id', input\.senderId\)/);
        expect(IDX).not.toMatch(/const userId = input\.userId/);
    });

    it.each(ADMIN_ACTIONS)('%s — requireAdmin(context) 로 판정', (name) => {
        const b = block(name);
        expect(b).toMatch(/requireAdmin\(context\)/);
        expect(b).toMatch(/, context\) => \{/);
    });

    it.each(USER_ACTIONS)('%s — requireUser(context) 로 판정', (name) => {
        const b = block(name);
        expect(b).toMatch(/requireUser\(context\)/);
        expect(b).toMatch(/, context\) => \{/);
    });

    it('클라이언트가 보내던 adminId/senderId/userId 는 optional 로만 남는다(하위 호환, 값은 무시)', () => {
        expect(IDX).not.toMatch(/adminId: z\.string\(\)\.uuid\(\),/);
        expect(IDX).not.toMatch(/senderId: z\.string\(\)\.uuid\(\),/);
        expect(IDX).not.toMatch(/userId: z\.string\(\)\.uuid\(\),\n/);
    });

    it('notifySubmission 은 본인 제출물(또는 관리자)만 알린다', () => {
        expect(block('notifySubmission')).toMatch(/row\.user_id !== user\.id && !user\.isAdmin/);
    });
});
