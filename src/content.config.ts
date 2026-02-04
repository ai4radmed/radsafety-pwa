import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

const findings_recommendations = defineCollection({
	// loader: glob(...) causes item.render is not a function. Revert to legacy type: 'content'.
	type: 'content',
	schema: z.object({
		title: z.string(),
		category: z.string().optional(), // Make optional as we move to tags
		tags: z.array(z.string()).optional(), // New: Multiple categories
		inspectionYear: z.string().optional(), // New: Year string (e.g. "2024")
		reference: z.array(z.string()).optional(),
		severity: z.enum(["high", "medium", "low"]).optional(),
		date: z.coerce.date().optional(), // Keep for fallback sorting if needed
	}),
});

export const collections = { inspection_prep, findings_recommendations };
