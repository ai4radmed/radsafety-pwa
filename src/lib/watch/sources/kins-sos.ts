/**
 * RASIS 방사선규제해석 SOS 어댑터. 명세: .spec/src/lib/watch/sources/kins-sos.md
 *
 * 화면(RadSafeInfoSysPtcp070101.do)은 부모 프레임 함수(top.fn_getRealMenu)에 의존해 직접 주소가
 * 없지만, 목록을 채우는 내부 API 는 로그인·프레임 없이 JSON 을 돌려준다(2026-09-20 실측 158건).
 * 목록은 분류(mngNo)순이라 신규가 중간에 끼어든다 — 건별 지문 비교가 필요하다.
 */

import { createHash } from 'node:crypto';
import type { WatchItem, WatchSource } from '../types';

export const KINS_SOS_LIST_URL = 'https://rasis.kins.re.kr/rsp/nob/pii/selectIntrprtInstList.do';
const MENU_NO = '70000011';
const PAGE_SIZE = 500; // 2026-09-20 기준 158건. 한 페이지에 다 담아 페이징 오류를 피한다.

export interface SosRow {
    writNo: string;
    mngNo: string;
    writTitl: string;
    bdtxtCntn?: string;
    questtypcd?: string;
    questtypcds?: string;
    oppbYn?: string;
    opertnDt?: string;
    exprDt?: string;
}

interface SosResponse {
    pageInfo?: { rowCount?: number };
    faqList?: SosRow[];
}

export function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

/** 알림에 넣을 분류 라벨 — "허가/신고 · 규제대상" 꼴. */
function categoryOf(row: SosRow): string | null {
    const parts = [row.questtypcd, row.questtypcds].map((s) => (s || '').trim()).filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
}

/** 응답 행 → WatchItem. 본문(bdtxtCntn)은 지문에만 쓰고 저장하지 않는다. */
export function normalizeSosRows(payload: SosResponse): WatchItem[] {
    const rows = payload.faqList ?? [];
    const expected = payload.pageInfo?.rowCount;
    // rowCount 와 실제 건수가 어긋나면 잘린 응답 — 잘못된 "삭제" 판정을 막기 위해 실패로 취급.
    if (typeof expected === 'number' && expected !== rows.length) {
        throw new Error(`KINS SOS 응답 불일치: rowCount=${expected}, rows=${rows.length}`);
    }
    return rows.map((r) => ({
        externalId: String(r.writNo),
        title: (r.writTitl || '').trim(),
        category: categoryOf(r),
        fingerprint: sha256(
            [r.writTitl, r.bdtxtCntn, r.questtypcd, r.questtypcds, r.oppbYn, r.exprDt].map((s) => s ?? '').join(''),
        ),
        detail: {
            mngNo: String(r.mngNo ?? ''),
            opertnDt: String(r.opertnDt ?? ''),
        },
    }));
}

export async function fetchSosItems(fetchImpl: typeof fetch = fetch): Promise<WatchItem[]> {
    const body = new URLSearchParams({ pageIndex: '1', pageSize: String(PAGE_SIZE), menuNo: MENU_NO });
    const res = await fetchImpl(KINS_SOS_LIST_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-requested-with': 'XMLHttpRequest',
            referer: 'https://rasis.kins.re.kr/',
            'user-agent': 'RadSafety-watch/1.0 (+https://radsafety.kr/kins)',
        },
        body,
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`KINS SOS HTTP ${res.status}`);
    const payload = (await res.json()) as SosResponse;
    return normalizeSosRows(payload);
}

export const kinsSosSource: WatchSource = {
    id: 'kins-sos',
    label: 'KINS 방사선규제해석 SOS',
    guide: 'RASIS 메인 → 알림마당 → 방사선규제해석SOS 에서 관리번호로 찾기',
    link: '/kins',
    fetchItems: () => fetchSosItems(),
};
