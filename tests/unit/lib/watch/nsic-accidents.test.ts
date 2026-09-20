import { describe, it, expect, vi } from 'vitest';
import {
    parseNsicList,
    toWatchItem,
    isRelevantAccident,
    fetchNsicItems,
    fetchNsicDetail,
    nsicAccidentSource,
    NSIC_LIST_URL,
    NSIC_DETAIL_URL,
} from '../../../../src/lib/watch/sources/nsic-accidents';

// 2026-09-20 실측 목록 HTML 조각(헤더 행 + 데이터 행) 축약.
const LIST_HTML = `
<table><thead><tr><th>사고일자</th><th>사고등급</th><th>[분류] 사고명</th><th>[지역]</th><th>사고기관</th></tr></thead>
<tbody class="listTbody">
<tr>
  <td>2026-08-02</td><td>(0등급)</td>
  <td class="tl lineCut"><a href="javascript:gotoDtl('EXMN260803_000613')">[화재]방사선발생장치 사용시설 화재 사건</a></td>
  <td>[전북]</td><td>(주)OOOOOOOO-OO공장</td>
</tr>
<tr>
  <td>2026-02-20</td><td>(0등급)</td>
  <td class="tl lineCut"><a href="javascript:gotoDtl('EXMN260225_000581')">[분실]치료용 전자 선형가속기 방사화 부품 분실 사건</a></td>
  <td>[경기]</td><td>OO대학교병원</td>
</tr>
</tbody></table>`;

describe('watch/sources nsic-accidents', () => {
    it('목록 HTML 을 행으로 파싱 — 헤더는 건너뛰고 [분류] 를 분리한다', () => {
        const rows = parseNsicList(LIST_HTML);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual({
            id: 'EXMN260803_000613',
            occurredAt: '2026-08-02',
            grade: '(0등급)',
            type: '화재',
            title: '방사선발생장치 사용시설 화재 사건',
            region: '[전북]',
            org: '(주)OOOOOOOO-OO공장',
        });
    });

    it('관련 판정 — 기관명 병원|의료원|의원 또는 사고명 치료용|진료용|방사성의약품|환자|핵의학', () => {
        expect(isRelevantAccident({ org: 'OO대학교병원', title: '아무 사건' })).toBe(true);
        expect(isRelevantAccident({ org: 'OOOO검사', title: '방사성의약품 오투여 사건' })).toBe(true);
        expect(isRelevantAccident({ org: '(주)OOOO공장', title: '방사선투과검사 작업자 피폭 사건' })).toBe(false);
    });

    it('WatchItem — 키 EXMN, 분류=category, detail 에 사고일·등급·지역·기관·관련', () => {
        const [, medical] = parseNsicList(LIST_HTML).map(toWatchItem);
        expect(medical.externalId).toBe('EXMN260225_000581');
        expect(medical.category).toBe('분실');
        expect(medical.detail).toMatchObject({
            occurredAt: '2026-02-20',
            grade: '(0등급)',
            region: '[경기]',
            org: 'OO대학교병원',
            relevant: 'Y',
        });
        expect(medical.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('목록 fetch 는 POST listNum, 0건 파싱이면 throw(구조 변경 감지)', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => LIST_HTML });
        const items = await fetchNsicItems(fetchMock as unknown as typeof fetch);
        expect(items).toHaveLength(2);
        expect(fetchMock.mock.calls[0][0]).toBe(NSIC_LIST_URL);
        expect(String(fetchMock.mock.calls[0][1].body)).toContain('listNum=');
        fetchMock.mockResolvedValue({ ok: true, text: async () => '<html>다른 구조</html>' });
        await expect(fetchNsicItems(fetchMock as unknown as typeof fetch)).rejects.toThrow('0건');
    });

    it('상세 fetch 는 개요·원인만 취하고 CRLF 를 정리한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                view: { inciMainCntn: '- 개요\r\n- 둘째 줄', inciCausCntn: '-펌프 이상', inciSummCntn: '요약' },
            }),
        });
        const d = await fetchNsicDetail('EXMN260803_000613', fetchMock as unknown as typeof fetch);
        expect(fetchMock.mock.calls[0][0]).toBe(NSIC_DETAIL_URL);
        expect(String(fetchMock.mock.calls[0][1].body)).toBe('seq=EXMN260803_000613');
        expect(d).toEqual({ summary: '- 개요\n- 둘째 줄', cause: '-펌프 이상' });
    });

    it('소스 메타 — full 모드, 회원 알림은 게시 시점(notifyMembers false)', () => {
        expect(nsicAccidentSource.id).toBe('nsic-accidents');
        expect(nsicAccidentSource.mode).toBe('full');
        expect(nsicAccidentSource.notifyMembers).toBe(false);
        expect(nsicAccidentSource.link).toBe('/bulletins');
    });
});
