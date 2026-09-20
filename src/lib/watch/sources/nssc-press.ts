/**
 * 원자력안전위원회 보도자료 어댑터. 명세: .spec/src/lib/watch/sources/nssc-press.md
 *
 * 공개 게시판(공공누리 표시). 목록 XHR 이 로그인 없이 JSON 을 돌려주며(2026-09-20 실측 총 1,671건,
 * 월 12건 안팎), 게시물마다 직접 주소가 있다(BoardView.do?…&BBS_SEQ=). RASIS 와 달리 최신순·페이지형
 * 이라 전체를 받지 않고 **최신 N건 창(window)** 만 본다 — 엔진의 mode:'window'.
 *
 * 사건 중복(원안위 속보 ↔ KINS/NSIC 사례집 확정본) 은 K-1 스레드 모델에서 묶는다 — 여기서는
 * 속보 감지와 관련 판정(relevant)까지만. documents/privacy_redesign_plan.md K-1·K-3.
 */

import type { WatchItem, WatchSource } from '../types';
import { sha256 } from './kins-sos';

export const NSSC_LIST_URL = 'https://www.nssc.go.kr/ajaxf/FR_BBS_SVC/BBSViewList.do';
export const NSSC_BOARD_URL = 'https://www.nssc.go.kr/ko/cms/FR_CON/index.do?MENU_ID=190';
const WINDOW = 15; // 서버가 pagePerCnt 를 무시하고 15건 고정(2026-09-20 실측). 월 12건 안팎이라 하루 1회면 누락 없음. 행당 ~130KB(CONTENTS 포함)

export interface NsscRow {
    BBS_SEQ: string;
    SUBJECT: string;
    WRITE_DATE?: string; // '2026.09.18'
    DEPT_NM?: string;
    FILE_CNT?: string;
    PUBLIC_NURI_GBN?: string;
}

interface NsscResponse {
    data?: { list?: NsscRow[]; totalRecordCount?: number };
}

/** 회원에게 알릴 만한 건인가 — 부서가 주 기준, 제목 키워드는 보조(plan K-1 relevant 판정). */
const RELEVANT_DEPTS = new Set(['방사선안전과', '방사성폐기물안전과']);
// '방사선'·'방사성' 단독은 원전 방재훈련·후쿠시마 브리핑까지 끌어와 잡음(실측) — 의료·RI 쪽 어휘만.
const RELEVANT_TITLE = /병원|의료|핵의학|동위원소|RI\b|피폭|선원|분실|방사성의약품/;

export function isRelevantPress(row: { DEPT_NM?: string; SUBJECT: string }): boolean {
    if (row.DEPT_NM && RELEVANT_DEPTS.has(row.DEPT_NM.trim())) return true;
    return RELEVANT_TITLE.test(row.SUBJECT || '');
}

export function pressUrl(bbsSeq: string): string {
    return `https://www.nssc.go.kr/ko/cms/FR_BBS_CON/BoardView.do?MENU_ID=190&CONTENTS_NO=1&SITE_NO=2&BOARD_SEQ=5&BBS_SEQ=${encodeURIComponent(bbsSeq)}`;
}

export function normalizeNsscRows(payload: NsscResponse): WatchItem[] {
    const rows = payload.data?.list ?? [];
    return rows.map((r) => ({
        externalId: String(r.BBS_SEQ),
        title: (r.SUBJECT || '').trim(),
        category: (r.DEPT_NM || '').trim() || null,
        // 본문(CONTENTS)은 지문에도 넣지 않는다 — 보도자료는 제목·첨부 수·날짜가 바뀌면 재게시로 본다.
        fingerprint: sha256([r.SUBJECT, r.WRITE_DATE, r.FILE_CNT, r.PUBLIC_NURI_GBN].map((s) => s ?? '').join('')),
        detail: {
            writeDate: String(r.WRITE_DATE ?? ''),
            url: pressUrl(String(r.BBS_SEQ)),
            relevant: isRelevantPress(r) ? 'Y' : 'N',
        },
    }));
}

export async function fetchNsscItems(fetchImpl: typeof fetch = fetch): Promise<WatchItem[]> {
    const body = new URLSearchParams({
        siteId: 'www',
        lang: 'ko',
        MENU_ID: '190',
        SITE_NO: '2',
        BOARD_SEQ: '5',
        pageNo: '1',
        pagePerCnt: String(WINDOW),
    });
    const res = await fetchImpl(NSSC_LIST_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-requested-with': 'XMLHttpRequest',
            referer: NSSC_BOARD_URL,
            'user-agent': 'RadSafety-watch/1.0 (+https://radsafety.kr/kins)',
        },
        body,
        signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`원안위 보도자료 HTTP ${res.status}`);
    const payload = (await res.json()) as NsscResponse;
    if (!Array.isArray(payload.data?.list)) throw new Error('원안위 보도자료 응답 형식 불일치(data.list 없음)');
    return normalizeNsscRows(payload);
}

export const nsscPressSource: WatchSource = {
    id: 'nssc-press',
    label: '원안위 보도자료',
    guide: '원안위 알림마당 → 보도자료 (각 건 직접 링크)',
    link: NSSC_BOARD_URL,
    mode: 'window',
    memberFilter: (item) => item.detail?.relevant === 'Y',
    fetchItems: () => fetchNsscItems(),
};
