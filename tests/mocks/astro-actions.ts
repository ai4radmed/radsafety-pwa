/**
 * astro:actions 모의 구현
 * Vitest에서 astro:actions를 resolve할 수 없으므로 alias로 이 파일을 사용
 */
import { z } from 'zod';

export function defineAction<TInput, TOutput>(config: {
    accept?: 'form' | 'json';
    input?: z.ZodType<TInput>;
    handler: (input: TInput) => Promise<TOutput>;
}) {
    const { handler } = config;
    return Object.assign(
        async (input: TInput) => {
            if (config.input) {
                const parsed = config.input.safeParse(input);
                if (!parsed.success) throw new Error('Validation failed');
                input = parsed.data;
            }
            const data = await handler(input);
            return { data, error: null };
        },
        {
            orThrow: async (input: TInput) => {
                const result = await (handler as any)(input);
                return result;
            },
        },
    );
}
