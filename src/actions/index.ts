import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase-server';
import { sendVerificationEmail, sendFeedbackEmail } from '../lib/email';
import { resolveFeedbackRecipients } from '../config/auth';
import { createLogger } from '../lib/logger';
import { sendPushToUsers } from '../lib/push';

const logger = createLogger('actions');

// 서버 전용 env(쉼표 구분) — 테스트성 의견([월간점검] + 관리자 발신)의 수신자.
// 미설정이면 resolveFeedbackRecipients 가 종전대로 관리자 전원에게 보낸다.
const DEVELOPER_EMAILS = (import.meta.env.DEVELOPER_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

export const server = {
    saveFinding: defineAction({
        accept: 'form',
        input: z.object({
            id: z.string().optional(),
            title: z.string(),
            findingType: z.enum(['지적', '권고']),
            tags: z.array(z.string()),
            year: z.string(),
            description: z.string(),
            violationClause: z.string().optional(),
            solution: z.string().optional(),
        }),
        handler: async (input) => {
            const { id, title, findingType, tags, year, description, violationClause, solution } = input;

            if (id && !id.startsWith('local-')) {
                // Update existing record
                const { data, error } = await supabaseAnon
                    .from('findings')
                    .update({
                        title,
                        finding_type: findingType,
                        tags,
                        year,
                        description,
                        violation_clause: violationClause,
                        solution,
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw new Error(error.message);
                return data;
            } else {
                // Insert new record
                const { data, error } = await supabaseAnon
                    .from('findings')
                    .insert({
                        title,
                        finding_type: findingType,
                        tags,
                        year,
                        description,
                        violation_clause: violationClause,
                        solution,
                    })
                    .select()
                    .single();

                if (error) throw new Error(error.message);
                return data;
            }
        },
    }),

    deleteFinding: defineAction({
        input: z.object({
            id: z.string(),
        }),
        handler: async ({ id }) => {
            if (id.startsWith('local-')) return { success: true };

            const { error } = await supabaseAnon.from('findings').delete().eq('id', id);

            if (error) throw new Error(error.message);
            return { success: true };
        },
    }),

    // Email Verification Actions
    sendVerificationCode: defineAction({
        input: z.object({
            email: z.string().email(),
            userId: z.string().uuid(),
        }),
        handler: async ({ email, userId }) => {
            try {
                logger.info('인증코드 발송 시작', { userId, email });

                // Generate 6-digit code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

                // Store code in database using admin client to bypass RLS
                const { data: insertData, error } = await supabaseAdmin
                    .from('email_verification_codes')
                    .insert({
                        user_id: userId,
                        email,
                        code,
                        expires_at: expiresAt.toISOString(),
                    })
                    .select()
                    .single();

                if (error) {
                    logger.error('인증코드 DB 저장 실패', { error });
                    throw new Error(
                        `코드 생성 실패 (${error.code}): ${error.message}${error.details ? ' - ' + error.details : ''}`,
                        { cause: error },
                    );
                }

                logger.info('인증코드 DB 저장 성공', { id: insertData?.id });

                // 사용자 이름 가져오기
                const { data: userProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('real_name, nickname')
                    .eq('id', userId)
                    .single();

                const userName = userProfile?.real_name || userProfile?.nickname || '사용자';

                // Send email with verification code
                try {
                    await sendVerificationEmail({
                        to: email,
                        code,
                        userName,
                    });
                    logger.info('인증 이메일 발송 성공', { email });
                } catch (emailError) {
                    logger.error('인증 이메일 발송 실패', { error: emailError });
                    throw new Error('이메일 발송에 실패했습니다: ' + (emailError as Error).message, {
                        cause: emailError,
                    });
                }

                return { success: true, message: '인증 코드가 발송되었습니다.' };
            } catch (error) {
                logger.error('인증코드 발송 실패', { error });
                throw error;
            }
        },
    }),

    verifyEmailCode: defineAction({
        input: z.object({
            code: z.string().length(6),
            userId: z.string().uuid(),
        }),
        handler: async ({ code, userId }) => {
            try {
                logger.info('이메일 코드 검증 시작', { userId });

                // Find valid code using admin client
                const { data, error } = await supabaseAdmin
                    .from('email_verification_codes')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('code', code)
                    .eq('verified', false)
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !data) {
                    logger.error('인증코드 조회 실패', { error });
                    throw new Error('유효하지 않거나 만료된 코드입니다.');
                }

                logger.info('인증코드 조회 성공', { id: data.id });

                // Mark as verified using admin client
                const { error: updateError } = await supabaseAdmin
                    .from('email_verification_codes')
                    .update({
                        verified: true,
                        verified_at: new Date().toISOString(),
                    })
                    .eq('id', data.id);

                if (updateError) {
                    logger.error('인증코드 검증 업데이트 실패', { error: updateError });
                    throw new Error('검증 처리 실패');
                }

                logger.info('이메일 검증 완료', { userId, email: data.email });

                return {
                    success: true,
                    email: data.email,
                    message: '이메일이 성공적으로 검증되었습니다.',
                };
            } catch (error) {
                logger.error('이메일 코드 검증 실패', { error });
                throw error;
            }
        },
    }),

    // Send Notification Action
    sendNotification: defineAction({
        input: z.object({
            senderId: z.string().uuid(),
            targetType: z.enum(['all', 'provider', 'verification_status', 'specific']),
            provider: z.enum(['kakao', 'email']).optional(),
            verificationStatus: z.enum(['none', 'list', 'temp_verified', 'verified']).optional(),
            specificUserId: z.string().uuid().optional(),
            title: z.string().min(1),
            message: z.string().min(1),
            link: z.string().optional(),
            actionLabel: z.string().optional(),
            actionUrl: z.string().optional(),
        }),
        handler: async (input) => {
            try {
                // Check if sender is admin
                const { data: profile, error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', input.senderId)
                    .single();

                if (profileError || !profile) {
                    throw new Error('사용자를 찾을 수 없습니다.');
                }

                if (!profile.is_admin) {
                    throw new Error('관리자 권한이 필요합니다.');
                }

                // Get target users
                let query = supabaseAdmin.from('profiles').select('id');

                if (input.targetType === 'specific' && input.specificUserId) {
                    query = query.eq('id', input.specificUserId);
                } else if (input.targetType === 'provider' && input.provider) {
                    query = query.eq('provider', input.provider);
                } else if (input.targetType === 'verification_status' && input.verificationStatus) {
                    query = query.eq('verification_status', input.verificationStatus);
                }
                // 'all' type doesn't add any filters

                const { data: users, error: usersError } = await query;

                if (usersError) throw usersError;
                if (!users || users.length === 0) {
                    throw new Error('대상 사용자가 없습니다.');
                }

                // Create notifications for all target users
                const notifications = users.map((u) => ({
                    user_id: u.id,
                    sender_id: input.senderId,
                    type: 'admin_message',
                    priority: 'normal',
                    title: input.title,
                    message: input.message,
                    link: input.link || null,
                    action_label: input.actionLabel || null,
                    action_url: input.actionUrl || null,
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    is_read: false,
                    created_at: new Date().toISOString(),
                }));

                const { error: insertError } = await supabaseAdmin.from('notifications').insert(notifications);

                if (insertError) throw insertError;

                // 웹 푸시 발송 (실패해도 알림 생성은 완료된 것으로 처리)
                const userIds = users.map((u) => u.id);
                sendPushToUsers(userIds, {
                    title: input.title,
                    body: input.message,
                    url: input.link || '/notifications',
                    tag: 'admin_message',
                }).catch((err) => logger.error('관리자 웹 푸시 발송 오류', { err }));

                return {
                    success: true,
                    count: users.length,
                    message: `${users.length}명에게 알림을 발송했습니다.`,
                };
            } catch (error) {
                logger.error('알림 발송 실패', { error });
                throw error;
            }
        },
    }),

    // Send Feedback Action
    sendFeedback: defineAction({
        input: z.object({
            userId: z.string().uuid().optional(),
            userName: z.string().min(1),
            userEmail: z.string().email(),
            title: z.string().min(1, '제목을 입력해주세요.'),
            message: z.string().min(10, '의견 내용은 최소 10자 이상 입력해주세요.'),
            attachments: z
                .array(
                    z.object({
                        filename: z.string(),
                        storage_path: z.string(),
                        size: z.number(),
                    }),
                )
                .optional(),
        }),
        handler: async (input) => {
            try {
                // Use userId from input (passed from client)
                const userId = input.userId || null;

                // Insert feedback into database
                const { data: feedback, error: insertError } = await supabaseAdmin
                    .from('feedback')
                    .insert({
                        user_id: userId,
                        user_name: input.userName,
                        user_email: input.userEmail,
                        title: input.title,
                        message: input.message,
                        attachments: input.attachments || [],
                        status: 'reviewing',
                    })
                    .select()
                    .single();

                if (insertError) {
                    logger.error('피드백 DB 저장 실패', { error: insertError });
                    throw new Error('의견 저장에 실패했습니다.');
                }

                // Send email notification to admins
                try {
                    await sendFeedbackEmail({
                        adminEmails: resolveFeedbackRecipients(input.title, input.userEmail, DEVELOPER_EMAILS),
                        userName: input.userName,
                        userEmail: input.userEmail,
                        title: input.title,
                        message: input.message,
                        feedbackId: feedback.id,
                        attachments: input.attachments,
                    });
                } catch (emailError) {
                    logger.error('피드백 이메일 발송 실패', { error: emailError });
                    // Don't fail the whole operation if email fails - data is saved
                }

                return {
                    success: true,
                    message: '의견이 성공적으로 전송되었습니다. 감사합니다!',
                };
            } catch (error) {
                logger.error('피드백 전송 실패', { error });
                throw new Error('의견 전송에 실패했습니다. 잠시 후 다시 시도해주세요.', { cause: error });
            }
        },
    }),

    // Admin Verification Actions
    approveVerification: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
        }),
        handler: async ({ adminId, targetUserId }) => {
            try {
                logger.info('인증 승인 처리 시작', { adminId, targetUserId });

                // 1. Check if requester is admin
                const { data: adminProfile, error: adminError } = await supabaseAdmin
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', adminId)
                    .single();

                if (adminError || !adminProfile?.is_admin) {
                    throw new Error('관리자 권한이 필요합니다.');
                }

                // 2. Update Profile using admin client to bypass RLS
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update({ verification_status: 'verified' })
                    .eq('id', targetUserId);

                if (profileError) throw profileError;

                // 3. Update Verification Request
                const { error: requestError } = await supabaseAdmin
                    .from('verification_requests')
                    .update({
                        verification_status: 'approved',
                        approved_at: new Date().toISOString(),
                    })
                    .eq('user_id', targetUserId);

                if (requestError) logger.warn('인증 요청 내역 업데이트 실패', { error: requestError });

                return { success: true, message: '인증 승인이 완료되었습니다.' };
            } catch (error) {
                logger.error('인증 승인 중 오류 발생', { error });
                throw error;
            }
        },
    }),

    rejectVerification: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
            reason: z.string(),
        }),
        handler: async ({ adminId, targetUserId, reason }) => {
            try {
                logger.info('인증 반려 처리 시작', { adminId, targetUserId });

                // Check admin
                const { data: adminProfile, error: adminError } = await supabaseAdmin
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', adminId)
                    .single();

                if (adminError || !adminProfile?.is_admin) {
                    throw new Error('관리자 권한이 필요합니다.');
                }

                // Update Profile
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update({ verification_status: 'rejected' })
                    .eq('id', targetUserId);

                if (profileError) throw profileError;

                // Update Request
                const { error: requestError } = await supabaseAdmin
                    .from('verification_requests')
                    .update({
                        verification_status: 'rejected',
                        rejected_at: new Date().toISOString(),
                        reject_reason: reason,
                    })
                    .eq('user_id', targetUserId);

                if (requestError) logger.warn('인증 요청 반려 내역 업데이트 실패', { error: requestError });

                return { success: true, message: '인증 반려 처리가 완료되었습니다.' };
            } catch (error) {
                logger.error('인증 반려 중 오류 발생', { error });
                throw error;
            }
        },
    }),

    revokeVerification: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
        }),
        handler: async ({ adminId, targetUserId }) => {
            try {
                logger.info('인증 취소(회수) 처리 시작', { adminId, targetUserId });

                // Check admin
                const { data: adminProfile, error: adminError } = await supabaseAdmin
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', adminId)
                    .single();

                if (adminError || !adminProfile?.is_admin) {
                    throw new Error('관리자 권한이 필요합니다.');
                }

                // Update Profile to temp_verified
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update({ verification_status: 'temp_verified' })
                    .eq('id', targetUserId);

                if (profileError) throw profileError;

                // Update Request
                const { error: requestError } = await supabaseAdmin
                    .from('verification_requests')
                    .update({
                        verification_status: 'pending',
                        approved_at: null, // Clear approval time
                    })
                    .eq('user_id', targetUserId);

                if (requestError) logger.warn('인증 요청 회수 내역 업데이트 실패', { error: requestError });

                return { success: true, message: '인증 회수 처리가 완료되었습니다.' };
            } catch (error) {
                logger.error('인증 회수 중 오류 발생', { error });
                throw error;
            }
        },
    }),
};
