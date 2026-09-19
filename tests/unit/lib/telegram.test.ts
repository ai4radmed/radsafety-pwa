import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { sendTelegramMessage, isTelegramConfigured } from '../../../src/lib/telegram';

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('lib/telegram', () => {
    it('자격 미설정이면 발송하지 않고 false', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
        vi.stubEnv('TELEGRAM_CHAT_ID', '');
        expect(isTelegramConfigured()).toBe(false);
        expect(await sendTelegramMessage('hi')).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('자격이 있으면 sendMessage 로 POST 하고 true', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', 'tok');
        vi.stubEnv('TELEGRAM_CHAT_ID', '123');
        fetchMock.mockResolvedValue({ ok: true });

        expect(isTelegramConfigured()).toBe(true);
        expect(await sendTelegramMessage('hello')).toBe(true);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.telegram.org/bottok/sendMessage');
        expect(JSON.parse(init.body)).toEqual({ chat_id: '123', text: 'hello', disable_web_page_preview: true });
    });

    it('HTTP 오류는 throw (조용히 넘기지 않는다)', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', 'tok');
        vi.stubEnv('TELEGRAM_CHAT_ID', '123');
        fetchMock.mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
        await expect(sendTelegramMessage('x')).rejects.toThrow('HTTP 401');
    });
});
