import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            'astro:actions': new URL('./tests/mocks/astro-actions.ts', import.meta.url).pathname,
            'astro:schema': new URL('./tests/mocks/astro-schema.ts', import.meta.url).pathname,
        },
    },
    define: {
        'import.meta.env.PUBLIC_LOG_LEVEL': JSON.stringify('info'),
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/unit/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});
