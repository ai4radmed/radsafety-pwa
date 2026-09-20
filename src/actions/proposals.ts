/**
 * 제도 개선 제안(3단계) 액션. 명세: .spec/src/actions/proposals.md
 *
 * 문지기는 RLS 가 아니라 여기다: 세션으로 로그인만 확인하고(익명 모드에선 신원을 본 뒤 버린다) 서비스 롤로 쓴다.
 * 이 파일의 액션은 **세션 쿠키**로 사용자를 판정한다 — 클라이언트가 보낸 userId/adminId 를 믿지 않는다
 * (index.ts 의 기존 액션들과 다른 점. 익명 채널은 신원 오판이 곧 사고라서).
 *
 * 로그 원칙: submitProposal 은 본문·사용자·요청 메타를 로그에 남기지 않는다(오류도 코드만).
 */

import { defineAction, ActionError, type ActionAPIContext } from 'astro:actions';
import { z } from 'astro:schema';
import { supabaseAdmin } from '../lib/supabase-server';
import { requireUser, requireAdmin } from './auth';
import { createNotification } from '../lib/notification-helper';
import { sendTelegramMessage } from '../lib/telegram';
import { sendAdminNotice } from '../lib/admin-notify';
import { createLogger } from '../lib/logger';
import {
    ATTACHMENT_BUCKET,
    ATTACHMENT_MAX_BYTES,
    ATTACHMENT_MAX_COUNT,
    BODY_MAX,
    BODY_MIN,
    DAILY_QUOTA_GLOBAL,
    DAILY_QUOTA_PER_USER,
    PROPOSAL_CATEGORIES,
    PROPOSAL_STATUSES,
    hashReceiptCode,
    isValidAttachmentPath,
    makeReceiptCode,
    newAttachmentPath,
    normalizeReceiptCode,
    quotaKey,
    quotaSecret,
    sniffKind,
    stripImageMetadata,
    stripPdfMetadata,
    todayKst,
    type StoredAttachment,
} from '../lib/proposals';

const logger = createLogger('proposals');

// 인증 헬퍼는 공용 src/actions/auth.ts (2026-09-20 전 액션 세션 전환). 제안은 active 회원만.
const requireActiveUser = (context: ActionAPIContext) => requireUser(context, { active: true });

function env() {
    const e = import.meta.env;
    const p = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
    return {
        PROPOSAL_QUOTA_SECRET: e.PROPOSAL_QUOTA_SECRET || p.PROPOSAL_QUOTA_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: e.SUPABASE_SERVICE_ROLE_KEY || p.SUPABASE_SERVICE_ROLE_KEY,
    };
}

const attachmentSchema = z.object({
    storage_path: z.string().refine(isValidAttachmentPath, '첨부 경로가 올바르지 않습니다.'),
    size: z.number().int().positive().max(ATTACHMENT_MAX_BYTES),
    kind: z.enum(['image', 'pdf']),
});

export const proposalActions = {
    /**
     * 첨부 1개 업로드(파일 1개씩 — Vercel 본문 한도). 서버가 종류를 매직 바이트로 판정하고 메타데이터를 지운 뒤
     * 서비스 롤로 비공개 버킷에 올린다(owner 없음, 경로에 사용자 없음). 원본 파일명은 버린다.
     */
    uploadProposalAttachment: defineAction({
        accept: 'form',
        input: z.object({ file: z.instanceof(File) }),
        handler: async ({ file }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            await requireActiveUser(context);
            if (file.size > ATTACHMENT_MAX_BYTES) {
                throw new ActionError({ code: 'BAD_REQUEST', message: '첨부는 파일당 3MB 이하만 가능합니다.' });
            }
            const bytes = new Uint8Array(await file.arrayBuffer());
            const kind = sniffKind(bytes);
            if (!kind)
                throw new ActionError({
                    code: 'BAD_REQUEST',
                    message: '이미지(JPG·PNG·WebP) 또는 PDF 만 첨부할 수 있습니다.',
                });

            let cleaned: Uint8Array;
            try {
                cleaned =
                    kind.kind === 'image'
                        ? await stripImageMetadata(bytes, kind.ext as 'jpg' | 'png' | 'webp')
                        : await stripPdfMetadata(bytes);
            } catch {
                throw new ActionError({
                    code: 'BAD_REQUEST',
                    message: '파일을 처리할 수 없습니다(손상되었거나 지원하지 않는 형식).',
                });
            }
            const path = newAttachmentPath(kind.ext);
            const contentType =
                kind.kind === 'pdf' ? 'application/pdf' : `image/${kind.ext === 'jpg' ? 'jpeg' : kind.ext}`;
            const { error } = await supabaseAdmin.storage
                .from(ATTACHMENT_BUCKET)
                .upload(path, cleaned, { contentType, upsert: false });
            if (error) {
                logger.error('제안 첨부 업로드 실패', { code: 'storage' });
                throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '첨부 저장에 실패했습니다.' });
            }
            const stored: StoredAttachment = { storage_path: path, size: cleaned.byteLength, kind: kind.kind };
            return stored;
        },
    }),

    /**
     * 제안 제출. ① 세션 확인(신원을 보는 마지막 지점) ② 쿼터(1인 1일 3건 + 전체 100건) ③ 서비스 롤 insert
     * anonymous → author_id·created_at 비움, receipt_hash 저장, 코드 1회 반환 / signed → author_id·created_at 기록.
     */
    submitProposal: defineAction({
        input: z.object({
            mode: z.enum(['anonymous', 'signed']).default('anonymous'),
            category: z.enum(PROPOSAL_CATEGORIES),
            body: z.string().trim().min(BODY_MIN, `내용은 ${BODY_MIN}자 이상 적어 주세요.`).max(BODY_MAX),
            attachments: z.array(attachmentSchema).max(ATTACHMENT_MAX_COUNT).default([]),
        }),
        handler: async ({ mode, category, body, attachments }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            const user = await requireActiveUser(context);
            const day = todayKst();
            const key = quotaKey(mode, user.id, day, quotaSecret(env()));

            // 전체 일일 상한
            const { count: todayCount } = await supabaseAdmin
                .from('proposals')
                .select('id', { count: 'exact', head: true })
                .eq('created_day', day);
            if ((todayCount ?? 0) >= DAILY_QUOTA_GLOBAL) {
                throw new ActionError({
                    code: 'TOO_MANY_REQUESTS',
                    message: '오늘 접수 한도에 도달했습니다. 내일 다시 시도해 주세요.',
                });
            }

            // 1인 1일 쿼터 — 지난 날 행은 기회 있을 때 정리(별도 cron 없음)
            await supabaseAdmin.from('proposal_quota').delete().lt('day', day);
            const { data: q } = await supabaseAdmin.from('proposal_quota').select('count').eq('key', key).maybeSingle();
            if ((q?.count ?? 0) >= DAILY_QUOTA_PER_USER) {
                throw new ActionError({
                    code: 'TOO_MANY_REQUESTS',
                    message: `하루 ${DAILY_QUOTA_PER_USER}건까지 제안할 수 있습니다.`,
                });
            }

            const receipt = mode === 'anonymous' ? makeReceiptCode() : null;
            const row = {
                category,
                body,
                attachments,
                mode,
                created_day: day,
                author_id: mode === 'signed' ? user.id : null,
                created_at: mode === 'signed' ? new Date().toISOString() : null,
                receipt_hash: receipt ? hashReceiptCode(receipt) : null,
            };
            const { error } = await supabaseAdmin.from('proposals').insert(row);
            if (error) {
                // 본문·사용자 없이 코드만
                logger.error('제안 저장 실패', { code: error.code });
                throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '제안 저장에 실패했습니다.' });
            }
            const { error: qError } = await supabaseAdmin
                .from('proposal_quota')
                .upsert({ key, day, count: (q?.count ?? 0) + 1 }, { onConflict: 'key' });
            if (qError) logger.warn('제안 쿼터 갱신 실패', { code: qError.code });

            // 관리자 메일 — 본문·작성자 미포함(익명 채널). 건수·모드·분류만.
            await sendAdminNotice({
                subject: '새 제도 개선 제안 1건',
                lines: [
                    `${mode === 'anonymous' ? '익명' : '아이디'} · ${category}`,
                    '내용은 관리자 화면에서 확인하세요.',
                ],
                linkPath: '/admin/proposals',
                linkLabel: '제안 검토',
            });

            // 관리자 텔레그램 — 본문 미포함
            try {
                await sendTelegramMessage(
                    `[RadSafety] 새 제도 개선 제안 1건 (${mode === 'anonymous' ? '익명' : '아이디'} · ${category})`,
                );
            } catch {
                /* 알림 실패는 제출을 막지 않는다 */
            }

            return mode === 'anonymous' ? { mode, receipt } : { mode, receipt: null };
        },
    }),

    /** 접수증 코드로 익명 제안의 상태·답변 조회. 로그인 불필요(코드 소지 = 본인). 존재 여부만 노출, 실패 사유 미구분. */
    lookupProposal: defineAction({
        input: z.object({ code: z.string().trim().min(6).max(20) }),
        handler: async ({ code }) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            const normalized = normalizeReceiptCode(code);
            if (!normalized) return { found: false as const };
            const { data } = await supabaseAdmin
                .from('proposals')
                .select('category, body, status, admin_reply, created_day, answered_at')
                .eq('receipt_hash', hashReceiptCode(normalized))
                .maybeSingle();
            if (!data) return { found: false as const };
            return { found: true as const, proposal: data };
        },
    }),

    /** signed 본인 제안 철회 — 답변 전(new/reviewing)만. 첨부도 지운다. */
    withdrawProposal: defineAction({
        input: z.object({ id: z.string().uuid() }),
        handler: async ({ id }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            const user = await requireActiveUser(context);
            const { data: row } = await supabaseAdmin
                .from('proposals')
                .select('id, author_id, status, attachments')
                .eq('id', id)
                .maybeSingle();
            if (!row || row.author_id !== user.id)
                throw new ActionError({ code: 'NOT_FOUND', message: '제안을 찾을 수 없습니다.' });
            if (row.status !== 'new' && row.status !== 'reviewing') {
                throw new ActionError({ code: 'BAD_REQUEST', message: '답변이 시작된 제안은 철회할 수 없습니다.' });
            }
            await removeAttachments(row.attachments as StoredAttachment[]);
            const { error } = await supabaseAdmin.from('proposals').delete().eq('id', id);
            if (error) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '철회에 실패했습니다.' });
            return { success: true };
        },
    }),

    /** 관리자: 상태·메모·답변 갱신. answered 로 바뀌면 signed 작성자에게 알림(익명은 코드 조회로만). */
    reviewProposal: defineAction({
        input: z.object({
            id: z.string().uuid(),
            status: z.enum(PROPOSAL_STATUSES).optional(),
            adminNote: z.string().trim().max(2000).optional(),
            adminReply: z.string().trim().max(4000).optional(),
        }),
        handler: async ({ id, status, adminNote, adminReply }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            const admin = await requireAdmin(context);
            const { data: row } = await supabaseAdmin
                .from('proposals')
                .select('id, mode, author_id, status, category')
                .eq('id', id)
                .maybeSingle();
            if (!row) throw new ActionError({ code: 'NOT_FOUND', message: '제안을 찾을 수 없습니다.' });

            const patch: Record<string, unknown> = {};
            if (adminNote !== undefined) patch.admin_note = adminNote || null;
            if (adminReply !== undefined) patch.admin_reply = adminReply || null;
            if (status) patch.status = status;
            const becameAnswered = status === 'answered' && row.status !== 'answered';
            if (becameAnswered) patch.answered_at = new Date().toISOString();

            const { error } = await supabaseAdmin.from('proposals').update(patch).eq('id', id);
            if (error) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '저장에 실패했습니다.' });

            if (becameAnswered && row.mode === 'signed' && row.author_id) {
                try {
                    await createNotification({
                        type: 'admin_message',
                        userId: row.author_id,
                        senderId: admin.id,
                        title: '제도 개선 제안에 답변이 등록되었습니다',
                        message: `[${row.category}] 제안에 관리자 답변이 있습니다. "내 제안"에서 확인하세요.`,
                        link: '/my-proposals',
                        expiresInDays: 90,
                    });
                } catch {
                    /* 알림 실패는 저장을 되돌리지 않는다 */
                }
            }
            return { success: true };
        },
    }),

    /** 관리자: 제안 삭제(첨부 포함). */
    deleteProposal: defineAction({
        input: z.object({ id: z.string().uuid() }),
        handler: async ({ id }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            await requireAdmin(context);
            const { data: row } = await supabaseAdmin
                .from('proposals')
                .select('attachments')
                .eq('id', id)
                .maybeSingle();
            if (row) await removeAttachments(row.attachments as StoredAttachment[]);
            const { error } = await supabaseAdmin.from('proposals').delete().eq('id', id);
            if (error) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '삭제에 실패했습니다.' });
            return { success: true };
        },
    }),

    /** 관리자·본인: 첨부 서명 URL(10분). 비공개 버킷이라 클라이언트가 직접 못 읽는다. */
    proposalAttachmentUrl: defineAction({
        input: z.object({ id: z.string().uuid(), storagePath: z.string().refine(isValidAttachmentPath) }),
        handler: async ({ id, storagePath }, context) => {
            if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });
            const user = await requireActiveUser(context);
            const { data: row } = await supabaseAdmin
                .from('proposals')
                .select('author_id, attachments')
                .eq('id', id)
                .maybeSingle();
            const owns = row?.author_id === user.id;
            const listed = ((row?.attachments as StoredAttachment[]) ?? []).some((a) => a.storage_path === storagePath);
            if (!row || !listed || (!user.isAdmin && !owns)) {
                throw new ActionError({ code: 'NOT_FOUND', message: '첨부를 찾을 수 없습니다.' });
            }
            const { data, error } = await supabaseAdmin.storage
                .from(ATTACHMENT_BUCKET)
                .createSignedUrl(storagePath, 600);
            if (error || !data)
                throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '링크 생성에 실패했습니다.' });
            return { url: data.signedUrl };
        },
    }),
};

async function removeAttachments(list: StoredAttachment[] | null | undefined): Promise<void> {
    const paths = (list ?? []).map((a) => a.storage_path).filter(isValidAttachmentPath);
    if (!paths.length) return;
    const { error } = await supabaseAdmin!.storage.from(ATTACHMENT_BUCKET).remove(paths);
    if (error) logger.warn('제안 첨부 삭제 실패', { code: 'storage', n: paths.length });
}
