import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  amber: '#E8A826',
  charcoal: '#141C24',
  copper: '#D4813F',
  slate: '#222F3E',
  warmGray: '#9CA3A8',
};

export async function getStaticPaths() {
  const posts = await getCollection('max-blog');
  return posts
    .filter(post => !post.data.draft)
    .map(post => ({
      params: { slug: post.slug },
      props: { post },
    }));
}

export async function GET({ props }: any) {
  const { post } = props;
  const { title, excerpt, date } = post.data;

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Truncate title and excerpt
  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displayExcerpt = excerpt.length > 120 ? excerpt.substring(0, 117) + '...' : excerpt;

  // Load font
  const fontPath = new URL('../../../public/fonts/IBMPlexMono-Regular.ttf', import.meta.url);
  const fontData = await fs.readFile(fontPath);

  // Generate SVG
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          backgroundColor: colors.charcoal,
          fontFamily: 'IBMPlexMono',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '20px',
                right: '40px',
                fontSize: '11px',
                color: colors.copper,
                opacity: 0.3,
                fontFamily: 'IBMPlexMono',
              },
              children: '◐ ◑ ◒ ◓',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                flex: 1,
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'h1',
                  props: {
                    style: {
                      color: colors.amber,
                      fontSize: '56px',
                      fontWeight: 'bold',
                      margin: '0',
                      lineHeight: '1.2',
                      maxWidth: '100%',
                      fontFamily: 'IBMPlexMono',
                    },
                    children: displayTitle,
                  },
                },
                {
                  type: 'p',
                  props: {
                    style: {
                      color: colors.warmGray,
                      fontSize: '24px',
                      margin: '0',
                      lineHeight: '1.4',
                      maxWidth: '100%',
                      fontFamily: 'IBMPlexMono',
                    },
                    children: displayExcerpt,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${colors.slate}`,
                paddingTop: '20px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      color: colors.copper,
                      fontSize: '16px',
                      fontFamily: 'IBMPlexMono',
                    },
                    children: formattedDate,
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: colors.amber,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      fontFamily: 'IBMPlexMono',
                    },
                    children: 'northlakelabs.com/max',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'IBMPlexMono',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );

  // Convert to PNG
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 90, compression: 9 })
    .toBuffer();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
