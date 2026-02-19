import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * settings.astro 캐시 초기화 기능 검증
 *
 * 캐시 초기화 버튼이 설정 페이지에 존재하고,
 * 프로젝트 규칙(astro:page-load 래핑, null-safe DOM 접근)을 따르는지 검증합니다.
 */

const SETTINGS_PATH = path.resolve('src/pages/settings.astro');

describe('설정 페이지 — 캐시 초기화', () => {
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');

    it('캐시 초기화 버튼 마크업이 존재한다', () => {
        expect(content).toContain('id="cacheResetBtn"');
    });

    it('캐시 초기화 상태 메시지 영역이 존재한다', () => {
        expect(content).toContain('id="cacheResetStatus"');
    });

    it('caches.keys()를 사용하여 Cache Storage를 삭제한다', () => {
        expect(content).toContain('caches.keys()');
        expect(content).toContain('caches.delete(');
    });

    it('Service Worker를 해제한다', () => {
        expect(content).toContain('navigator.serviceWorker.getRegistrations()');
        expect(content).toContain('.unregister()');
    });

    it('confirm 대화상자로 사용자 확인을 받는다', () => {
        expect(content).toContain('confirm(');
    });

    it('초기화 후 페이지를 새로고침한다', () => {
        expect(content).toContain('window.location.reload()');
    });

    it('스크립트가 astro:page-load 이벤트로 래핑되어 있다', () => {
        expect(content).toContain('astro:page-load');
    });

    it('캐시 초기화 버튼의 DOM 접근이 null-safe하다', () => {
        // cacheResetBtn과 cacheResetStatus를 if 가드로 감싸는지 확인
        expect(content).toMatch(/if\s*\(\s*cacheResetBtn\s*&&\s*cacheResetStatus\s*\)/);
    });
});
