/**
 * RASIS 이용자지원간행물 어댑터. 명세: .spec/src/lib/watch/sources/kins-pub.md
 *
 * SOS 와 같은 구조(프레임 의존 화면 + 로그인 없는 목록 API). 2026-09-20 실측 40건.
 * 간행물은 같은 제목으로 파일만 갱신되는 일이 잦아(법령집 연도 개정 등) 첨부 id·수정일시를
 * 지문에 넣는다 — "수정" 알림이 곧 "새 판 나왔다"는 뜻.
 */

import type { WatchItem, WatchSource } from '../types';
import { sha256 } from './kins-sos';

export const KINS_PUB_LIST_URL = 'https://rasis.kins.re.kr/adm/pim/selectPblcList.do';
const PAGE_SIZE = 500;

export interface PubRow {
    pblcClNo: string;
    pblcClSn: string;
    pblcClNm?: string;
    pblcTitl: string;
    atchFileId?: string;
    atchFileIdHwp?: string;
    atchFileIdPdf?: string;
    atchFileIdEtc?: string;
    delYn?: string;
    lastUpdtDttm?: string;
    wdtbDt?: string;
}

interface PubResponse {
    pageInfo?: { rowCount?: number };
    pblcList?: PubRow[];
}

export function normalizePubRows(payload: PubResponse): WatchItem[] {
    const rows = (payload.pblcList ?? []).filter((r) => (r.delYn || 'N') !== 'Y');
    const expected = payload.pageInfo?.rowCount;
    if (typeof expected === 'number' && expected !== (payload.pblcList ?? []).length) {
        throw new Error(`KINS 간행물 응답 불일치: rowCount=${expected}, rows=${(payload.pblcList ?? []).length}`);
    }
    return rows.map((r) => ({
        externalId: `${r.pblcClNo}-${r.pblcClSn}`,
        title: (r.pblcTitl || '').trim(),
        category: (r.pblcClNm || '').trim() || null,
        fingerprint: sha256(
            [r.pblcTitl, r.atchFileId, r.atchFileIdHwp, r.atchFileIdPdf, r.atchFileIdEtc, r.lastUpdtDttm]
                .map((s) => s ?? '')
                .join(''),
        ),
        detail: {
            wdtbDt: String(r.wdtbDt ?? ''),
        },
    }));
}

export async function fetchPubItems(fetchImpl: typeof fetch = fetch): Promise<WatchItem[]> {
    const body = new URLSearchParams({
        pageIndex: '1',
        pageSize: String(PAGE_SIZE),
        prmDclrDivCd: 'RSP',
        searchTy: 'PBLC_TITL',
        searchKeyword: '',
        pblcClNo: '',
        pblcClSn: '',
    });
    const res = await fetchImpl(KINS_PUB_LIST_URL, {
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
    if (!res.ok) throw new Error(`KINS 간행물 HTTP ${res.status}`);
    const payload = (await res.json()) as PubResponse;
    return normalizePubRows(payload);
}

export const kinsPubSource: WatchSource = {
    id: 'kins-pub',
    label: 'KINS 이용자지원간행물',
    guide: 'RASIS 메인 → 알림마당 → 이용자지원간행물',
    link: '/kins',
    fetchItems: () => fetchPubItems(),
};
