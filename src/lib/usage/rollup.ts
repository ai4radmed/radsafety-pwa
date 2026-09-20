/**
 * 사용성 집계 야간 롤업 (U-4).
 *
 * 하는 일 셋:
 *  1. 원시 이벤트를 일자·이벤트별 집계(`usage_daily`)로 말아 넣는다
 *  2. 일·주·월 활성 사용자 수(`usage_active`)를 센다
 *  3. 보존 기간이 지난 원시 행을 지운다
 *
 * **최근 며칠을 다시 계산한다.** 오프라인 큐가 며칠 늦게 도착할 수 있어 지난 날짜의 수치가
 * 나중에 늘어나기 때문이다. 집계는 덮어쓰기(upsert)라 몇 번을 돌려도 같은 결과가 된다.
 *
 * 집계는 SQL 이 아니라 여기서 한다 — 규칙(한국 시간 기준 날짜·ISO 주차)을 기록할 때와
 * 똑같은 함수로 계산해야 어긋나지 않고, 그래야 시험도 붙는다.
 */
import { supabaseAdmin } from '../supabase-server';
import { createLogger } from '../logger';
import { USAGE_RETENTION_DAYS } from './config';
import { kstDayKey, kstMonthKey, kstMonthStart, kstWeekKey, kstWeekStart, kstDayStart } from './record';

const log = createLogger('usage-rollup');

/** 다시 계산하는 창. 오프라인 큐 상한(7일)보다 하루 넉넉하게. */
export const ROLLUP_WINDOW_DAYS = 8;

/** 한 번에 읽어 오는 행 수. Supabase 기본 상한과 같다. */
const PAGE_SIZE = 1000;

export interface RawUsageRow {
    event: string;
    hour: string;
    page: string | null;
    actor_key: string | null;
    week_key: string | null;
    month_key: string | null;
}

export interface DailyAggregate {
    day: string;
    event: string;
    count: number;
    unique_actors: number;
}

export interface PageDailyAggregate {
    day: string;
    page: string;
    event: string;
    count: number;
    unique_actors: number;
}

export interface ActiveAggregate {
    period: 'day' | 'week' | 'month';
    period_key: string;
    unique_actors: number;
}

/**
 * 일자·이벤트별 횟수와 활성자 수.
 *
 * 활성자는 `actor_key` 가 있는 행만 센다 — 비로그인 방문자는 서로 구분할 수단이 없으므로
 * "몇 명"에 넣을 수 없다. 횟수(`count`)에는 들어간다.
 */
export function aggregateDaily(rows: RawUsageRow[]): DailyAggregate[] {
    const buckets = new Map<string, { day: string; event: string; count: number; actors: Set<string> }>();
    for (const row of rows) {
        const day = kstDayKey(new Date(row.hour));
        const key = `${day}\u0000${row.event}`;
        let b = buckets.get(key);
        if (!b) {
            b = { day, event: row.event, count: 0, actors: new Set() };
            buckets.set(key, b);
        }
        b.count += 1;
        if (row.actor_key) b.actors.add(row.actor_key);
    }
    return [...buckets.values()]
        .map((b) => ({ day: b.day, event: b.event, count: b.count, unique_actors: b.actors.size }))
        .sort((a, b) => (a.day === b.day ? a.event.localeCompare(b.event) : a.day.localeCompare(b.day)));
}

/**
 * 화면별 일자 집계. 경로가 있는 행만 센다.
 *
 * `usage_daily` 가 경로를 버리기 때문에 이 표가 없으면 "어느 화면이 쓰이는가"가 원시 보존
 * 기간이 지나는 순간 사라진다 — 다음에 무엇을 만들지 정하는 데 가장 직접적인 신호다.
 */
export function aggregatePageDaily(rows: RawUsageRow[]): PageDailyAggregate[] {
    const buckets = new Map<string, { day: string; page: string; event: string; count: number; actors: Set<string> }>();
    for (const row of rows) {
        if (!row.page) continue;
        const day = kstDayKey(new Date(row.hour));
        const key = `${day}\u0000${row.page}\u0000${row.event}`;
        let b = buckets.get(key);
        if (!b) {
            b = { day, page: row.page, event: row.event, count: 0, actors: new Set() };
            buckets.set(key, b);
        }
        b.count += 1;
        if (row.actor_key) b.actors.add(row.actor_key);
    }
    return [...buckets.values()]
        .map((b) => ({ day: b.day, page: b.page, event: b.event, count: b.count, unique_actors: b.actors.size }))
        .sort((a, b) => (a.day === b.day ? b.count - a.count : a.day.localeCompare(b.day)));
}

/**
 * 일·주·월 활성 사용자 수.
 *
 * 기간마다 다른 키를 쓴다 — 하루치 키로는 주간 활성자를 셀 수 없다. 날이 바뀌면 일일 키를
 * 다시 만들 수 없는 것이 설계의 의도이기 때문이다.
 */
export function aggregateActive(rows: RawUsageRow[], opts: { minPeriodStart?: Date } = {}): ActiveAggregate[] {
    const min = opts.minPeriodStart ? opts.minPeriodStart.getTime() : -Infinity;
    const day = new Map<string, Set<string>>();
    const week = new Map<string, Set<string>>();
    const month = new Map<string, Set<string>>();

    const add = (m: Map<string, Set<string>>, key: string, value: string | null, periodStart: Date) => {
        if (!value) return;
        // 기간의 시작이 읽어 온 범위보다 앞서면 그 기간은 **부분만** 보인다. 부분 계산으로
        // 저장된 값을 덮어쓰면 수치가 줄어든다 — 그럴 바엔 건드리지 않는다.
        if (periodStart.getTime() < min) return;
        let s = m.get(key);
        if (!s) {
            s = new Set();
            m.set(key, s);
        }
        s.add(value);
    };

    for (const row of rows) {
        const at = new Date(row.hour);
        add(day, kstDayKey(at), row.actor_key, kstDayStart(at));
        add(week, kstWeekKey(at), row.week_key, kstWeekStart(at));
        add(month, kstMonthKey(at), row.month_key, kstMonthStart(at));
    }

    const out: ActiveAggregate[] = [];
    for (const [period_key, set] of day) out.push({ period: 'day', period_key, unique_actors: set.size });
    for (const [period_key, set] of week) out.push({ period: 'week', period_key, unique_actors: set.size });
    for (const [period_key, set] of month) out.push({ period: 'month', period_key, unique_actors: set.size });
    return out.sort((a, b) =>
        a.period === b.period ? a.period_key.localeCompare(b.period_key) : a.period < b.period ? -1 : 1,
    );
}

export interface RollupResult {
    windowDays: number;
    since: string;
    /** 활성자 계산을 위해 실제로 읽어 온 시작점(이번 주·이번 달 시작까지 거슬러 간다). */
    fetchedFrom: string;
    scannedRows: number;
    dailyRows: number;
    pageDailyRows: number;
    activeRows: number;
    prunedBefore: string;
    pruned: number | null; // dry 이면 null
    dry: boolean;
    error?: string;
}

/** 창 안의 원시 행을 모두 읽는다. Supabase 가 한 번에 1000행까지만 주므로 나눠 읽는다. */
async function fetchWindow(sinceIso: string): Promise<RawUsageRow[]> {
    if (!supabaseAdmin) return [];
    const rows: RawUsageRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('usage_events')
            .select('event, hour, page, actor_key, week_key, month_key')
            .gte('hour', sinceIso)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as RawUsageRow[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }
    return rows;
}

function daysAgo(now: Date, days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * 롤업 1회. **던지지 않는다** — 크론이 실패해도 앱은 멀쩡해야 하고, 실패는 응답으로 보고한다.
 * `dry` 면 읽고 계산만 하고 쓰지 않는다.
 */
export async function runUsageRollup(opts: { now?: Date; dry?: boolean } = {}): Promise<RollupResult> {
    const now = opts.now ?? new Date();
    const dry = opts.dry === true;
    const since = daysAgo(now, ROLLUP_WINDOW_DAYS);
    const prunedBefore = daysAgo(now, USAGE_RETENTION_DAYS);

    const base: RollupResult = {
        windowDays: ROLLUP_WINDOW_DAYS,
        since: since.toISOString(),
        fetchedFrom: since.toISOString(),
        scannedRows: 0,
        dailyRows: 0,
        pageDailyRows: 0,
        activeRows: 0,
        prunedBefore: prunedBefore.toISOString(),
        pruned: null,
        dry,
    };

    if (!supabaseAdmin) return { ...base, error: '서버 설정 오류: 관리자 권한 클라이언트가 없습니다.' };

    try {
        // 활성자는 **그 기간 전체**를 봐야 센다. 8일 창만 읽고 월간 활성자를 계산하면 8일치가
        // 한 달치 자리에 덮어써져 수치가 줄어든다. 그래서 이번 주·이번 달의 시작까지 거슬러
        // 읽는다(보존 기간이 35일인 이유가 여기 있다 — 한 달이 온전히 남아 있어야 한다).
        const fetchStart = new Date(
            Math.min(since.getTime(), kstWeekStart(now).getTime(), kstMonthStart(now).getTime()),
        );
        // 보존 경계보다 앞선 기간은 원시가 이미 잘려 있어 부분만 보인다 — 건드리지 않는다.
        const minPeriodStart = new Date(Math.max(fetchStart.getTime(), prunedBefore.getTime()));

        const rows = await fetchWindow(fetchStart.toISOString());

        // 일자·화면 집계는 8일 창만 다시 쓴다. 그 앞은 이미 확정돼 있고 건드릴 이유가 없다.
        const sinceDayKey = kstDayKey(since);
        const windowRows = rows.filter((r) => kstDayKey(new Date(r.hour)) >= sinceDayKey);

        const daily = aggregateDaily(windowRows);
        const pageDaily = aggregatePageDaily(windowRows);
        const active = aggregateActive(rows, { minPeriodStart });

        if (!dry) {
            // 창 안에서는 **다시 계산한 것이 정답**이다. 덮어쓰기만 하면 원시에서 사라진 조합의
            // 낡은 집계가 영원히 남는다(시험용 행을 지워도 합계에 계속 잡히는 식).
            const delDaily = await supabaseAdmin.from('usage_daily').delete().gte('day', sinceDayKey);
            if (delDaily.error) throw new Error(delDaily.error.message);
            const delPage = await supabaseAdmin.from('usage_page_daily').delete().gte('day', sinceDayKey);
            if (delPage.error) throw new Error(delPage.error.message);

            if (daily.length > 0) {
                const { error } = await supabaseAdmin.from('usage_daily').insert(daily);
                if (error) throw new Error(error.message);
            }
            if (pageDaily.length > 0) {
                const { error } = await supabaseAdmin.from('usage_page_daily').insert(pageDaily);
                if (error) throw new Error(error.message);
            }
            if (active.length > 0) {
                const { error } = await supabaseAdmin
                    .from('usage_active')
                    .upsert(active, { onConflict: 'period,period_key' });
                if (error) throw new Error(error.message);
            }
        }

        let pruned: number | null = null;
        if (!dry) {
            const { data, error } = await supabaseAdmin
                .from('usage_events')
                .delete()
                .lt('hour', prunedBefore.toISOString())
                .select('id');
            if (error) throw new Error(error.message);
            pruned = (data ?? []).length;
        }

        return {
            ...base,
            fetchedFrom: fetchStart.toISOString(),
            scannedRows: rows.length,
            dailyRows: daily.length,
            pageDailyRows: pageDaily.length,
            activeRows: active.length,
            pruned,
        };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        log.error('사용성 롤업 실패', { message });
        return { ...base, error: message };
    }
}
