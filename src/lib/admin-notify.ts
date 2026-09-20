/**
 * 관리자 업무 메일 알림. 명세: .spec/src/lib/admin-notify.md
 *
 * 왜 필요한가(2026-09-20): 관리자 업무 알림이 **앱 내 알림 + Dr. Ben 개인 텔레그램 DM** 뿐이라,
 * 개발자가 아닌 관리자(위원회 담당자)는 앱을 열어 보기 전에는 처리할 일이 생긴 줄 모른다.
 * 특히 **새 가입 신청은 알림이 아예 없었다**. 메일이 관리자에게 유일하게 밀어 넣을 수 있는 경로다.
 *
 * 개인정보 원칙: 제목·건수·분류·아이디·바로가기 링크만 싣는다. **본문·첨부·제안 내용은 넣지 않는다**
 * (텔레그램 규칙과 동일 — 익명 제안의 내용이 메일함에 남지 않게).
 */

import { Resend } from 'resend';
import { createLogger } from './logger';

const logger = createLogger('admin-notify');

const SITE = 'https://radsafety.kr';

/**
 * 수신자 — 서버 전용 `ADMIN_NOTIFY_EMAILS` 가 우선, 없으면 기존 `PUBLIC_ADMIN_EMAILS` 를 쓴다.
 * 관리자 목록을 한 곳(기존 env)에서 관리하던 흐름을 깨지 않으면서, 이메일을 클라이언트 번들에
 * 노출하고 싶지 않을 때 서버 전용 변수로 옮겨갈 수 있게 한 폴백이다(`PUBLIC_` 은 번들에 인라인된다).
 */
export function adminNotifyRecipients(): string[] {
    const env = import.meta.env;
    const proc = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
    const raw =
        env.ADMIN_NOTIFY_EMAILS ||
        proc.ADMIN_NOTIFY_EMAILS ||
        env.PUBLIC_ADMIN_EMAILS ||
        proc.PUBLIC_ADMIN_EMAILS ||
        '';
    return raw
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);
}

export interface AdminNoticeOptions {
    /** 메일 제목(대괄호 접두는 이 함수가 붙인다) */
    subject: string;
    /** 본문 줄들 — 개인정보·본문 내용 금지 */
    lines: string[];
    /** 처리 화면 경로(예: `/admin/member-approval`) */
    linkPath: string;
    /** 링크 버튼 문구 */
    linkLabel: string;
}

function template({ subject, lines, linkPath, linkLabel }: AdminNoticeOptions): string {
    const url = `${SITE}${linkPath}`;
    const body = lines.map((l) => `<p style="margin:0 0 6px;">${l}</p>`).join('');
    return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="font-size:16px;margin:0 0 12px;">${subject}</h2>
  <div style="font-size:14px;line-height:1.6;color:#334155;">${body}</div>
  <p style="margin:18px 0 0;">
    <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-size:14px;">${linkLabel}</a>
  </p>
  <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">RadSafety 관리자 알림 · 이 메일은 발신 전용입니다.</p>
</div>`;
}

/**
 * 관리자에게 업무 메일 1통. **실패해도 throw 하지 않는다** — 메일이 안 가는 것이 업무 처리(가입·제출·제안)를
 * 되돌릴 이유는 아니다. 수신자 미설정·API 키 미설정이면 조용히 건너뛴다.
 *
 * @returns 발송한 수신자 수(0 = 생략)
 */
export async function sendAdminNotice(options: AdminNoticeOptions): Promise<number> {
    try {
        const to = adminNotifyRecipients();
        if (to.length === 0) return 0;

        const apiKey = import.meta.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.info('개발모드: 관리자 알림 메일 스킵', { subject: options.subject, to: to.length });
            return 0;
        }

        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
            from: '방사선안전관리앱 <noreply@radsafety.kr>',
            to,
            subject: `[RadSafety] ${options.subject}`,
            html: template(options),
            text: `${options.subject}\n\n${options.lines.join('\n')}\n\n${SITE}${options.linkPath}`,
        });
        if (error) {
            logger.warn('관리자 알림 메일 실패', { error: error.message, subject: options.subject });
            return 0;
        }
        return to.length;
    } catch (error) {
        logger.warn('관리자 알림 메일 예외', { error });
        return 0;
    }
}
