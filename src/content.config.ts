import { defineCollection, z } from 'astro:content';

// Blog collection removed
const inspection_prep = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        category: z.string().optional(),
        importance: z.string().optional(),
        order: z.number().optional(),
        resourceId: z.number().optional(),
        // Support example/exampleImage if used in frontmatter
        example: z.string().optional(),
        exampleImage: z.string().optional(),
    }),
});

const smart_resources = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        category: z.string().optional(),
        order: z.number().optional(),
    }),
});

export const collections = { inspection_prep, smart_resources };
