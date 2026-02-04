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
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],

    adapter: vercel(),
});