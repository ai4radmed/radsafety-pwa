import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationController } from '../../../../src/lib/admin/verification-controller';

// Supabase mock
vi.mock('../../../../src/lib/supabase-browser', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
    },
}));

describe('VerificationController Logic', () => {
    let controller: VerificationController;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <div class="status-tabs">
                <button class="status-tab" data-status="temp_verified"></button>
                <button class="status-tab" data-status="none"></button>
            </div>
            <input id="userSearch" />
            <table><tbody id="usersTableBody"></tbody></table>
            <div id="dateHeader"></div>
            <span id="temp_verifiedCount">0</span>
            <div id="userDetailModal">
                <span id="modalUserName"></span>
                <span id="detailEmail"></span>
                <span id="detailDepartment"></span>
                <span id="detailReason"></span>
                <div id="rejectReasonSection"></div>
                <textarea id="rejectReasonInput"></textarea>
                <div id="modalActions"></div>
            </div>
        `;

        controller = new VerificationController({ id: 'admin-id', is_admin: 'true' });
    });

    it('검색 필터링이 정상적으로 동작해야 함', () => {
        const mockUsers = [
            { id: '1', real_name: '홍길동', login_email: 'hong@test.com', affiliation: 'A병원' },
            { id: '2', real_name: '김철수', login_email: 'kim@test.com', affiliation: 'B병원' },
        ];

        // Access private member for testing purposes
        (controller as any).allUsers = mockUsers;

        controller.filterUsers('홍길동');
        const tbody = document.getElementById('usersTableBody');
        expect(tbody?.innerHTML).toContain('홍길동');
        expect(tbody?.innerHTML).not.toContain('김철수');
    });

    it('대소문자 무시하고 검색되어야 함', () => {
        const mockUsers = [{ id: '1', real_name: 'John Doe', login_email: 'john@abc.com' }];
        (controller as any).allUsers = mockUsers;

        controller.filterUsers('JOHN');
        const tbody = document.getElementById('usersTableBody');
        expect(tbody?.innerHTML).toContain('John Doe');
    });
});
