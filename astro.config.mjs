// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

const SITE_URL = 'https://turn1visuals.com';

export default defineConfig({
  site: SITE_URL,
  redirects: {
    '/f1-2026-assets': '/f1-2026-assets/index.html',
  },
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()]
  }
});
