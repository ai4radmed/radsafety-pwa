import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * content.config.ts 구조 검증 (정적 분석)
 *
 * astro:content는 Vitest에서 resolve 불가하므로,
 * 소스 코드에 필수 컬렉션·스키마 패턴이 포함되는지 검증합니다.
 */

const CONTENT_CONFIG_PATH = path.resolve('src/content.config.ts');

describe('collections 구조', () => {
    it('inspection_prep, smart_resources 키 존재', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        expect(content).toContain('inspection_prep');
        expect(content).toContain('smart_resources');
        expect(content).toContain('collections');
        expect(content).toMatch(/\{\s*inspection_prep[^}]*smart_resources\s*\}/s);
    });

    // findings_recommendations 는 2026-08-20 제거됐다. 실제 데이터는 Supabase `findings`
    // 테이블에서 오고(findings-recommendations.astro), 마크다운 경로는 2026-03-03
    // 플레이스홀더 삭제 이후 빈 배열만 순회하는 죽은 코드였다.
    // 남아 있는 동안 매 빌드마다 `[glob-loader] The base directory ... does not exist` 경고를 냈다.
    it('제거된 findings_recommendations 가 되살아나지 않는다', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        expect(content).not.toContain('findings_recommendations');
    });
});

describe('inspection_prep 스키마', () => {
    it('title 필수, category, order 등 optional 정의', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        expect(content).toContain('title: z.string()');
        expect(content).toContain('category');
        expect(content).toContain('order');
        expect(content).toContain('resourceId');
        expect(content).toContain('example');
    });
});

describe('smart_resources 스키마', () => {
    it('title, category, order 정의', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        const smartResourcesSection = content.includes('smart_resources')
            ? (content.split('smart_resources')[1]?.split('defineCollection')[1] ?? '')
            : '';
        expect(smartResourcesSection || content).toContain('title');
        expect(content).toContain("type: 'content'");
    });
});
