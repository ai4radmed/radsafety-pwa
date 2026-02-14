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

interface SendFeedbackEmailOptions {
    adminEmails: string[];
    userName: string;
    userEmail: string;
    title: string;
    message: string;
    feedbackId: string;
    attachments?: Array<{
        filename: string;
        storage_path: string;
        size: number;
    }>;
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
            from: '방사선안전관리통합시스템 <noreply@radsafety.kr>',
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

/**
 * 의견보내기 이메일 발송 (관리자에게)
 */
export async function sendFeedbackEmail({
    adminEmails,
    userName,
    userEmail,
    title,
    message,
    feedbackId,
    attachments,
}: SendFeedbackEmailOptions) {
    try {
        const apiKey = import.meta.env.RESEND_API_KEY;

        // API Key가 없으면 개발 모드 (콘솔만)
        if (!apiKey) {
            console.log(`[DEV] Feedback email to admins`);
            console.log(`[DEV] From: ${userName} (${userEmail})`);
            console.log(`[DEV] Title: ${title}`);
            console.log(`[DEV] Message: ${message}`);
            console.log(`[DEV] Feedback ID: ${feedbackId}`);
            console.log(`[DEV] Attachments: ${attachments?.length || 0} files`);
            return { success: true, messageId: 'dev-mode' };
        }

        // 프로덕션: 실제 이메일 발송
        const resend = new Resend(apiKey);

        const fromEmail = 'noreply@radsafety.kr';

        const emailPayload: any = {
            from: `방사선안전관리통합시스템 <${fromEmail}>`,
            to: adminEmails,
            replyTo: userEmail, // 관리자가 바로 회신 가능하도록
            subject: `[의견보내기] ${title}`,
            html: getFeedbackEmailTemplate(userName, userEmail, title, message, feedbackId, attachments),
            text: `의견보내기\n\n제목: ${title}\n보낸사람: ${userName} (${userEmail})\n\n내용:\n${message}\n\nFeedback ID: ${feedbackId}\n첨부파일: ${attachments?.length || 0}개`,
        };

        const { data, error } = await resend.emails.send(emailPayload);

        if (error) {
            console.error('[Email] Feedback send error:', error);
            throw new Error(`의견 이메일 발송 실패: ${error.message}`);
        }

        console.log('[Email] Feedback sent successfully:', data?.id);
        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('[Email] Feedback unexpected error:', error);
        throw error;
    }
}

/**
 * 의견보내기 이메일 HTML 템플릿
 */
function getFeedbackEmailTemplate(
    userName: string,
    userEmail: string,
    title: string,
    message: string,
    feedbackId: string,
    attachments?: Array<{ filename: string; storage_path: string; size: number }>
): string {
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const adminUrl = `${baseUrl}/admin/feedback`;

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>의견보내기</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb; background-color: #3b82f6;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                💬 의견보내기
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- From -->
                            <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">보낸사람</p>
                                <p style="margin: 0; color: #1f2937; font-size: 16px;">
                                    <strong>${userName}</strong>
                                </p>
                                <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">
                                    ${userEmail}
                                </p>
                            </div>

                            <!-- Title -->
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">제목</p>
                                <p style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 700;">
                                    ${title}
                                </p>
                            </div>

                            <!-- Message -->
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">내용</p>
                                <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                                </div>
                            </div>

                            ${attachments && attachments.length > 0 ? `
                            <!-- Attachments -->
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">첨부파일 (${attachments.length}개)</p>
                                <div style="padding: 15px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fde047;">
                                    ${attachments.map(att => {
                                        const sizeKB = (att.size / 1024).toFixed(1);
                                        return `
                                        <div style="padding: 8px 0;">
                                            <span style="color: #92400e; font-size: 14px;">📎 ${att.filename}</span>
                                            <span style="color: #92400e; font-size: 12px; margin-left: 8px;">(${sizeKB} KB)</span>
                                        </div>
                                    `;
                                    }).join('')}
                                </div>
                                <p style="margin: 10px 0 0; color: #6b7280; font-size: 12px;">
                                    ℹ️ 첨부파일은 관리 페이지에서 다운로드할 수 있습니다.
                                </p>
                            </div>
                            ` : ''}

                            <!-- Admin Link -->
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                    관리 페이지에서 확인하기
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                                이 메일에 바로 회신하시면 사용자에게 답변이 전달됩니다.<br>
                                Feedback ID: ${feedbackId}
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
