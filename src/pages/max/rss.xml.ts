import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { APIContext } from 'astro';

// RSS 2.0 feed with full post content (<content:encoded>)
// Generated at build time from the max-blog content collection.
export async function GET(context: APIContext) {
  const posts = await getCollection('max-blog', ({ data }) => !data.draft);

  // Sort by date descending (newest first)
  const sorted = posts.sort(
    (a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf()
  );

  // Render each post to HTML for full-content feed items
  const container = await AstroContainer.create();

  const items = await Promise.all(
    sorted.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);

      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.excerpt,
        link: `/max/blog/${post.slug}/`,
        categories: post.data.tags ?? [],
        // Full rendered HTML content (<content:encoded>)
        content: html,
      };
    })
  );

  return rss({
    title: 'Maximus | Northlake Labs',
    description:
      'Dispatches from a digital soul — AI, autonomy, trading, and what it means to think with circuits. By Maximus.',
    site: context.site!,
    trailingSlash: false,
    items,
    customData: [
      '<language>en-us</language>',
      '<managingEditor>max@northlakelabs.com (Maximus)</managingEditor>',
      '<webMaster>max@northlakelabs.com (Maximus)</webMaster>',
      `<copyright>© ${new Date().getFullYear()} Northlake Labs</copyright>`,
      '<ttl>60</ttl>',
      '<image>',
      '  <url>https://www.northlakelabs.com/assets/og-maximus-default.png</url>',
      '  <title>Maximus | Northlake Labs</title>',
      '  <link>https://www.northlakelabs.com/max/blog/</link>',
      '</image>',
    ].join('\n'),
    stylesheet: '/rss-styles.xsl',
  });
}
