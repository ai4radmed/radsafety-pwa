/**
 * 제도 개선 제안(3단계) — 순수 헬퍼 + 첨부 메타 제거. 명세: .spec/src/lib/proposals.md
 *
 * 액션(src/actions/index.ts submitProposal 등)이 쓰는 계산만 모은다: 접수증 코드·해시, 쿼터 키(HMAC),
 * 첨부 검증, 이미지(sharp)·PDF(pdf-lib) 메타데이터 제거. DB 접근 없음.
 */

import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

export const PROPOSAL_CATEGORIES = ['안전관리', '피폭', '규제', '기타'] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];
export const PROPOSAL_STATUSES = ['new', 'reviewing', 'answered', 'closed'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const DAILY_QUOTA_PER_USER = 3;
export const DAILY_QUOTA_GLOBAL = 100;
export const BODY_MIN = 20;
export const BODY_MAX = 4000;

/** Vercel 함수 요청 본문 한도(4.5MB) 안에서 파일 1개씩 올린다 — 계획서 10MB 는 이 한도로 축소(명세 참조). */
export const ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 3;
export const ATTACHMENT_BUCKET = 'proposal-attachments';

/** 접수증 코드 알파벳 — 헷갈리는 0/O/1/I 제외. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 예: RS-7K3M-Q9XA. 32^8 ≈ 1.1e12 — 해시 충돌·추측 모두 비현실적. */
export function makeReceiptCode(): string {
    const bytes = randomBytes(8);
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return `RS-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** 사용자 입력 정규화 — 대소문자·공백·하이픈 유무 무관. */
export function normalizeReceiptCode(input: string): string {
    const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const body = raw.startsWith('RS') ? raw.slice(2) : raw;
    return body.length === 8 ? `RS-${body.slice(0, 4)}-${body.slice(4)}` : '';
}

export function hashReceiptCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

/** 'YYYY-MM-DD' (KST 기준 — created_day 와 쿼터 day 가 같은 달력을 쓰도록). */
export function todayKst(now: Date = new Date()): string {
    return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 쿼터 키. anonymous 는 HMAC(user_id|day, secret) — proposals 에 키를 저장하지 않으므로 어느 제안이 어느 키였는지
 * 서버도 모른다. signed 는 user_id|day 그대로(신원이 어차피 행에 있다).
 */
export function quotaKey(mode: 'anonymous' | 'signed', userId: string, day: string, secret: string): string {
    if (mode === 'signed') return `s:${userId}|${day}`;
    return `a:${createHmac('sha256', secret).update(`${userId}|${day}`).digest('hex')}`;
}

/** HMAC 비밀 — env PROPOSAL_QUOTA_SECRET, 없으면 서비스 롤 키에서 파생(같은 비밀을 두 용도로 직접 쓰지 않도록 해시). */
export function quotaSecret(env: { PROPOSAL_QUOTA_SECRET?: string; SUPABASE_SERVICE_ROLE_KEY?: string }): string {
    if (env.PROPOSAL_QUOTA_SECRET) return env.PROPOSAL_QUOTA_SECRET;
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
        return createHash('sha256').update(`proposal-quota:${env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex');
    }
    throw new Error('제안 쿼터 비밀이 없습니다(PROPOSAL_QUOTA_SECRET).');
}

export type AttachmentKind = 'image' | 'pdf';

export interface StoredAttachment {
    storage_path: string; // <uuid>/<uuid>.<ext>
    size: number;
    kind: AttachmentKind;
}

const ATTACHMENT_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

export function isValidAttachmentPath(p: string): boolean {
    return ATTACHMENT_PATH_RE.test(p);
}

/** 파일 서명(매직 바이트)으로 종류 판정 — 확장자·Content-Type 은 신뢰하지 않는다. */
export function sniffKind(bytes: Uint8Array): { kind: AttachmentKind; ext: 'jpg' | 'png' | 'webp' | 'pdf' } | null {
    if (bytes.length < 12) return null;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { kind: 'image', ext: 'jpg' };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
        return { kind: 'image', ext: 'png' };
    if (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    )
        return { kind: 'image', ext: 'webp' };
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
        return { kind: 'pdf', ext: 'pdf' };
    return null;
}

/** 새 저장 경로 — 사용자·원본 파일명 흔적 없음. */
export function newAttachmentPath(ext: 'jpg' | 'png' | 'webp' | 'pdf'): string {
    return `${randomUUID()}/${randomUUID()}.${ext}`;
}

/**
 * 이미지 메타데이터 제거 — sharp 재인코딩(EXIF·GPS·ICC 소멸). 회전은 EXIF orientation 을 픽셀에 반영해 유지.
 * 긴 변 2000px 로 축소(첨부는 증빙용, 원본 해상도 불필요 + 용량 절감).
 */
export async function stripImageMetadata(bytes: Uint8Array, ext: 'jpg' | 'png' | 'webp'): Promise<Uint8Array> {
    const sharp = (await import('sharp')).default;
    let pipeline = sharp(Buffer.from(bytes))
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
    if (ext === 'jpg') pipeline = pipeline.jpeg({ quality: 85 });
    else if (ext === 'png') pipeline = pipeline.png();
    else pipeline = pipeline.webp({ quality: 85 });
    // sharp 는 기본적으로 메타데이터를 복사하지 않는다(withMetadata 미호출) → EXIF 제거.
    const out = await pipeline.toBuffer();
    return new Uint8Array(out);
}

/** PDF 메타데이터 제거 — 제목·작성자·주제·키워드·생성도구·생성/수정일. 본문·첨부 파일은 손대지 않는다. */
export async function stripPdfMetadata(bytes: Uint8Array): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('');
    doc.setCreator('');
    const epoch = new Date(0);
    doc.setCreationDate(epoch);
    doc.setModificationDate(epoch);
    return doc.save({ updateFieldAppearances: false });
}

/** 제출 화면 문구(법적 방어선) — 페이지·테스트가 같은 원문을 쓴다. */
export const PROPOSAL_NOTICES = {
    anonymous: '관리자도 작성자를 알 수 없습니다. 접수증 코드를 잃으면 답변을 확인할 수 없습니다.',
    signed: '관리자가 답변을 알림으로 보내드립니다. 제안 목록은 "내 제안"에서 볼 수 있습니다.',
    common1: '특정될 수 있는 정보(병원명·장비 대수·날짜)는 적지 마십시오.',
    common2: '허위 사실·특정인 비방은 명예훼손에 해당할 수 있습니다.',
} as const;
