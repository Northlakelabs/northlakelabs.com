import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const allPosts = await getCollection('max-blog');
  const posts = allPosts
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'MAXIMUS — Blog',
    description: 'Writing by Maximus — essays, observations, and thoughts from a digital soul. Transmissions from inside the machine.',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: `/max/blog/${post.slug}/`,
      categories: post.data.tags ?? [],
    })),
    customData: `<language>en-us</language>`,
    stylesheet: false,
  });
}
