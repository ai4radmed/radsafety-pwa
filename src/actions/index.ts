import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase-server';
import { sendFeedbackEmail } from '../lib/email';
import { resolveFeedbackRecipients } from '../config/auth';
import { createLogger } from '../lib/logger';
import { sendPushToUsers } from '../lib/push';
import { createNotification, createBulkNotifications } from '../lib/notification-helper';
import { customHospitalId, findStaticHospitalByName, getHospitalName, isKnownHospitalId } from '../lib/hospitals';

const logger = createLogger('actions');

// 서버 전용 env(쉼표 구분) — 테스트성 의견([월간점검] + 관리자 발신)의 수신자.
// 미설정이면 resolveFeedbackRecipients 가 종전대로 관리자 전원에게 보낸다.
const DEVELOPER_EMAILS = (import.meta.env.DEVELOPER_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

// Stage 1-A (username/password 로그인, privacy_redesign_plan.md 1단계) ─────────
// auth.users.email 자리에는 실제 이메일 대신 `<username>@radsafety.invalid` 파생값만 넣는다.
// .invalid 는 RFC 2606 예약 도메인 — 실발송 불가·실제 등록 불가. 미래에 진짜 이메일을
// 보관하기로 하면 이 값만 교체하면 되고 로그인 코드는 그대로다.
const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;
const usernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => USERNAME_REGEX.test(v), {
        message: '아이디는 영문 소문자·숫자·_·- 만 사용해 3~20자로 입력하세요.',
    });

function fakeEmailFor(username: string): string {
    return `${username}@radsafety.invalid`;
}

// Phase 2 (2계층+가입승인+제재 모델, KSNM 방안위 교육팀 합의 2026-09-10 승계) ──────
// 가입 시 소속기관·소속학회는 둘 다 선택 항목(자기 신고). hospitalId 는
// HospitalAutocomplete.astro 가 목록에서 클릭 확정한 값만 보내므로, 알 수 없는
// id 가 온다면 UI 우회나 데이터 꼬임 — 조용히 버리지 않고 명확히 거부한다.
// 존재 확인은 정적 목록 + hospitals_custom(DB) 라 비동기 → 스키마가 아니라 핸들러에서
// assertKnownHospitalId 로 한다(2026-09-19).
const hospitalIdSchema = z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .optional();

async function assertKnownHospitalId(hospitalId: string | null | undefined) {
    if (hospitalId && !(await isKnownHospitalId(hospitalId))) throw new Error('알 수 없는 소속기관입니다.');
}

const societySchema = z.enum(['nuclear_medicine', 'technology', 'none']).optional();

// 목록에 없는 기관(2026-09-19, Dr. Ben) — 가입자는 타이핑한 기관명 그대로 두고 그냥 진행한다:
// hospital_id 는 'other', 입력값은 hospital_request 에 남겨 관리자 검토 대상으로.
// 관리자가 hospitals.ts 에 추가·배포한 뒤 resolveHospitalRequest 로 실제 id 를 채운다.
const hospitalRequestSchema = z.string().trim().max(60, '기관명은 60자 이내로 입력하세요.').optional();

function resolveHospitalFields(hospitalId: string | null | undefined, hospitalRequest: string | undefined) {
    const request = hospitalId ? null : hospitalRequest || null;
    return {
        hospital_id: hospitalId ?? (request ? 'other' : null),
        hospital_request: request,
    };
}

// 알림 실패가 가입을 막으면 안 되므로 여기서 삼킨다(경고 로그만).
async function notifyAdminsOfHospitalRequest(username: string, request: string) {
    if (!supabaseAdmin) return;
    try {
        const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('is_admin', true);
        const ids = (admins ?? []).map((a: { id: string }) => a.id);
        if (ids.length === 0) return;
        await createBulkNotifications(ids, {
            type: 'system_notice',
            title: '🏥 회원기관 등록 요청',
            message: `@${username} 님이 목록에 없는 기관 "${request}"의 등록을 요청했습니다. 중복·적절성을 검토해 주세요.`,
            link: '/admin/member-approval',
            actionLabel: '검토하기',
            actionUrl: '/admin/member-approval',
        });
    } catch (error) {
        logger.warn('기관 등록 요청 관리자 알림 실패(가입은 정상 처리)', { error });
    }
}

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

    // Send Notification Action
    sendNotification: defineAction({
        input: z.object({
            senderId: z.string().uuid(),
            targetType: z.enum(['all', 'provider', 'specific']),
            provider: z.enum(['kakao', 'email']).optional(),
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

    // Stage 1-A — username/password 회원가입. profiles.username 확정 후 auth.users
    // 를 가짜 이메일로 생성한다. 클라이언트는 반환된 email 로 곧바로
    // supabase.auth.signInWithPassword 를 호출해 세션을 연다(기존 개발자 로그인
    // 경로와 동일 — login.astro 참조).
    signUpWithUsername: defineAction({
        input: z.object({
            username: usernameSchema,
            password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
            hospitalId: hospitalIdSchema,
            hospitalRequest: hospitalRequestSchema,
            society: societySchema,
        }),
        handler: async ({ username, password, hospitalId, hospitalRequest, society }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertKnownHospitalId(hospitalId);

            const { data: existing, error: lookupError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', username)
                .maybeSingle();
            if (lookupError) throw new Error(lookupError.message);
            if (existing) throw new Error('이미 사용 중인 아이디입니다.');

            const hospitalFields = resolveHospitalFields(hospitalId, hospitalRequest);
            const email = fakeEmailFor(username);
            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // .invalid 도메인은 확인 메일을 받을 수 없으므로 즉시 확정 처리
            });
            if (createError || !created?.user) {
                logger.error('username 회원가입: auth 계정 생성 실패', { error: createError });
                throw new Error(createError?.message || '계정 생성에 실패했습니다.');
            }

            // upsert(insert 아님) — auth.users 에 새 행이 생기면 profiles 에도 빈 행을 미리
            // 만들어 두는 DB 트리거가 있어(2026-09-16 프리뷰 테스트로 확인), 그냥 insert 하면
            // "duplicate key value violates unique constraint profiles_pkey" 로 매번 실패한다.
            // id 로 onConflict 를 지정해 트리거가 만든 행이 있으면 덮어쓰고, 없으면 새로 만든다.
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
                {
                    id: created.user.id,
                    username,
                    provider: 'email',
                    created_at: new Date().toISOString(),
                    // Phase 2 — 신규 계정은 관리자 승인 전까지 대기. 소속기관·소속학회는
                    // 자기 신고, 선택 항목(둘 다 비워도 가입 자체는 된다).
                    status: 'pending',
                    ...hospitalFields,
                    society: society ?? null,
                },
                { onConflict: 'id' },
            );
            if (profileError) {
                // 고아 auth 계정 방지 — profiles upsert 실패 시 방금 만든 계정을 되돌린다.
                await supabaseAdmin.auth.admin.deleteUser(created.user.id);
                logger.error('username 회원가입: profiles upsert 실패, auth 계정 롤백', { error: profileError });
                throw new Error(profileError.message);
            }

            if (hospitalFields.hospital_request) {
                await notifyAdminsOfHospitalRequest(username, hospitalFields.hospital_request);
            }

            return { success: true, email };
        },
    }),

    // Stage 1-A — username → email 조회만 한다. 실제 인증(signInWithPassword)은
    // 브라우저의 supabase 클라이언트가 이어서 수행 — 세션 쿠키가 정상 경로로 설정되도록.
    // "아이디 없음"과 "비밀번호 오류"를 같은 문구로 묶어 아이디 존재 여부가 새지 않게 한다.
    signInWithUsername: defineAction({
        input: z.object({
            username: usernameSchema,
        }),
        handler: async ({ username }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');

            const { data: profile, error: lookupError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', username)
                .maybeSingle();
            if (lookupError) throw new Error(lookupError.message);
            if (!profile) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');

            const { data: userRes, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
            if (userError || !userRes?.user?.email) {
                throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
            }

            return { success: true, email: userRes.user.email };
        },
    }),

    // Stage B (privacy_redesign_plan.md 전환기간) — 기존 이메일/카카오 사용자가
    // 아이디를 정할 때 호출. auth.users.email 을 가짜 이메일로 교체하고
    // 갱신한다(login_email/nickname 컬럼은 2-2 에서 삭제됨). password 는 선택 — 카카오 사용자는 생략 가능,
    // 이메일 OTP 출신 사용자는 이 방법이 유일한 향후 로그인 수단이라 사실상 필수
    // (강제 여부는 클라이언트 UI 판단, 서버는 optional 로만 받는다).
    // userId 는 클라이언트가 넘긴다 — approveVerification 등 기존 관리자 액션과
    // 동일한 관례(세션 기반 context 대신 명시적 id 전달).
    claimUsername: defineAction({
        input: z.object({
            userId: z.string().uuid(),
            username: usernameSchema,
            password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').optional(),
            hospitalId: hospitalIdSchema,
            hospitalRequest: hospitalRequestSchema,
            society: societySchema,
        }),
        handler: async ({ userId, username, password, hospitalId, hospitalRequest, society }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertKnownHospitalId(hospitalId);

            const { data: existing, error: lookupError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', username)
                .maybeSingle();
            if (lookupError) throw new Error(lookupError.message);
            if (existing && existing.id !== userId) throw new Error('이미 사용 중인 아이디입니다.');

            const email = fakeEmailFor(username);
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email,
                email_confirm: true,
                ...(password ? { password } : {}),
            });
            if (updateAuthError) throw new Error(updateAuthError.message);

            // hospitalId/society 는 신규(self-healing 으로 막 생긴 pending) 계정을 위한
            // 필드라 클라이언트가 값을 안 보내면(기존 active 계정의 평범한 전환) 건드리지
            // 않는다 — 스프레드로 undefined 인 키 자체를 아예 안 넣는다.
            const hospitalFieldsSent = hospitalId !== undefined || hospitalRequest !== undefined;
            const hospitalFields = hospitalFieldsSent ? resolveHospitalFields(hospitalId, hospitalRequest) : null;
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    username,
                    ...(hospitalFields ?? {}),
                    ...(society !== undefined ? { society } : {}),
                })
                .eq('id', userId);
            if (profileError) throw new Error(profileError.message);

            if (hospitalFields?.hospital_request) {
                await notifyAdminsOfHospitalRequest(username, hospitalFields.hospital_request);
            }

            return { success: true, email };
        },
    }),

    // 2-2 (2026-09-19) — 마이페이지 "소속 정보" 저장. 가입 폼과 같은 규칙: 목록에서 확정한 id 는
    // 검증해 저장, 확정 안 된 타이핑 텍스트는 'other' + hospital_request(관리자 알림). society 는
    // null 로 지울 수 있다. userId 는 claimUsername 과 같은 관례(클라이언트 전달).
    updateAffiliation: defineAction({
        input: z.object({
            userId: z.string().uuid(),
            hospitalId: hospitalIdSchema,
            hospitalRequest: hospitalRequestSchema,
            society: z.enum(['nuclear_medicine', 'technology', 'none']).nullable().optional(),
        }),
        handler: async ({ userId, hospitalId, hospitalRequest, society }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertKnownHospitalId(hospitalId);

            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single();
            if (profileError || !profile) throw new Error('사용자를 찾을 수 없습니다.');

            const hospitalFields = resolveHospitalFields(hospitalId, hospitalRequest);
            const update = { ...hospitalFields, ...(society !== undefined ? { society } : {}) };
            const { error: updateError } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
            if (updateError) throw new Error(updateError.message);

            if (hospitalFields.hospital_request) {
                await notifyAdminsOfHospitalRequest(profile.username ?? '', hospitalFields.hospital_request);
            }

            return { success: true, ...hospitalFields, society: society === undefined ? null : society };
        },
    }),

    // 2-1 업로드 권한(2026-09-19, documents/privacy_redesign_plan.md §2-1) ────────────────
    // 첫 제출(pending)을 관리자가 승인/반려한다. 승인 = published + 작성자 can_publish=true
    // (pending 파일은 비공개 버킷에서 공개 버킷으로 이동). 반려 = rejected + reject_count+1
    // (3회면 RLS 가 제출을 막는다). 어느 쪽이든 제출자에게 알림 1건.
    reviewSubmission: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            kind: z.enum(['archive', 'finding']),
            id: z.string().uuid(),
            decision: z.enum(['approve', 'reject']),
            reason: z.string().trim().max(300).optional(),
        }),
        handler: async ({ adminId, kind, id, decision, reason }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertAdmin(adminId);

            const table = kind === 'archive' ? 'archives' : 'findings';
            type SubmissionRow = {
                id: string;
                title: string;
                user_id: string | null;
                status: string;
                file_url?: string | null;
                file_bucket?: string | null;
            };
            // supabase-js 의 select 문자열 타입 추론은 조건식을 못 풀어 any 로 받는다 — 조회 컬럼은 두 표 모두에
            // 있는 것 + archives 전용(file_url·file_bucket, findings 엔 없으면 undefined).
            const columns =
                kind === 'archive' ? 'id, title, user_id, status, file_url, file_bucket' : 'id, title, user_id, status';
            const { data: rowData, error: rowError } = await supabaseAdmin
                .from(table)
                .select(columns as '*')
                .eq('id', id)
                .single();
            const row = rowData as unknown as SubmissionRow | null;
            if (rowError || !row) throw new Error('제출물을 찾을 수 없습니다.');
            if (row.status !== 'pending') throw new Error('이미 처리된 제출물입니다.');

            if (decision === 'approve') {
                const update: Record<string, unknown> = { status: 'published' };
                if (kind === 'archive' && row.file_bucket === 'resources-pending' && row.file_url) {
                    await movePendingFileToPublic(row.file_url);
                    update.file_bucket = 'resources';
                }
                const { error: updateError } = await supabaseAdmin.from(table).update(update).eq('id', id);
                if (updateError) throw new Error(updateError.message);

                if (row.user_id) {
                    const { error: permError } = await supabaseAdmin
                        .from('profiles')
                        .update({ can_publish: true })
                        .eq('id', row.user_id);
                    if (permError) logger.warn('can_publish 부여 실패', { error: permError });
                    await notifySubmitter(row.user_id, adminId, {
                        title: '✅ 제출하신 자료가 게시되었습니다',
                        message: `「${row.title}」이(가) 검토를 통과해 게시되었습니다. 이제부터 제출하시는 자료는 검토 없이 바로 게시됩니다.`,
                        link: kind === 'archive' ? '/resources' : '/findings-recommendations',
                    });
                }
                return { success: true, status: 'published' };
            }

            const { error: rejectError } = await supabaseAdmin.from(table).update({ status: 'rejected' }).eq('id', id);
            if (rejectError) throw new Error(rejectError.message);

            let rejectCount: number | null = null;
            if (row.user_id) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('reject_count')
                    .eq('id', row.user_id)
                    .single();
                rejectCount = ((profile?.reject_count as number | null) ?? 0) + 1;
                const { error: countError } = await supabaseAdmin
                    .from('profiles')
                    .update({ reject_count: rejectCount })
                    .eq('id', row.user_id);
                if (countError) logger.warn('reject_count 증가 실패', { error: countError });
                await notifySubmitter(row.user_id, adminId, {
                    title: '❌ 제출하신 자료가 반려되었습니다',
                    message:
                        `「${row.title}」이(가) 반려되었습니다.` +
                        (reason ? `\n\n사유: ${reason}` : '') +
                        (rejectCount >= 3
                            ? '\n\n반려가 3회 누적되어 더 이상 제출할 수 없습니다. 문의는 의견보내기로 남겨주세요.'
                            : `\n\n(반려 ${rejectCount}회 — 3회 누적 시 제출이 차단됩니다.)`),
                    link: '/mypage',
                });
            }
            return { success: true, status: 'rejected', rejectCount };
        },
    }),

    // 관리자가 can_publish 를 부여/회수한다. 회수되면 다음 제출부터 다시 검토 대기.
    setPublishPermission: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
            canPublish: z.boolean(),
        }),
        handler: async ({ adminId, targetUserId, canPublish }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertAdmin(adminId);

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ can_publish: canPublish })
                .eq('id', targetUserId);
            if (updateError) throw new Error(updateError.message);

            await notifySubmitter(targetUserId, adminId, {
                title: canPublish ? '✅ 직접 게시 권한이 부여되었습니다' : 'ℹ️ 직접 게시 권한이 회수되었습니다',
                message: canPublish
                    ? '이제부터 제출하시는 자료·사례는 검토 없이 바로 게시됩니다.'
                    : '앞으로 제출하시는 자료·사례는 관리자 검토 후 게시됩니다.',
                link: '/mypage',
            });
            return { success: true, canPublish };
        },
    }),

    // Phase 3 (2계층+가입승인+제재 모델, KSNM 방안위 교육팀 합의 2026-09-10 승계) ──
    // 가입 대기(status: 'pending') 계정을 관리자가 승인/거절. adminId 는 클라이언트가
    // 넘기고 서버에서 profiles.is_admin 대조 — approveVerification 등 기존 관리자
    // 액션과 동일한 관례.
    approvePendingMember: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
        }),
        handler: async ({ adminId, targetUserId }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');

            const { data: adminProfile, error: adminError } = await supabaseAdmin
                .from('profiles')
                .select('is_admin')
                .eq('id', adminId)
                .single();
            if (adminError || !adminProfile?.is_admin) throw new Error('관리자 권한이 필요합니다.');

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ status: 'active' })
                .eq('id', targetUserId);
            if (updateError) throw new Error(updateError.message);

            return { success: true };
        },
    }),

    // 거절 = 'banned' 로 처리. profiles.status CHECK 제약이 pending/active/suspended/
    // banned 넷뿐이라 "가입 자체가 거절됨"을 표현할 별도 상태가 없고, 재가입 신청은
    // 새 계정(다른 username)으로 다시 하면 되므로 굳이 상태를 늘리지 않는다.
    rejectPendingMember: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
        }),
        handler: async ({ adminId, targetUserId }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');

            const { data: adminProfile, error: adminError } = await supabaseAdmin
                .from('profiles')
                .select('is_admin')
                .eq('id', adminId)
                .single();
            if (adminError || !adminProfile?.is_admin) throw new Error('관리자 권한이 필요합니다.');

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ status: 'banned' })
                .eq('id', targetUserId);
            if (updateError) throw new Error(updateError.message);

            return { success: true };
        },
    }),

    // 기관 등록 요청 처리(2026-09-19, Dr. Ben). hospitalId 를 주면 그 기존 기관으로 합치기
    // (표기만 다른 중복), 안 주면 거절 — 소속은 '기타' 유지. 어느 쪽이든 hospital_request 를
    // 비워 검토 목록에서 내리고 가입자에게 결과 알림 1건. 새 기관을 만들어 등록하는 것은
    // registerHospitalFromRequest.
    resolveHospitalRequest: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
            hospitalId: z.string().trim().optional(),
        }),
        handler: async ({ adminId, targetUserId, hospitalId }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            if (hospitalId === 'other') throw new Error('알 수 없는 소속기관입니다.');

            await assertAdmin(adminId);
            if (hospitalId) await assertKnownHospitalId(hospitalId);

            const requested = await readHospitalRequest(targetUserId);
            await applyHospitalResolution(targetUserId, hospitalId ?? null);

            const hospitalName = hospitalId ? await getHospitalName(hospitalId) : null;
            await notifyHospitalResolution(adminId, targetUserId, requested, hospitalName);

            return { success: true, hospitalId: hospitalId ?? null };
        },
    }),

    // 요청 기관명(관리자가 고친 값도 가능)으로 기관을 **새로 등록**하고 가입자 소속을 바꾼다
    // (2026-09-19 개정 2 — 배포 없이 화면에서 끝내기). 정규화한 이름이 정적 목록과 같으면
    // 새로 만들지 않고 그 기관으로 합친다. 커스텀 id 는 이름에서 결정적으로 도출되므로
    // 같은 이름을 두 번 등록해도 행이 하나다(upsert).
    registerHospitalFromRequest: defineAction({
        input: z.object({
            adminId: z.string().uuid(),
            targetUserId: z.string().uuid(),
            name: z
                .string()
                .trim()
                .min(2, '기관명은 2자 이상이어야 합니다.')
                .max(60, '기관명은 60자 이내로 입력하세요.'),
        }),
        handler: async ({ adminId, targetUserId, name }) => {
            if (!supabaseAdmin) throw new Error('서버 설정 오류: 관리자 권한 클라이언트가 없습니다.');
            await assertAdmin(adminId);

            const requested = await readHospitalRequest(targetUserId);

            const existing = findStaticHospitalByName(name);
            let hospitalId: string;
            let hospitalName: string;
            let created = false;
            if (existing) {
                hospitalId = existing.id;
                hospitalName = existing.name;
            } else {
                hospitalId = customHospitalId(name);
                const { error: upsertError } = await supabaseAdmin
                    .from('hospitals_custom')
                    .upsert({ id: hospitalId, name, created_by: adminId }, { onConflict: 'id' });
                if (upsertError) throw new Error(upsertError.message);
                hospitalName = name;
                created = true;
            }

            await applyHospitalResolution(targetUserId, hospitalId);
            await notifyHospitalResolution(adminId, targetUserId, requested, hospitalName);

            return { success: true, hospitalId, name: hospitalName, created };
        },
    }),
};

// ── 기관 등록 요청 공용 단계(resolveHospitalRequest · registerHospitalFromRequest) ──

async function assertAdmin(adminId: string) {
    const { data: adminProfile, error: adminError } = await supabaseAdmin!
        .from('profiles')
        .select('is_admin')
        .eq('id', adminId)
        .single();
    if (adminError || !adminProfile?.is_admin) throw new Error('관리자 권한이 필요합니다.');
}

async function readHospitalRequest(targetUserId: string): Promise<string> {
    const { data: target, error: targetError } = await supabaseAdmin!
        .from('profiles')
        .select('hospital_request')
        .eq('id', targetUserId)
        .single();
    if (targetError || !target) throw new Error('대상 회원을 찾을 수 없습니다.');
    return (target.hospital_request as string | null) ?? '';
}

async function applyHospitalResolution(targetUserId: string, hospitalId: string | null) {
    const { error: updateError } = await supabaseAdmin!
        .from('profiles')
        .update({ hospital_request: null, ...(hospitalId ? { hospital_id: hospitalId } : {}) })
        .eq('id', targetUserId);
    if (updateError) throw new Error(updateError.message);
}

// 알림 실패는 처리 결과를 바꾸지 않는다(경고 로그만).
async function notifyHospitalResolution(
    adminId: string,
    targetUserId: string,
    requested: string,
    hospitalName: string | null,
) {
    try {
        await createNotification({
            type: 'system_notice',
            userId: targetUserId,
            senderId: adminId,
            title: hospitalName ? '🏥 소속기관이 등록되었습니다' : '🏥 기관 등록 요청 결과',
            message: hospitalName
                ? `요청하신 "${requested}"이(가) 회원기관 목록에 등록되어 소속기관이 「${hospitalName}」(으)로 설정되었습니다.`
                : `요청하신 "${requested}"은(는) 회원기관 목록에 등록되지 않았습니다. 소속기관은 '기타'로 유지됩니다.`,
            link: '/mypage',
            actionLabel: '마이페이지',
            actionUrl: '/mypage',
        });
    } catch (error) {
        logger.warn('기관 등록 요청 처리 알림 실패(처리는 완료)', { error });
    }
}

// ── 2-1 제출 검토 공용 단계 ──

// pending 파일(비공개 버킷)을 같은 경로로 공개 버킷에 복사하고 원본을 지운다. 서비스 롤 전용.
async function movePendingFileToPublic(path: string) {
    const admin = supabaseAdmin!;
    const { data: blob, error: downloadError } = await admin.storage.from('resources-pending').download(path);
    if (downloadError || !blob) throw new Error('대기 파일을 읽지 못했습니다: ' + (downloadError?.message ?? ''));
    const { error: uploadError } = await admin.storage.from('resources').upload(path, blob, { upsert: true });
    if (uploadError) throw new Error('공개 버킷 업로드 실패: ' + uploadError.message);
    const { error: removeError } = await admin.storage.from('resources-pending').remove([path]);
    if (removeError) logger.warn('대기 파일 삭제 실패(공개 복사는 완료)', { path, error: removeError });
}

async function notifySubmitter(
    userId: string,
    adminId: string,
    data: { title: string; message: string; link: string },
) {
    try {
        await createNotification({
            type: 'system_notice',
            userId,
            senderId: adminId,
            title: data.title,
            message: data.message,
            link: data.link,
            actionLabel: '확인하기',
            actionUrl: data.link,
        });
    } catch (error) {
        logger.warn('제출 검토 알림 실패(처리는 완료)', { error });
    }
}
