import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    normalizeSosRows,
    fetchSosItems,
    kinsSosSource,
    KINS_SOS_LIST_URL,
    type SosRow,
} from '../../../../src/lib/watch/sources/kins-sos';
import {
    normalizePubRows,
    fetchPubItems,
    kinsPubSource,
    KINS_PUB_LIST_URL,
    type PubRow,
} from '../../../../src/lib/watch/sources/kins-pub';

// 2026-09-20 실측 응답 형태를 축약한 픽스처.
const sosRow = (over: Partial<SosRow> = {}): SosRow => ({
    writNo: '28',
    mngNo: '2.001',
    writTitl: '규제면제 대상 밀봉된 방사성동위원소 …',
    bdtxtCntn: '<p>본문</p>',
    questtypcd: '허가/신고',
    questtypcds: '규제대상',
    oppbYn: 'Y',
    opertnDt: '2020/06/30',
    exprDt: '',
    ...over,
});

const pubRow = (over: Partial<PubRow> = {}): PubRow => ({
    pblcClNo: 'CAT0000004',
    pblcClSn: '6',
    pblcClNm: '원자력안전법령집/고시집',
    pblcTitl: '원자력안전 고시집 (2026년)',
    atchFileId: 'FILE_000000015809402',
    atchFileIdPdf: '2026090116185900',
    delYn: 'N',
    lastUpdtDttm: '2026-09-01 16:18:59.0',
    wdtbDt: '2026-09-01',
    ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe('watch/sources kins-sos', () => {
    it('writNo 를 키로, 본문은 지문에만 쓰고 저장하지 않는다', () => {
        const [it1] = normalizeSosRows({ pageInfo: { rowCount: 1 }, faqList: [sosRow()] });
        expect(it1.externalId).toBe('28');
        expect(it1.title).toContain('규제면제');
        expect(it1.category).toBe('허가/신고 · 규제대상');
        expect(it1.detail).toEqual({ mngNo: '2.001', opertnDt: '2020/06/30' });
        expect(JSON.stringify(it1)).not.toContain('본문');
        expect(it1.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('본문·제목·공개여부·만료일이 바뀌면 지문이 바뀐다, 관리번호만 바뀌면 안 바뀐다', () => {
        const base = normalizeSosRows({ faqList: [sosRow()] })[0].fingerprint;
        const fp = (over: Partial<SosRow>) => normalizeSosRows({ faqList: [sosRow(over)] })[0].fingerprint;
        expect(fp({ bdtxtCntn: '다른 본문' })).not.toBe(base);
        expect(fp({ writTitl: '다른 제목' })).not.toBe(base);
        expect(fp({ oppbYn: 'N' })).not.toBe(base);
        expect(fp({ exprDt: '2027/01/01' })).not.toBe(base);
        expect(fp({ mngNo: '9.999' })).toBe(base);
    });

    it('rowCount 와 실제 건수가 다르면(잘린 응답) throw — 삭제 오판 방지', () => {
        expect(() => normalizeSosRows({ pageInfo: { rowCount: 158 }, faqList: [sosRow()] })).toThrow('불일치');
    });

    it('fetch 는 목록 API 에 POST 하고 HTTP 오류는 throw', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ pageInfo: { rowCount: 1 }, faqList: [sosRow()] }),
        });
        const items = await fetchSosItems(fetchMock as unknown as typeof fetch);
        expect(items).toHaveLength(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(KINS_SOS_LIST_URL);
        expect(init.method).toBe('POST');
        expect(String(init.body)).toContain('menuNo=70000011');

        fetchMock.mockResolvedValue({ ok: false, status: 503 });
        await expect(fetchSosItems(fetchMock as unknown as typeof fetch)).rejects.toThrow('HTTP 503');
    });

    it('소스 메타 — id·안내 경로·앱 링크', () => {
        expect(kinsSosSource.id).toBe('kins-sos');
        expect(kinsSosSource.guide).toContain('방사선규제해석SOS');
        expect(kinsSosSource.link).toBe('/kins');
    });
});

describe('watch/sources kins-pub', () => {
    it('분류번호-순번을 키로, 첨부 id·수정일시가 지문에 들어간다', () => {
        const [it1] = normalizePubRows({ pageInfo: { rowCount: 1 }, pblcList: [pubRow()] });
        expect(it1.externalId).toBe('CAT0000004-6');
        expect(it1.category).toBe('원자력안전법령집/고시집');
        expect(it1.detail).toEqual({ wdtbDt: '2026-09-01' });
        const base = it1.fingerprint;
        const fp = (over: Partial<PubRow>) => normalizePubRows({ pblcList: [pubRow(over)] })[0].fingerprint;
        expect(fp({ atchFileIdPdf: '2027010100000000' })).not.toBe(base);
        expect(fp({ lastUpdtDttm: '2027-01-01 00:00:00.0' })).not.toBe(base);
        expect(fp({ wdtbDt: '2027-01-01' })).toBe(base);
    });

    it('delYn=Y 행은 목록에서 뺀다(삭제로 감지되게)', () => {
        const items = normalizePubRows({
            pageInfo: { rowCount: 2 },
            pblcList: [pubRow(), pubRow({ pblcClSn: '7', delYn: 'Y' })],
        });
        expect(items.map((i) => i.externalId)).toEqual(['CAT0000004-6']);
    });

    it('fetch 는 목록 API 에 POST', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ pageInfo: { rowCount: 1 }, pblcList: [pubRow()] }),
        });
        await fetchPubItems(fetchMock as unknown as typeof fetch);
        expect(fetchMock.mock.calls[0][0]).toBe(KINS_PUB_LIST_URL);
        expect(String(fetchMock.mock.calls[0][1].body)).toContain('prmDclrDivCd=RSP');
        expect(kinsPubSource.id).toBe('kins-pub');
    });
});
