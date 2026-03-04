import { z, defineCollection } from 'astro:content';

const visuals = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Race weekend name, e.g. "Bahrain Grand Prix"
    race: z.string().optional(),
    // F1 season year
    season: z.number().optional(),
    // Type of visual
    category: z.enum(['race-result', 'qualifying', 'standings', 'sprint', 'other']).default('other'),
    date: z.coerce.date(),
    // Filename inside public/images/visuals/, e.g. "bahrain-2025-result.jpg"
    image: z.string(),
    // Show this on the homepage recent visuals section
    featured: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    author: z.string().default('Turn1Visuals'),
    tags: z.array(z.string()).default([]),
    // Optional cover image filename in public/images/articles/
    cover: z.string().optional(),
  }),
});

export const collections = { visuals, articles };
