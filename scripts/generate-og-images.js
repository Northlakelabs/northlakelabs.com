#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const blogDir = path.join(projectRoot, 'src', 'content', 'max-blog');
const ogDir = path.join(projectRoot, 'public', 'og');

// Warm Tactical colors
const colors = {
  amber: '#E8A826',
  charcoal: '#141C24',
  copper: '#D4813F',
  slate: '#222F3E',
  warmGray: '#9CA3A8',
};

// Ensure output directory exists
await fs.mkdir(ogDir, { recursive: true });

const generateOGImageSVG = (title, excerpt, date) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const displayTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;
  const displayExcerpt = excerpt.length > 140 ? excerpt.substring(0, 137) + '...' : excerpt;

  // Escape XML entities
  const escapeXml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Calculate text wrapping
  const wrapText = (text, maxWidth = 50) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length > maxWidth) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    if (currentLine) lines.push(currentLine.trim());
    
    return lines;
  };

  const titleLines = wrapText(displayTitle, 45);
  const excerptLines = wrapText(displayExcerpt, 65);

  let titleY = 140;
  const titleLineHeight = 80;
  const titleLinesHTML = titleLines
    .slice(0, 3) // Max 3 lines for title
    .map((line, i) => `<tspan x="60" dy="${i === 0 ? '0' : titleLineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  let excerptY = titleY + titleLineHeight * Math.min(titleLines.length, 3) + 40;
  const excerptLineHeight = 36;
  const excerptLinesHTML = excerptLines
    .slice(0, 3) // Max 3 lines for excerpt
    .map((line, i) => `<tspan x="60" dy="${i === 0 ? '0' : excerptLineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="${colors.charcoal}"/>
  
  <!-- Top line separator -->
  <line x1="60" y1="80" x2="1140" y2="80" stroke="${colors.slate}" stroke-width="1" opacity="0.5"/>
  
  <!-- Aperture watermark -->
  <g opacity="0.2" font-family="monospace" font-size="14" fill="${colors.copper}">
    <text x="1080" y="50">◐ ◑ ◒ ◓</text>
  </g>
  
  <!-- Title -->
  <text font-family="monospace" font-size="72" font-weight="bold" fill="${colors.amber}" x="60" y="140">
    ${titleLinesHTML}
  </text>
  
  <!-- Excerpt -->
  <text font-family="monospace" font-size="32" fill="${colors.warmGray}" x="60" y="${excerptY}">
    ${excerptLinesHTML}
  </text>
  
  <!-- Footer line -->
  <line x1="60" y1="560" x2="1140" y2="560" stroke="${colors.slate}" stroke-width="1" opacity="0.5"/>
  
  <!-- Date -->
  <text font-family="monospace" font-size="18" fill="${colors.copper}" x="60" y="600">
    ${escapeXml(formattedDate)}
  </text>
  
  <!-- Branding -->
  <text font-family="monospace" font-size="18" font-weight="bold" fill="${colors.amber}" x="1140" y="600" text-anchor="end">
    northlakelabs.com/max
  </text>
</svg>`;
};

const generateOGImage = async (post) => {
  const { title, excerpt, date, draft } = post.data;
  const slug = post.slug;
  
  // Skip drafts
  if (draft) return null;
  
  try {
    const svg = generateOGImageSVG(title, excerpt, date);
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90, compression: 9 })
      .toBuffer();
    
    // Save PNG
    const filename = `${slug}.png`;
    const filepath = path.join(ogDir, filename);
    await fs.writeFile(filepath, pngBuffer);
    
    console.log(`✓ Generated: /og/${filename}`);
    return `/og/${filename}`;
  } catch (error) {
    console.error(`✗ Failed to generate OG image for "${slug}":`, error.message);
    return null;
  }
};

// Parse markdown files
const parseMarkdownFile = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data } = matter(content);
  
  // Extract slug from filename
  const slug = path.basename(filePath, '.md');
  
  return {
    slug,
    data: {
      title: data.title || 'Untitled',
      excerpt: data.excerpt || '',
      date: data.date || new Date(),
      draft: data.draft || false,
    },
  };
};

// Main execution
const main = async () => {
  try {
    console.log('📸 Generating Open Graph images for blog posts...\n');

    // List all markdown files in max-blog
    const files = await fs.readdir(blogDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');

    console.log(`Found ${mdFiles.length} markdown files\n`);

    let generated = 0;
    let skipped = 0;

    // Generate images for each post
    for (const file of mdFiles) {
      const filePath = path.join(blogDir, file);
      const post = await parseMarkdownFile(filePath);
      
      const imagePath = await generateOGImage(post);
      if (imagePath) {
        generated++;
      } else if (post.data.draft) {
        skipped++;
      }
    }

    console.log(`\n✓ OG image generation complete!`);
    console.log(`Generated: ${generated}, Skipped (draft): ${skipped}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
