import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { canonicalUrl } from '../../../src/lib/canonical';

const SITE = 'https://radsafety.kr';
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

describe('표준 URL', () => {
    it('슬래시 없는 경로와 있는 경로가 같은 표준을 낸다', () => {
        expect(canonicalUrl('/guide', SITE).href).toBe('https://radsafety.kr/guide/');
        expect(canonicalUrl('/guide/', SITE).href).toBe('https://radsafety.kr/guide/');
    });

    it('중첩 경로도 슬래시로 끝난다', () => {
        expect(canonicalUrl('/admin/members', SITE).href).toBe('https://radsafety.kr/admin/members/');
    });

    it('홈은 그대로', () => {
        expect(canonicalUrl('/', SITE).href).toBe('https://radsafety.kr/');
    });

    it('파일 경로에는 슬래시를 붙이지 않는다', () => {
        expect(canonicalUrl('/rss.xml', SITE).href).toBe('https://radsafety.kr/rss.xml');
    });

    it('site 가 URL 객체여도 동작한다', () => {
        expect(canonicalUrl('/info', new URL(SITE)).href).toBe('https://radsafety.kr/info/');
    });
});

describe('소스 계약', () => {
    const head = read('src/components/BaseHead.astro');

    it('BaseHead 가 canonicalUrl 로 표준 태그를 만든다', () => {
        expect(head).toContain("import { canonicalUrl } from '../lib/canonical'");
        expect(head).toContain('canonicalUrl(Astro.url.pathname, Astro.site)');
    });

    it('og:url · twitter:url 도 같은 표준 주소를 쓴다', () => {
        expect(head).toContain('<meta property="og:url" content={canonicalURL} />');
        expect(head).toContain('<meta property="twitter:url" content={canonicalURL} />');
    });
});
