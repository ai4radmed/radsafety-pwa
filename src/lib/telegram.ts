/**
 * 서버 전용 텔레그램 발송. 명세: .spec/src/lib/telegram.md
 * 자격은 Vercel env TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (PUBLIC_ 접두 금지 — 클라이언트 번들 유출).
 * GitHub Actions 의 scripts/health-report.mjs 와 같은 봇·같은 방을 쓴다.
 */

import { createLogger } from './logger';

const logger = createLogger('telegram');

// Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있다(health.ts 와 같은 함정 —
// 2026-09-20 cron 실행에서 "자격 미설정" 으로 실측). process.env 로 폴백한다.
function envVar(name: 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID'): string | undefined {
    return import.meta.env[name] || (typeof process !== 'undefined' ? process.env[name] : undefined);
}

export function isTelegramConfigured(): boolean {
    return Boolean(envVar('TELEGRAM_BOT_TOKEN') && envVar('TELEGRAM_CHAT_ID'));
}

/**
 * @returns true 발송됨 / false 자격 미설정 또는 SUBMISSION_ALERT=off 로 생략. HTTP 오류는 throw.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
    const token = envVar('TELEGRAM_BOT_TOKEN');
    const chatId = envVar('TELEGRAM_CHAT_ID');
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
