// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import vitePwa from '@vite-pwa/astro';

import vercel from '@astrojs/vercel';
import remarkGfm from 'remark-gfm';

// 사이트맵에서 제외할 경로 — 검색에 노출할 "공개 문서"만 남긴다.
// robots.txt 의 Disallow 와 같은 경계를 쓴다(사이트맵이 제출하는데 robots 가 막는
// 모순된 신호를 피하기 위함).
//
// 2026-08-20: Search Console "페이지가 색인 생성되지 않음: 리디렉션이 포함된 페이지"
// 원인 정리 중 발견. /notifications 는 미로그인 요청에 302 → /login 을 돌려주는데
// 사이트맵이 이를 "색인해 달라"고 제출하고 있었다. /admin/* 은 robots.txt 가 막는데
// 사이트맵은 제출하는 모순 상태였다.
const SITEMAP_EXCLUDE_PREFIX = ['/admin/', '/auth/', '/api/'];
const SITEMAP_EXCLUDE_EXACT = [
    '/admin-guide/',
    '/feedback/',
    '/feedback-query/',
    '/login/',
    '/my-feedback/',
    '/mypage/',
    '/notifications/',
    '/offline/',
    '/settings/',
];

// https://astro.build/config
export default defineConfig({
    site: 'https://radsafety.kr',
    base: '/',
    output: 'server',
    markdown: {
        remarkPlugins: [remarkGfm],
    },

    integrations: [
        mdx({
            remarkPlugins: [remarkGfm],
        }),
        sitemap({
            filter: (page) => {
                const { pathname } = new URL(page);
                return (
                    !SITEMAP_EXCLUDE_PREFIX.some((prefix) => pathname.startsWith(prefix)) &&
                    !SITEMAP_EXCLUDE_EXACT.includes(pathname)
                );
            },
        }),
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
                start_url: '/',
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
    vite: {
        server: {
            allowedHosts: true,
        },
    },
});