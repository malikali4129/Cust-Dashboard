const CACHE_VERSION = 'v5';
const SHELL_CACHE = `dashboard-shell-${CACHE_VERSION}`;
const FONT_CACHE = `dashboard-fonts-${CACHE_VERSION}`;

const SHELL_ASSETS = [
    './',
    './index.html',
    './admin.html',
    './style.css',
    './config.js',
    './data.js',
    './script.js',
    './dashboard.js',
    './admin.js',
    './manifest.webmanifest'
];

const FONT_ORIGINS = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
];

// ─── Install: pre-cache shell ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

// ─── Activate: purge old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key.startsWith('dashboard-') && key !== SHELL_CACHE && key !== FONT_CACHE)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// ─── Fetch: handle different request types ──────────────────────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Skip cross-origin requests except for Google Fonts
    if (url.origin !== self.location.origin && !FONT_ORIGINS.includes(url.origin)) {
        return;
    }

    // Google Fonts: stale-while-revalidate
    if (FONT_ORIGINS.includes(url.origin)) {
        event.respondWith(staleWhileRevalidate(event.request, FONT_CACHE));
        return;
    }

    // Shell assets: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
});

function staleWhileRevalidate(request, cacheName) {
    return caches.open(cacheName).then(async (cache) => {
        const cached = await cache.match(request);

        const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        }).catch(() => {
            // Network failed — cached response (if any) will be returned below
        });

        // Return cached immediately; network update happens in background
        return cached || fetchPromise;
    });
}