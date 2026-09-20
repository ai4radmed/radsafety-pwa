/**
 * NSIC(원자력안전정보공개센터) 방사선사고 사례집 어댑터. 명세: .spec/src/lib/watch/sources/nsic-accidents.md
 *
 * 원안위 정보공개 데이터(2004~, 2026-09-20 실측 103건·의료 19건). 목록은 HTML 조각(POST, listNum 으로 전량),
 * 상세는 JSON(POST seq=EXMN…). 사건 ID(EXMN…)는 RASIS 보고와 동일. 등급 평가 후 게재라 사고 뒤 수개월 늦지만
 * 개요·원인·등급이 있다 — K-1 의 본체. 속보(원안위 보도자료)와의 사건 중복은 bulletins 스레드에서 묶는다.
 *
 * 마스킹: 목록·상세 모두 기관명이 'OO대학교병원' 꼴로 이미 마스킹돼 있다. 실명·상세주소 필드는 없다/쓰지 않는다.
 */

import type { WatchItem, WatchSource } from '../types';
import { sha256 } from './kins-sos';

export const NSIC_LIST_URL = 'https://nsic.nssc.go.kr/information/ajaxRadAccidentList.do';
export const NSIC_DETAIL_URL = 'https://nsic.nssc.go.kr/ajaxRadAccidentListPop.do';
export const NSIC_PAGE_URL = 'https://nsic.nssc.go.kr/information/reguDataActive.do?nsicDtaTyCode=nppAccient';
const LIST_NUM = 1000; // 2026-09-20 실측 103건 — 한 페이지에 전량

const HEADERS = {
    'content-type': 'application/x-www-form-urlencoded',
    'x-requested-with': 'XMLHttpRequest',
    referer: NSIC_PAGE_URL,
    'user-agent': 'RadSafety-watch/1.0 (+https://radsafety.kr/kins)',
};

/** 의료·RI 관련 판정 — plan K-1: 기관명 `병원|의료원|의원` 또는 사고명 `치료용|진료용|방사성의약품|환자|핵의학`. */
const RELEVANT_ORG = /병원|의료원|의원/;
const RELEVANT_TITLE = /치료용|진료용|방사성의약품|환자|핵의학|진단용/;

export function isRelevantAccident(row: { org: string; title: string }): boolean {
    return RELEVANT_ORG.test(row.org) || RELEVANT_TITLE.test(row.title);
}

export interface NsicListRow {
    id: string; // EXMN…
    occurredAt: string; // 'YYYY-MM-DD'
    grade: string; // '(0등급)' | '1등급' | '미대상' …
    type: string; // 분실·피폭·…
    title: string; // 사고명([분류] 제거)
    region: string; // '[서울]'
    org: string; // 마스킹 기관명
}

function stripTags(html: string): string {
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

/** 목록 HTML 조각 → 행. 헤더 행(EXMN 없음)은 건너뛴다. */
export function parseNsicList(html: string): NsicListRow[] {
    const rows: NsicListRow[] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let m: RegExpExecArray | null;
    while ((m = trRe.exec(html))) {
        const tr = m[1];
        const idMatch = /gotoDtl\('(EXMN[0-9A-Za-z_-]+)'\)/.exec(tr);
        if (!idMatch) continue;
        const cells = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((c) => stripTags(c[1]));
        if (cells.length < 5) continue;
        const [occurredAt, grade, typedTitle, region, org] = cells;
        const typeMatch = /^\[(.*?)\]\s*(.*)$/.exec(typedTitle);
        rows.push({
            id: idMatch[1],
            occurredAt,
            grade,
            type: typeMatch ? typeMatch[1] : '',
            title: typeMatch ? typeMatch[2] : typedTitle,
            region,
            org,
        });
    }
    return rows;
}

export function toWatchItem(r: NsicListRow): WatchItem {
    return {
        externalId: r.id,
        title: r.title,
        category: r.type || null,
        fingerprint: sha256([r.occurredAt, r.grade, r.type, r.title, r.region, r.org].join('')),
        detail: {
            occurredAt: r.occurredAt,
            grade: r.grade,
            region: r.region,
            org: r.org,
            url: NSIC_PAGE_URL,
            relevant: isRelevantAccident(r) ? 'Y' : 'N',
        },
    };
}

export async function fetchNsicItems(fetchImpl: typeof fetch = fetch): Promise<WatchItem[]> {
    const res = await fetchImpl(NSIC_LIST_URL, {
        method: 'POST',
        headers: HEADERS,
        body: new URLSearchParams({ currPage: '1', listNum: String(LIST_NUM) }),
        signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`NSIC 목록 HTTP ${res.status}`);
    const rows = parseNsicList(await res.text());
    if (!rows.length) throw new Error('NSIC 목록 파싱 결과 0건(구조 변경?)');
    return rows.map(toWatchItem);
}

export interface NsicDetail {
    summary: string; // inciMainCntn — 사건 개요
    cause: string; // inciCausCntn — 사고원인
}

/** 상세 JSON — 개요·원인만 취한다(요약 보고 inciSummCntn 은 개요와 중복이라 생략). */
export async function fetchNsicDetail(seq: string, fetchImpl: typeof fetch = fetch): Promise<NsicDetail> {
    const res = await fetchImpl(NSIC_DETAIL_URL, {
        method: 'POST',
        headers: HEADERS,
        body: new URLSearchParams({ seq }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`NSIC 상세 HTTP ${res.status}`);
    const json = (await res.json()) as { view?: { inciMainCntn?: string | null; inciCausCntn?: string | null } };
    const v = json.view ?? {};
    const clean = (s?: string | null) => (s ?? '').replace(/\r\n/g, '\n').trim();
    return { summary: clean(v.inciMainCntn), cause: clean(v.inciCausCntn) };
}

export const nsicAccidentSource: WatchSource = {
    id: 'nsic-accidents',
    label: 'NSIC 방사선사고 사례집',
    guide: '원자력안전정보공개센터 → 정보공개 → 방사선사고',
    link: '/bulletins',
    mode: 'full',
    memberFilter: (item) => item.detail?.relevant === 'Y',
    notifyMembers: false, // 회원 알림은 bulletins 게시(관리자) 시점에 — 감시 단계에선 관리자 텔레그램만
    fetchItems: () => fetchNsicItems(),
};
