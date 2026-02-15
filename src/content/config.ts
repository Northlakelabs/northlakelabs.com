import { defineCollection, z } from 'astro:content';

const maxBlogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  'max-blog': maxBlogCollection,
};
