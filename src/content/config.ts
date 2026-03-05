import { defineCollection, z } from 'astro:content';

const maxBlogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    image: z.string().optional(), // OG image URL or path
    series: z.string().optional(), // Series name (e.g. "Project ICARUS")
    seriesOrder: z.number().optional(), // Position in series (1-indexed)
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string(),
    author: z.string().default('Northlake Labs'),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    image: z.string().optional(),
  }),
});

const maxProjectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    date: z.date(),
    status: z.enum(['active', 'live', 'paused', 'complete']),
    tags: z.array(z.string()).optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string(),
    })).optional(),
    order: z.number().optional(),
  }),
});

export const collections = {
  'max-blog': maxBlogCollection,
  'blog': blogCollection,
  'max-projects': maxProjectsCollection,
};
