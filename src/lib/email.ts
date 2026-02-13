/**
 * 이메일 발송 유틸리티
 * Resend를 사용한 간단한 이메일 전송
 */

import { Resend } from 'resend';

interface SendVerificationEmailOptions {
    to: string;
    code: string;
    userName?: string;
}

/**
 * 이메일 인증 코드 발송
 */
export async function sendVerificationEmail({
    to,
    code,
    userName = '사용자',
}: SendVerificationEmailOptions) {
    try {
        // 환경 확인 (API Key 유무로 판단)
        // Astro에서는 import.meta.env 사용 (process.env는 작동하지 않음)
        const apiKey = import.meta.env.RESEND_API_KEY;

        // API Key가 없으면 개발 모드 (콘솔만)
        if (!apiKey) {
            console.log(`[DEV] Verification email to ${to}`);
            console.log(`[DEV] Code: ${code}`);
            return { success: true, messageId: 'dev-mode' };
        }

        // 프로덕션: 실제 이메일 발송
        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
            from: '방사선안전관리통합시스템 <noreply@resend.dev>', // Resend 기본 도메인 사용
            to: [to],
            subject: '[방사선안전] 이메일 인증 코드',
            html: getEmailTemplate(code, userName),
            text: `안녕하세요, ${userName}님!\n\n이메일 인증 코드: ${code}\n\n이 코드는 10분간 유효합니다.\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.`,
        });

        if (error) {
            console.error('[Email] Send error:', error);
            throw new Error(`이메일 발송 실패: ${error.message}`);
        }

        console.log('[Email] Sent successfully:', data?.id);
        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('[Email] Unexpected error:', error);
        throw error;
    }
}

/**
 * 이메일 HTML 템플릿
 */
function getEmailTemplate(code: string, userName: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>이메일 인증</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                방사선안전관리통합시스템
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                                안녕하세요, <strong>${userName}</strong>님!
                            </p>
                            <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                이메일 인증을 위한 6자리 코드입니다. 아래 코드를 입력창에 입력해주세요.
                            </p>

                            <!-- Verification Code Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px; background-color: #f9fafb; border-radius: 8px;">
                                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace;">
                                            ${code}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                ⏰ 이 코드는 <strong>10분간</strong> 유효합니다.<br>
                                🔒 본인이 요청하지 않았다면 이 메일을 무시하세요.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                                본 메일은 발신 전용입니다. 문의사항은 시스템 관리자에게 연락해주세요.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
