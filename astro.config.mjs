import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/drafts/'),
      serialize(item) {
        // Blog posts: weekly updates, high priority
        if (item.url.includes('/max/blog/') && item.url !== 'https://www.northlakelabs.com/max/blog/') {
          return {
            ...item,
            changefreq: 'weekly',
            priority: 0.8,
            lastmod: new Date().toISOString(),
          };
        }
        // Blog index and /max terminal: frequent, high priority
        if (item.url.includes('/max/')) {
          return {
            ...item,
            changefreq: 'daily',
            priority: 0.9,
          };
        }
        // Home page: highest priority
        if (item.url === 'https://www.northlakelabs.com/') {
          return {
            ...item,
            changefreq: 'weekly',
            priority: 1.0,
          };
        }
        // Other pages
        return {
          ...item,
          changefreq: 'monthly',
          priority: 0.6,
        };
      },
    }),
  ],
  output: 'static',
  site: 'https://www.northlakelabs.com',
  trailingSlash: 'ignore',
  experimental: {
    // Astro 6.0 Rust compiler — replaces Go compiler for faster builds
    // Requires: npm install @astrojs/compiler-rs
    // Note: Does not auto-fix invalid HTML nesting; Dev Toolbar audits limited in 6.0
    // Planned to become default in Astro 7.0
    rustCompiler: true,
  },
});
