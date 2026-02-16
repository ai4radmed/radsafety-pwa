import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        'import.meta.env.PUBLIC_LOG_LEVEL': JSON.stringify('info'),
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/unit/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});
