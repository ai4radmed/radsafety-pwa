/**
 * 서버 전용 텔레그램 발송. 명세: .spec/src/lib/telegram.md
 * 자격은 Vercel env TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (PUBLIC_ 접두 금지 — 클라이언트 번들 유출).
 * GitHub Actions 의 scripts/health-report.mjs 와 같은 봇·같은 방을 쓴다.
 */

import { createLogger } from './logger';

const logger = createLogger('telegram');

export function isTelegramConfigured(): boolean {
    return Boolean(import.meta.env.TELEGRAM_BOT_TOKEN && import.meta.env.TELEGRAM_CHAT_ID);
}

/**
 * @returns true 발송됨 / false 자격 미설정 또는 SUBMISSION_ALERT=off 로 생략. HTTP 오류는 throw.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
    const token = import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        logger.info('텔레그램 자격 미설정 — 발송 생략');
        return false;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        // 토큰·chat_id 오류를 조용히 넘기면 "조용하니 정상"이라는 착각이 생긴다(health-report 와 같은 원칙).
        throw new Error(`텔레그램 발송 실패: HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    return true;
}
