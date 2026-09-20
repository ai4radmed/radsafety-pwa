import { createHmac } from 'node:crypto';
import { supabaseAdmin } from '../supabase-server';
import { createLogger } from '../logger';
import { isKnownEvent, isTrackablePath, normalizePage, sanitizeProps } from './events';

const log = createLogger('usage');

// Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있다(telegram.ts 와 같은 함정).
function env(name: string): string | undefined {
    return (
        (import.meta.env as Record<string, string | undefined>)[name] ||
        (typeof process !== 'undefined' ? process.env[name] : undefined)
    );
}

/**
 * 익명화 키. 없으면 사용자 구분 없이 횟수만 센다 — 앱이 죽지 않는다.
 *
 * Production 에만 넣는다. 미리보기 배포가 같은 DB 에 실제 활성자 수를 섞지 않게 하려는 것이고,
 * 그래서 미리보기는 자연스럽게 횟수만 남는다.
 */
export function usageSecret(): string | null {
    const raw = env('USAGE_HMAC_SECRET');
    return raw && raw.trim() ? raw.trim() : null;
}

/** 값은 절대 돌려주지 않는다. 설정 여부만 — 상태 점검 응답에 쓴다. */
export function usageSecretConfigured(): boolean {
    return usageSecret() !== null;
}

function kstParts(at: Date): { y: number; m: number; d: number } {
    const kst = new Date(at.getTime() + 9 * 60 * 60 * 1000);
    return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function kstDayKey(at: Date = new Date()): string {
    const { y, m, d } = kstParts(at);
    return `${y}-${pad(m)}-${pad(d)}`;
}

export function kstMonthKey(at: Date = new Date()): string {
    const { y, m } = kstParts(at);
    return `${y}-${pad(m)}`;
}

/** ISO 8601 주차. 목요일이 속한 해가 그 주의 해다. */
export function kstWeekKey(at: Date = new Date()): string {
    const { y, m, d } = kstParts(at);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayNum = date.getUTCDay() || 7; // 월=1 … 일=7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum); // 그 주의 목요일
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(week)}`;
}

function hmac(secret: string, input: string): string {
    return createHmac('sha256', secret).update(input).digest('hex').slice(0, 32);
}

export interface ActorKeys {
    actor_key: string | null;
    week_key: string | null;
    month_key: string | null;
}

/**
 * 되돌릴 수 없는 활동 키. 날이 바뀌면 같은 사람을 이을 수 없다 — 일간 활성자 수는 정확하되
 * 개인의 시계열은 만들 수 없다. 주·월은 각각 그 기간 안에서만 이어진다.
 */
export function actorKeys(userId: string | null | undefined, at: Date = new Date()): ActorKeys {
    const secret = usageSecret();
    if (!secret || !userId) return { actor_key: null, week_key: null, month_key: null };
    return {
        actor_key: hmac(secret, `d:${userId}:${kstDayKey(at)}`),
        week_key: hmac(secret, `w:${userId}:${kstWeekKey(at)}`),
        month_key: hmac(secret, `m:${userId}:${kstMonthKey(at)}`),
    };
}

/** 발생 시각을 시 단위로 뭉갠다. 분·초가 남으면 요청 시각 대조로 개인 추정이 쉬워진다. */
function truncateToHour(at: Date): string {
    const d = new Date(at.getTime());
    d.setUTCMinutes(0, 0, 0);
    return d.toISOString();
}

export interface UsageInput {
    event: string;
    page?: string | null;
    props?: Record<string, unknown> | null;
    userId?: string | null;
    at?: Date;
}

/**
 * 이벤트 1건 기록. **절대 던지지 않는다** — 집계 실패가 업무를 되돌리면 안 된다.
 * 허용목록 밖 이벤트·제외 경로·미설정 환경은 조용히 건너뛴다.
 */
export async function recordUsage(input: UsageInput): Promise<boolean> {
    try {
        const { event } = input;
        if (!isKnownEvent(event)) return false;
        if (!supabaseAdmin) return false;

        const rawPage = input.page ?? null;
        if (rawPage !== null && !isTrackablePath(rawPage)) return false;

        const at = input.at ?? new Date();
        const keys = actorKeys(input.userId ?? null, at);

        const { error } = await supabaseAdmin.from('usage_events').insert({
            event,
            page: rawPage ? normalizePage(rawPage) : null,
            props: sanitizeProps(event, input.props),
            hour: truncateToHour(at),
            ...keys,
        });
        if (error) {
            log.warn('사용성 기록 실패', { event, message: error.message });
            return false;
        }
        return true;
    } catch (e) {
        log.warn('사용성 기록 예외', { message: e instanceof Error ? e.message : String(e) });
        return false;
    }
}
