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
                // 빌드 산출물 precache (JS/CSS/HTML/이미지)
                // archive/ 폴더는 다운로드용 정적 파일이므로 제외
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
                globIgnores: ['archive/**'],

                // SSR 앱에서는 navigateFallback 사용 불가
                // (precache에 없는 모든 navigation을 가로채므로)
                // false로 명시하여 기본 NavigationRoute 생성 방지
                navigateFallback: null,
                // 대신 runtimeCaching으로 NetworkFirst → offline fallback 처리
                runtimeCaching: [
                    {
                        // SSR 페이지: 네트워크 우선, 실패 시 /offline 표시
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'pages',
                            networkTimeoutSeconds: 5,
                            plugins: [
                                {
                                    // 네트워크 실패 시 오프라인 fallback
                                    handlerDidError: async () => {
                                        return caches.match('/offline') || Response.error();
                                    },
                                },
                            ],
                        },
                    },
                ],

                // 웹 푸시 핸들러 포함 (push 이벤트, notificationclick 이벤트)
                importScripts: ['/sw-push.js'],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],

    adapter: vercel(),
});