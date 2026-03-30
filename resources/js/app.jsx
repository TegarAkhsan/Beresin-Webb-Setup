import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route } from 'ziggy-js';
import { Ziggy } from './ziggy';

// Priority for Ziggy: Use window.location.origin if it exists, otherwise fallback to imported Ziggy
const ziggyUrl = typeof window !== 'undefined' ? window.location.origin : Ziggy.url;
window.Ziggy = { ...Ziggy, url: ziggyUrl };
window.route = (name, params, absolute, config) => route(name, params, absolute, config || window.Ziggy);
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    registerSW({ immediate: true });
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
