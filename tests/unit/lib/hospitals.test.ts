import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCustomSelect = vi.fn();

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAnon: {},
    supabaseAdmin: {
        from: (table: string) => {
            if (table !== 'hospitals_custom') throw new Error(`unexpected table: ${table}`);
            return {
                select: (_cols?: string) => ({
                    eq: (_col: string, val: string) => ({
                        maybeSingle: () => mockCustomSelect(val),
                    }),
                }),
            };
        },
    },
}));

import {
    customHospitalId,
    normalizeHospitalName,
    findStaticHospitalByName,
    isStaticHospitalId,
    isKnownHospitalId,
    getHospitalName,
} from '../../../src/lib/hospitals';

beforeEach(() => {
    mockCustomSelect.mockReset();
});

describe('lib/hospitals', () => {
    it('customHospitalId — 결정적이고 공백·대소문자에 무관하며 slug 규칙을 따른다', () => {
        const a = customHospitalId('테스트 병원');
        expect(a).toBe(customHospitalId('테스트병원'));
        expect(a).toBe(customHospitalId(' 테스트  병원 '));
        expect(a).toMatch(/^c-[a-f0-9]{10}$/);
        expect(customHospitalId('다른병원')).not.toBe(a);
    });

    it('normalizeHospitalName — 공백 제거·소문자화', () => {
        expect(normalizeHospitalName(' Seoul  Hospital ')).toBe('seoulhospital');
    });

    it('findStaticHospitalByName — 표기만 다른 정적 기관을 찾고, 기타는 제외', () => {
        expect(findStaticHospitalByName('한국 원자력 의학원')?.id).toBe(
            'korea-institute-radiological-medical-sciences',
        );
        expect(findStaticHospitalByName('기타')).toBeUndefined();
        expect(findStaticHospitalByName('없는병원')).toBeUndefined();
    });

    it('isKnownHospitalId — 정적 id는 DB 조회 없이 true', async () => {
        expect(await isKnownHospitalId('other')).toBe(true);
        expect(mockCustomSelect).not.toHaveBeenCalled();
    });

    it('isKnownHospitalId — c- 접두가 아니면 DB 조회 없이 false', async () => {
        expect(await isKnownHospitalId('no-such-hospital')).toBe(false);
        expect(mockCustomSelect).not.toHaveBeenCalled();
    });

    it('isKnownHospitalId — c- 접두는 hospitals_custom 에서 확인', async () => {
        mockCustomSelect.mockResolvedValueOnce({ data: { id: 'c-abc' } });
        expect(await isKnownHospitalId('c-abc')).toBe(true);
        mockCustomSelect.mockResolvedValueOnce({ data: null });
        expect(await isKnownHospitalId('c-zzz')).toBe(false);
    });

    it('getHospitalName — 정적 → 커스텀 → id 순으로 해석', async () => {
        expect(await getHospitalName('korea-institute-radiological-medical-sciences')).toBe('한국원자력의학원');
        mockCustomSelect.mockResolvedValueOnce({ data: { name: '테스트병원' } });
        expect(await getHospitalName('c-abc')).toBe('테스트병원');
        mockCustomSelect.mockResolvedValueOnce({ data: null });
        expect(await getHospitalName('c-zzz')).toBe('c-zzz');
        expect(isStaticHospitalId('c-zzz')).toBe(false);
    });
});
