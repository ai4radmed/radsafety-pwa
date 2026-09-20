import { describe, it, expect } from 'vitest';
import {
    makeReceiptCode,
    normalizeReceiptCode,
    hashReceiptCode,
    quotaKey,
    quotaSecret,
    todayKst,
    sniffKind,
    isValidAttachmentPath,
    newAttachmentPath,
    stripPdfMetadata,
    PROPOSAL_NOTICES,
} from '../../../src/lib/proposals';

describe('lib/proposals 접수증 코드', () => {
    it('RS-XXXX-XXXX 형식, 헷갈리는 문자(0/O/1/I) 없음, 매번 다름', () => {
        const a = makeReceiptCode();
        const b = makeReceiptCode();
        expect(a).toMatch(/^RS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
        expect(a).not.toBe(b);
    });
    it('정규화 — 대소문자·공백·하이픈·RS 접두 유무 무관, 길이 틀리면 빈 문자열', () => {
        expect(normalizeReceiptCode(' rs-7k3m q9xa ')).toBe('RS-7K3M-Q9XA');
        expect(normalizeReceiptCode('7K3MQ9XA')).toBe('RS-7K3M-Q9XA');
        expect(normalizeReceiptCode('RS-7K3M')).toBe('');
    });
    it('해시는 sha256 hex, 같은 코드 → 같은 해시', () => {
        const h = hashReceiptCode('RS-7K3M-Q9XA');
        expect(h).toMatch(/^[0-9a-f]{64}$/);
        expect(hashReceiptCode('RS-7K3M-Q9XA')).toBe(h);
    });
});

describe('lib/proposals 쿼터 키', () => {
    it('anonymous 는 HMAC(사용자 노출 ✗), signed 는 user|day 그대로', () => {
        const a = quotaKey('anonymous', 'user-1', '2026-09-20', 'secret');
        expect(a).toMatch(/^a:[0-9a-f]{64}$/);
        expect(a).not.toContain('user-1');
        expect(quotaKey('anonymous', 'user-1', '2026-09-20', 'secret')).toBe(a);
        expect(quotaKey('anonymous', 'user-1', '2026-09-21', 'secret')).not.toBe(a);
        expect(quotaKey('anonymous', 'user-1', '2026-09-20', 'other')).not.toBe(a);
        expect(quotaKey('signed', 'user-1', '2026-09-20', 'secret')).toBe('s:user-1|2026-09-20');
    });
    it('비밀은 env 우선, 없으면 서비스 롤 키에서 해시 파생, 둘 다 없으면 throw', () => {
        expect(quotaSecret({ PROPOSAL_QUOTA_SECRET: 'x' })).toBe('x');
        const derived = quotaSecret({ SUPABASE_SERVICE_ROLE_KEY: 'srk' });
        expect(derived).toMatch(/^[0-9a-f]{64}$/);
        expect(derived).not.toContain('srk');
        expect(() => quotaSecret({})).toThrow();
    });
    it('todayKst — UTC 자정 직전은 한국에선 다음 날', () => {
        expect(todayKst(new Date('2026-09-20T15:30:00Z'))).toBe('2026-09-21');
        expect(todayKst(new Date('2026-09-20T14:30:00Z'))).toBe('2026-09-20');
    });
});

describe('lib/proposals 첨부', () => {
    it('매직 바이트로 종류 판정 — 확장자·MIME 무시', () => {
        expect(sniffKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toEqual({
            kind: 'image',
            ext: 'jpg',
        });
        expect(sniffKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toEqual({
            kind: 'image',
            ext: 'png',
        });
        expect(sniffKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toEqual({
            kind: 'image',
            ext: 'webp',
        });
        expect(sniffKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0]))).toEqual({
            kind: 'pdf',
            ext: 'pdf',
        });
        expect(sniffKind(new TextEncoder().encode('MZ......exe'))).toBeNull();
        expect(sniffKind(new Uint8Array([1, 2]))).toBeNull();
    });
    it('저장 경로 — <uuid>/<uuid>.<ext>, 사용자·원본 파일명 없음', () => {
        const p = newAttachmentPath('jpg');
        expect(isValidAttachmentPath(p)).toBe(true);
        expect(isValidAttachmentPath('user-1/photo.jpg')).toBe(false);
        expect(isValidAttachmentPath('../../etc/passwd')).toBe(false);
    });
    it('PDF 메타데이터 제거 — 제목·작성자·생성도구가 비고 본문은 유지', async () => {
        const { PDFDocument } = await import('pdf-lib');
        const src = await PDFDocument.create();
        src.setTitle('병원 내부 문서');
        src.setAuthor('홍길동');
        src.setProducer('Hancom');
        src.setCreator('Word');
        src.addPage([200, 200]);
        const bytes = await src.save();
        const cleaned = await stripPdfMetadata(bytes);
        // 검증용 load 도 updateMetadata:false — 기본값이면 pdf-lib 가 Producer/ModDate 를 다시 채운다
        const out = await PDFDocument.load(cleaned, { updateMetadata: false });
        expect(out.getTitle() ?? '').toBe('');
        expect(out.getAuthor() ?? '').toBe('');
        expect(out.getProducer() ?? '').toBe('');
        expect(out.getCreator() ?? '').toBe('');
        expect(out.getPageCount()).toBe(1);
    });
});

describe('lib/proposals 문구', () => {
    it('법적 방어선 문구 4종이 계획서 원문과 같다', () => {
        expect(PROPOSAL_NOTICES.anonymous).toContain('관리자도 작성자를 알 수 없습니다');
        expect(PROPOSAL_NOTICES.common1).toContain('병원명·장비 대수·날짜');
        expect(PROPOSAL_NOTICES.common2).toContain('명예훼손');
    });
});
