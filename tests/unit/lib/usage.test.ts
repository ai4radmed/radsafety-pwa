import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../../src/lib/supabase-server', () => ({ supabaseAdmin: null }));

import {
    USAGE_EVENTS,
    USAGE_EXCLUDED_PREFIXES,
    isKnownEvent,
    isTrackablePath,
    normalizePage,
    sanitizeProps,
} from '../../../src/lib/usage/events';
import { actorKeys, kstDayKey, kstMonthKey, kstWeekKey, usageSecretConfigured } from '../../../src/lib/usage/record';

afterEach(() => vi.unstubAllEnvs());

describe('usage/events 허용목록', () => {
    it('목록 밖 이벤트는 알 수 없는 이벤트', () => {
        expect(isKnownEvent('page_view')).toBe(true);
        expect(isKnownEvent('keystroke')).toBe(false);
    });

    it('속성은 허용된 키·값만 남고 나머지는 버려진다', () => {
        expect(sanitizeProps('login', { method: 'kakao' })).toEqual({ method: 'kakao' });
        // 허용목록 밖 값
        expect(sanitizeProps('login', { method: 'saml' })).toBeNull();
        // 허용목록 밖 키 — 자유 텍스트가 이 경로로 새지 않는다
        expect(sanitizeProps('login', { method: 'kakao', query: '갑상선 피폭' })).toEqual({ method: 'kakao' });
        // 속성을 받지 않는 이벤트
        expect(sanitizeProps('page_view', { slug: 'abc' })).toBeNull();
    });

    it('slug 는 영문·숫자·하이픈만 받는다', () => {
        expect(sanitizeProps('resource_download', { slug: 'pet-ct-dose' })).toEqual({ slug: 'pet-ct-dose' });
        expect(sanitizeProps('resource_download', { slug: '환자 이름.pdf' })).toBeNull();
    });
});

describe('usage/events 제외 경로', () => {
    it('제도 개선 제안 계열은 기록하지 않는다 — 익명 제출과의 연결을 막는다', () => {
        for (const p of ['/proposals', '/proposals/new', '/proposal-lookup', '/my-proposals']) {
            expect(isTrackablePath(p)).toBe(false);
        }
        expect(USAGE_EXCLUDED_PREFIXES).toContain('/proposals');
        expect(USAGE_EXCLUDED_PREFIXES).toContain('/proposal-lookup');
        expect(USAGE_EXCLUDED_PREFIXES).toContain('/my-proposals');
    });

    it('관리자·API·자산은 화면 이동이 아니다', () => {
        expect(isTrackablePath('/admin/members')).toBe(false);
        expect(isTrackablePath('/api/health')).toBe(false);
        expect(isTrackablePath('/favicon.ico')).toBe(false);
        expect(isTrackablePath('/manifest.webmanifest')).toBe(false);
    });

    it('일반 화면은 기록 대상', () => {
        expect(isTrackablePath('/')).toBe(true);
        expect(isTrackablePath('/inspection-prep')).toBe(true);
        expect(isTrackablePath('/resources/pet-ct')).toBe(true);
    });

    it('질의문자열·해시는 떼고 길이를 제한한다', () => {
        expect(normalizePage('/resources?q=%EA%B0%91%EC%83%81%EC%84%A0#top')).toBe('/resources');
        expect(normalizePage('/bulletins/')).toBe('/bulletins');
        expect(normalizePage(`/${'a'.repeat(300)}`).length).toBe(120);
    });
});

describe('usage/record 익명화', () => {
    const USER = '11111111-2222-3333-4444-555555555555';

    it('비밀키가 없으면 사용자 구분 없이 횟수만 센다 — 앱은 죽지 않는다', () => {
        vi.stubEnv('USAGE_HMAC_SECRET', '');
        expect(usageSecretConfigured()).toBe(false);
        expect(actorKeys(USER)).toEqual({ actor_key: null, week_key: null, month_key: null });
    });

    it('같은 날 같은 사람은 같은 키, 다른 사람은 다른 키', () => {
        vi.stubEnv('USAGE_HMAC_SECRET', 'test-secret');
        const at = new Date('2026-09-20T03:00:00Z');
        const a = actorKeys(USER, at);
        const b = actorKeys(USER, new Date('2026-09-20T09:00:00Z'));
        const other = actorKeys('99999999-2222-3333-4444-555555555555', at);
        expect(a.actor_key).toBe(b.actor_key);
        expect(a.actor_key).not.toBe(other.actor_key);
        expect(a.actor_key).not.toBeNull();
    });

    it('날이 바뀌면 일일 키가 달라진다 — 개인의 시계열을 만들 수 없다', () => {
        vi.stubEnv('USAGE_HMAC_SECRET', 'test-secret');
        // 같은 ISO 주 안의 이틀을 쓴다(월→화). 09-20 은 일요일이라 다음 날이 다음 주차로 넘어간다.
        const d1 = actorKeys(USER, new Date('2026-09-21T03:00:00Z'));
        const d2 = actorKeys(USER, new Date('2026-09-22T03:00:00Z'));
        expect(d1.actor_key).not.toBe(d2.actor_key);
        // 같은 주·같은 달이므로 주·월 키는 유지된다(주간·월간 활성자 수 산출용)
        expect(d1.week_key).toBe(d2.week_key);
        expect(d1.month_key).toBe(d2.month_key);
    });

    it('비밀키가 바뀌면 키도 바뀐다 — 교체가 연결을 끊는다', () => {
        const at = new Date('2026-09-20T03:00:00Z');
        vi.stubEnv('USAGE_HMAC_SECRET', 'secret-a');
        const a = actorKeys(USER, at);
        vi.stubEnv('USAGE_HMAC_SECRET', 'secret-b');
        expect(actorKeys(USER, at).actor_key).not.toBe(a.actor_key);
    });

    it('키에 회원 식별자 원문이 들어 있지 않다', () => {
        vi.stubEnv('USAGE_HMAC_SECRET', 'test-secret');
        const k = actorKeys(USER);
        expect(k.actor_key).not.toContain(USER);
        expect(k.actor_key).toMatch(/^[0-9a-f]{32}$/);
    });
});

describe('usage/record 한국 시간 기준 기간 키', () => {
    it('UTC 로는 전날이어도 한국 시간 기준 날짜를 쓴다', () => {
        // 2026-09-20 21:00 UTC = 2026-09-21 06:00 KST
        expect(kstDayKey(new Date('2026-09-20T21:00:00Z'))).toBe('2026-09-21');
        expect(kstMonthKey(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10');
    });

    it('ISO 주차는 목요일이 속한 해를 따른다', () => {
        expect(kstWeekKey(new Date('2026-09-20T03:00:00Z'))).toMatch(/^\d{4}-W\d{2}$/);
        // 같은 주의 월요일과 일요일은 같은 주차
        const mon = kstWeekKey(new Date('2026-09-14T03:00:00Z'));
        const sun = kstWeekKey(new Date('2026-09-20T03:00:00Z'));
        expect(mon).toBe(sun);
        // 다음 날(월요일)은 다른 주차
        expect(kstWeekKey(new Date('2026-09-21T03:00:00Z'))).not.toBe(sun);
    });
});

describe('usage 허용목록 계약', () => {
    it('U-1 이 기록하는 이벤트가 모두 등록돼 있다', () => {
        for (const e of ['page_view', 'signup', 'username_set', 'feedback_sent']) {
            expect(Object.keys(USAGE_EVENTS)).toContain(e);
        }
    });
});
