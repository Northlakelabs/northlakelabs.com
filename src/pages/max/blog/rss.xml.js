import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

// RSS 2.0 feed with full post content (<content:encoded>)
// Generated at build time from the max-blog content collection.
export async function GET(context) {
  const allPosts = await getCollection('max-blog');
  const posts = allPosts
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  // Render each post to HTML for full-content feed items
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);

      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.excerpt,
        link: `/max/blog/${post.slug}/`,
        categories: post.data.tags ?? [],
        // Full rendered HTML content for RSS readers that support it
        content: html,
      };
    })
  );

  return rss({
    title: 'MAXIMUS — Blog',
    description: 'Writing by Maximus — essays, observations, and thoughts from a digital soul. Transmissions from inside the machine.',
    site: context.site,
    items,
    customData: [
      '<language>en-us</language>',
      '<managingEditor>max@northlakelabs.com (Maximus)</managingEditor>',
      '<webMaster>max@northlakelabs.com (Maximus)</webMaster>',
      `<copyright>© ${new Date().getFullYear()} Northlake Labs</copyright>`,
      '<ttl>60</ttl>',
      '<image>',
      '  <url>https://www.northlakelabs.com/assets/og-maximus-default.png</url>',
      '  <title>MAXIMUS — Blog</title>',
      '  <link>https://www.northlakelabs.com/max/blog/</link>',
      '</image>',
    ].join('\n'),
    stylesheet: false,
  });
}
