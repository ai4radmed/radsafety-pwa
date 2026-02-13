
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { supabase } from '../lib/supabase';
import { sendVerificationEmail } from '../lib/email';

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
                const { data, error } = await supabase
                    .from('findings')
                    .update({
                        title,
                        finding_type: findingType,
                        tags,
                        year,
                        description,
                        violation_clause: violationClause,
                        solution
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw new Error(error.message);
                return data;
            } else {
                // Insert new record
                const { data, error } = await supabase
                    .from('findings')
                    .insert({
                        title,
                        finding_type: findingType,
                        tags,
                        year,
                        description,
                        violation_clause: violationClause,
                        solution
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

            const { error } = await supabase
                .from('findings')
                .delete()
                .eq('id', id);

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
                console.log('[sendVerificationCode] Starting for user:', userId, 'email:', email);

                // Generate 6-digit code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

                console.log('[sendVerificationCode] Generated code:', code);

                // Store code in database
                const { data: insertData, error } = await supabase
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
                    console.error('[sendVerificationCode] Insert error:', error);
                    throw new Error('코드 생성 실패: ' + error.message);
                }

                console.log('[sendVerificationCode] Insert successful:', insertData);

                // Send email with verification code
                try {
                    await sendVerificationEmail({
                        to: email,
                        code,
                        userName: '사용자', // TODO: 실제 사용자 이름을 프로필에서 가져오기
                    });
                    console.log('[sendVerificationCode] Email sent to:', email);
                } catch (emailError) {
                    console.error('[sendVerificationCode] Email send failed:', emailError);
                    // 이메일 발송 실패해도 DB에는 저장되었으므로 성공으로 처리
                    // 실제 프로덕션에서는 재시도 로직 또는 에러 처리 필요
                }

                return { success: true, message: '인증 코드가 발송되었습니다.' };
            } catch (error) {
                console.error('[sendVerificationCode] Caught error:', error);
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
                console.log('[verifyEmailCode] Starting for user:', userId, 'code:', code);

                // Find valid code
                const { data, error } = await supabase
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
                    console.error('[verifyEmailCode] Code not found or error:', error);
                    throw new Error('유효하지 않거나 만료된 코드입니다.');
                }

                console.log('[verifyEmailCode] Code found:', data);

                // Mark as verified
                const { error: updateError } = await supabase
                    .from('email_verification_codes')
                    .update({
                        verified: true,
                        verified_at: new Date().toISOString(),
                    })
                    .eq('id', data.id);

                if (updateError) {
                    console.error('[verifyEmailCode] Update error:', updateError);
                    throw new Error('검증 처리 실패');
                }

                console.log('[verifyEmailCode] Verification successful');

                return {
                    success: true,
                    email: data.email,
                    message: '이메일이 성공적으로 검증되었습니다.',
                };
            } catch (error) {
                console.error('[verifyEmailCode] Caught error:', error);
                throw error;
            }
        },
    }),
};
