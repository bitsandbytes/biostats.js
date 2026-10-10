import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolveApiBase, isMockMode } from './src/lib/apiBase.js';

export default defineConfig(({ command, mode }) => {
    if (command === 'build') {
        // VITE_API_BASE_URL is compiled into the bundle, and the deployed site
        // (a static-assets Cloudflare Worker) can't change it at runtime, so
        // check it here. Values from process.env, such as Cloudflare build
        // variables, take priority over .env files.
        const raw = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL;
        const base = resolveApiBase(raw); // throws on a malformed value
        if (isMockMode(raw)) {
            console.warn('\n⚠ VITE_API_BASE_URL=mock: this build uses MSW mock data, not a backend.\n');
        } else if (base === '') {
            console.warn(
                '\n⚠ VITE_API_BASE_URL is empty: this build calls same-origin /api/*. ' +
                'That works with `vite preview` (dev proxy) but not on a static-only host.\n',
            );
        } else {
            console.log(`API base URL: ${base}`);
        }
    }

    return {
        plugins: [svelte(), basicSsl()],
        server: {
            https: true,
            proxy: {
                '/api': {
                    target: 'https://localhost:9443',
                    secure: false,
                },
            },
        },
    };
});
