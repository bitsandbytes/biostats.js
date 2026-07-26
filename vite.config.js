import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
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
});
