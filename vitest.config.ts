import { getViteConfig } from 'astro/config';

export default getViteConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/unit/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});
