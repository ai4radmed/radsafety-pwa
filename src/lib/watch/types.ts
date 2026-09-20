/**
 * 외부 게시판 갱신 감시 — 공용 타입. 명세: .spec/src/lib/watch/engine.md
 */

/** 소스 어댑터가 목록 API 에서 뽑아낸 게시물 1건(본문 없음). */
export interface WatchItem {
    externalId: string;
    title: string;
    category?: string | null;
    /** 변화 감지용 지문 — 어댑터가 "바뀌면 알려야 할 필드"를 골라 sha256. */
    fingerprint: string;
    /** 알림 문안에 쓰는 소량 메타(관리번호·게시일 등). 본문 금지. */
    detail?: Record<string, string>;
}

/** 감시 대상 하나(RASIS SOS 등). 어댑터는 fetch + 정규화만 담당한다. */
export interface WatchSource {
    id: string;
    /** 알림 제목에 쓰는 사람용 이름 */
    label: string;
    /** 직접 주소가 없는 소스의 "메인 → 메뉴" 경로 안내 */
    guide: string;
    /** 알림 카드가 가리킬 경로(앱 내 또는 외부 URL) */
    link: string;
    /**
     * full(기본): 목록 API 가 전체를 돌려준다 — 누락=삭제 후보, 급감 판정 적용.
     * window: 최신 N건만 받는 게시판(원안위 보도자료 등) — 창 밖으로 밀려난 건은 삭제가 아니므로
     *         누락·삭제 판정을 하지 않고, 급감 판정도 0건일 때만.
     */
    mode?: 'full' | 'window';
    /** 관련(회원 관심) 판정 필터 — 회원 알림 대상·관리자 요약의 "관련 N". 없으면 전부. */
    memberFilter?: (item: WatchItem) => boolean;
    /**
     * false 면 감시 단계에서 회원 알림을 보내지 않는다(관리자 텔레그램만). bulletins 처럼 사람 승인 뒤
     * 게시 시점에 알리는 소스용 — 감시 알림과 게시 알림이 겹치지 않게.
     */
    notifyMembers?: boolean;
    fetchItems(): Promise<WatchItem[]>;
}

/** watch_items 행(엔진이 필요로 하는 컬럼만). */
export interface StoredItem {
    externalId: string;
    fingerprint: string;
    missingCount: number;
    removedAt: string | null;
}

/** watch_sources 행. */
export interface SourceState {
    lastCount: number | null;
    consecutiveFailures: number;
    baselineAt: string | null;
}

export interface WatchDiff {
    added: WatchItem[];
    changed: WatchItem[];
    /** 이번 실행에서 안 보인 기존 건(삭제 후보). */
    missing: StoredItem[];
}

export type RunStatus = 'baseline' | 'ok' | 'error' | 'suspicious';

export interface SourceRunResult {
    source: string;
    label: string;
    status: RunStatus;
    count: number;
    added: WatchItem[];
    changed: WatchItem[];
    /** 이번 실행에서 삭제가 확정된 건(2회 연속 누락). */
    removed: string[];
    consecutiveFailures: number;
    error?: string;
    /** 이번 실행에서 수집한 전체 항목(ok·baseline 일 때). bulletins 수집·백필이 쓴다. */
    items?: WatchItem[];
}

/** 영속 계층 — Supabase 구현(`supabase-store.ts`)과 테스트용 메모리 구현이 같은 계약을 따른다. */
export interface WatchStore {
    loadSourceState(source: string): Promise<SourceState | null>;
    loadItems(source: string): Promise<StoredItem[]>;
    /** 이번 실행에서 본 항목 upsert(last_seen 갱신, missing 0, removed 해제). changedIds 는 changed_at 갱신. */
    upsertSeen(source: string, items: WatchItem[], changedIds: Set<string>, now: string): Promise<void>;
    /** 안 보인 항목의 missing_count 증가, 임계 도달 시 removed_at 기록. */
    markMissing(source: string, items: StoredItem[], removedIds: Set<string>, now: string): Promise<void>;
    saveSourceState(
        source: string,
        patch: Partial<{
            lastRunAt: string;
            lastOkAt: string;
            lastCount: number;
            consecutiveFailures: number;
            lastError: string | null;
            baselineAt: string;
        }>,
    ): Promise<void>;
}
