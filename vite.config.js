import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            outDir: 'public/build', // Default Vite build output
            manifest: {
                name: 'Beresin App',
                short_name: 'Beresin',
                description: 'Jasa Joki Tugas Terpercaya',
                theme_color: '#FFC107',
                background_color: '#ffffff',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/logo-192x192.png', // We need to generate these
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/logo-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                // Workbox options for push notifications
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
            },
            devOptions: {
                enabled: true
            }
        })
    ],
});
