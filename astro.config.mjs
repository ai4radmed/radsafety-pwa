// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import vitePwa from '@vite-pwa/astro';

import vercel from '@astrojs/vercel';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
    site: 'https://ai4radmed.com',
    base: '/',
    output: 'server',
    markdown: {
        remarkPlugins: [remarkGfm],
    },

    integrations: [
        mdx({
            remarkPlugins: [remarkGfm],
        }),
        sitemap(),
        {
            name: "disable-dev-toolbar",
            hooks: {
                "astro:config:setup": ({ updateConfig }) => {
                    updateConfig({
                        devToolbar: {
                            enabled: false
                        }
                    });
                }
            }
        },
        vitePwa({
            registerType: 'autoUpdate',
            manifest: {
                name: '방사선안전관리',
                short_name: '방사선안전',
                description: '대한핵의학회 방사선안전위원회',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                lang: 'ko',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                // 빌드 산출물 전체 precache (JS/CSS/HTML/이미지)
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

                // 오프라인 fallback: 네트워크 실패 시 /offline 반환
                // 수검준비, 지적권고사례는 precache에 포함되어 오프라인 정상 동작
                navigateFallback: '/offline',

                // /offline 자체와 API/auth 경로는 fallback 제외
                // - /offline: 무한 루프 방지
                // - /api/*: API 응답을 offline 페이지로 대체하면 안 됨
                // - /auth/*: 인증 콜백은 서버가 반드시 처리해야 함
                navigateFallbackDenylist: [/^\/offline$/, /^\/api\//, /^\/auth\//],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],

    adapter: vercel(),
});