// VitePress config for the developer docs, published to GitHub Pages by
// .github/workflows/docs.yml. `base` must match the Pages path (/<repo>/).
// Dead internal links fail `npm run docs:build` (VitePress's default).
import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/bitsandbytes/biostats.js';

export default defineConfig({
  title: 'biostats.js',
  description: 'Developer docs for the biostats.js frontend',
  base: '/biostats.js/',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/biostats.js/favicon.svg' }]],

  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'API reference', link: '/api' },
      { text: 'Backend docs', link: 'https://bitsandbytes.github.io/biostats-service/' },
    ],
    sidebar: [
      {
        text: 'Developer docs',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Build & deploy', link: '/build-and-deploy' },
          { text: 'Backend integration', link: '/integration' },
          { text: 'API reference (Swagger)', link: '/api' },
          { text: 'Working on these docs', link: '/contributing-docs' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: REPO }],
    editLink: { pattern: `${REPO}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
    search: { provider: 'local' },
    outline: [2, 3],
  },
});
