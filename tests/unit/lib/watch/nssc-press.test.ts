import { describe, it, expect, vi } from 'vitest';
import {
    normalizeNsscRows,
    fetchNsscItems,
    isRelevantPress,
    pressUrl,
    nsscPressSource,
    NSSC_LIST_URL,
    type NsscRow,
} from '../../../../src/lib/watch/sources/nssc-press';

// 2026-09-20 실측 응답(data.list[]) 축약 픽스처.
const row = (over: Partial<NsscRow> = {}): NsscRow => ({
    BBS_SEQ: '47038',
    SUBJECT: '원안위, 연구용 원자로 ‘하나로’ 재가동 승인',
    WRITE_DATE: '2026.09.18',
    DEPT_NM: '원자력안전과',
    FILE_CNT: '2',
    PUBLIC_NURI_GBN: 'N0104',
    ...over,
});

describe('watch/sources nssc-press', () => {
    it('BBS_SEQ 를 키로, 직접 주소·게시일·관련 여부를 detail 에 넣는다', () => {
        const [it1] = normalizeNsscRows({ data: { list: [row()] } });
        expect(it1.externalId).toBe('47038');
        expect(it1.category).toBe('원자력안전과');
        expect(it1.detail).toEqual({
            writeDate: '2026.09.18',
            url: pressUrl('47038'),
            relevant: 'N',
        });
        expect(pressUrl('47038')).toBe(
            'https://www.nssc.go.kr/ko/cms/FR_BBS_CON/BoardView.do?MENU_ID=190&CONTENTS_NO=1&SITE_NO=2&BOARD_SEQ=5&BBS_SEQ=47038',
        );
    });

    it('관련 판정 — 부서가 주 기준, 제목 키워드는 보조', () => {
        expect(isRelevantPress({ DEPT_NM: '방사선안전과', SUBJECT: '아무 제목' })).toBe(true);
        expect(isRelevantPress({ DEPT_NM: '방사성폐기물안전과', SUBJECT: '아무 제목' })).toBe(true);
        expect(isRelevantPress({ DEPT_NM: '기획재정담당관', SUBJECT: '제2026-14회 원자력안전위원회 개최' })).toBe(
            false,
        );
        expect(isRelevantPress({ DEPT_NM: '원자력안전과', SUBJECT: '병원 방사선동위원소 분실 사건 조사 착수' })).toBe(
            true,
        );
        expect(isRelevantPress({ DEPT_NM: '국제협력담당관', SUBJECT: 'IAEA 총회 참석' })).toBe(false);
        // '방사선' 단독은 원전 방재훈련까지 끌어오므로 관련 아님(2026-09-20 실측 잡음)
        expect(
            isRelevantPress({ DEPT_NM: '방재환경과', SUBJECT: '원전 동시 방사선 비상에도 철저히 대비 연합훈련 실시' }),
        ).toBe(false);
    });

    it('지문은 제목·게시일·첨부수·공공누리 — 본문(CONTENTS)은 쓰지 않는다', () => {
        const base = normalizeNsscRows({ data: { list: [row()] } })[0].fingerprint;
        const fp = (over: Partial<NsscRow>) => normalizeNsscRows({ data: { list: [row(over)] } })[0].fingerprint;
        expect(fp({ FILE_CNT: '3' })).not.toBe(base);
        expect(fp({ SUBJECT: '수정된 제목' })).not.toBe(base);
        expect(fp({ DEPT_NM: '다른 부서' })).toBe(base);
    });

    it('fetch 는 목록 XHR 에 POST 하고, data.list 가 없으면 throw', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { list: [row()] } }) });
        const items = await fetchNsscItems(fetchMock as unknown as typeof fetch);
        expect(items).toHaveLength(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(NSSC_LIST_URL);
        expect(String(init.body)).toContain('MENU_ID=190');
        expect(String(init.body)).toContain('BOARD_SEQ=5');

        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
        await expect(fetchNsscItems(fetchMock as unknown as typeof fetch)).rejects.toThrow('형식 불일치');
        fetchMock.mockResolvedValue({ ok: false, status: 500 });
        await expect(fetchNsscItems(fetchMock as unknown as typeof fetch)).rejects.toThrow('HTTP 500');
    });

    it('소스 메타 — window 모드 + 회원 필터(relevant=Y 만)', () => {
        expect(nsscPressSource.id).toBe('nssc-press');
        expect(nsscPressSource.mode).toBe('window');
        const [rel] = normalizeNsscRows({ data: { list: [row({ DEPT_NM: '방사선안전과' })] } });
        const [irr] = normalizeNsscRows({ data: { list: [row()] } });
        expect(nsscPressSource.memberFilter!(rel)).toBe(true);
        expect(nsscPressSource.memberFilter!(irr)).toBe(false);
    });
});
