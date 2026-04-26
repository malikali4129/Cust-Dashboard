const CACHE_VERSION = 'v7';
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

        // Never serve a redirect from cache — Safari blocks redirect responses
        const cachedIsRedirect = cached && cached.redirected;
        if (cachedIsRedirect) {
            await cache.delete(request);
        }

        const fetchPromise = fetch(request).then((response) => {
            // Only cache fresh, non-redirect, OK responses
            if (response.ok && !response.redirected) {
                cache.put(request, response.clone());
            }
            return response;
        }).catch(() => null);

        // If cache has a valid (non-redirect) response, return it immediately
        if (cached && !cachedIsRedirect) {
            return cached;
        }

        // Wait for the network response
        const networkResponse = await fetchPromise;

        // Online — return the network response
        if (networkResponse) {
            return networkResponse;
        }

        // Offline + no cache — return a minimal offline fallback
        return new Response(
            '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666"><h2>You are offline</h2><p>Please connect to the internet to load this page.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    });
}