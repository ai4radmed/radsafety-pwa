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
    it('inspection_prep, findings_recommendations, smart_resources 키 존재', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        expect(content).toContain('inspection_prep');
        expect(content).toContain('findings_recommendations');
        expect(content).toContain('smart_resources');
        expect(content).toContain('collections');
        expect(content).toMatch(/\{\s*inspection_prep[^}]*findings_recommendations[^}]*smart_resources\s*\}/s);
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

describe('findings_recommendations 스키마', () => {
    it('title, severity enum 등 정의', () => {
        const content = fs.readFileSync(CONTENT_CONFIG_PATH, 'utf-8');
        expect(content).toContain("severity: z.enum(['high', 'medium', 'low'])");
        expect(content).toContain('tags');
        expect(content).toContain('inspectionYear');
        expect(content).toContain('violationClause');
        expect(content).toContain('solution');
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
