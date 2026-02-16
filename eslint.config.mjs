import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...astroPlugin.configs.recommended,
    {
        ignores: [
            'dist/',
            'node_modules/',
            '.vercel/',
            '.astro/',
            'manuscripts/',
            'scripts/',
            'src/scripts/',
        ],
    },
    {
        files: ['**/*.ts', '**/*.astro'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
        },
    },
];
