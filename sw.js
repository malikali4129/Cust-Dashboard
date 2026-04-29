const CACHE_VERSION = 'v28';
const SHELL_CACHE = `dash-shell-${CACHE_VERSION}`;
const DATA_CACHE = `dash-data-${CACHE_VERSION}`;
const OFFLINE_CACHE = `dash-offline-${CACHE_VERSION}`;

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

// Pre-cache data routes for offline (these will be populated on first successful fetch)
const DATA_ROUTES = [
    '/rest/v1/announcements',
    '/rest/v1/assignments',
    '/rest/v1/deadlines',
    '/rest/v1/quizzes',
    '/rest/v1/settings'
];

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(async (cache) => {
            for (const asset of SHELL_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn(`[SW] Shell cache ${asset}:`, err.message);
                }
            }
        }).then(() => {
            // Also open data and offline caches for future use
            return Promise.all([
                caches.open(DATA_CACHE),
                caches.open(OFFLINE_CACHE)
            ]);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) =>
                    key.startsWith('dash-') &&
                    key !== SHELL_CACHE &&
                    key !== DATA_CACHE &&
                    key !== OFFLINE_CACHE
                )
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim()))
    );
});

// Message handler for client
self.addEventListener('message', (event) => {
    if (event.data?.type === 'skipWaiting') {
        self.skipWaiting();
    }
    // Return cache version to client
    if (event.data?.type === 'getVersion') {
        event.ports[0]?.postMessage({ version: CACHE_VERSION });
    }
    // Handle cache data request from client
    if (event.data?.type === 'cacheData') {
        const { url, data } = event.data;
        if (url && data) {
            caches.open(DATA_CACHE).then((cache) => {
                const response = new Response(JSON.stringify(data), {
                    headers: { 'Content-Type': 'application/json' }
                });
                cache.put(url, response);
            });
        }
    }
});

// Fetch handler
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Skip cross-origin except fonts
    if (url.origin !== self.location.origin && !FONT_ORIGINS.includes(url.origin)) {
        return;
    }

    // Google Fonts: stale-while-revalidate
    if (FONT_ORIGINS.includes(url.origin)) {
        event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
        return;
    }

    // API requests (Supabase): cache-first with network fallback
    if (url.host.includes('supabase') || url.pathname.startsWith('/rest/v1/')) {
        event.respondWith(cacheFirstNetworkFallback(event.request, DATA_CACHE));
        return;
    }

    // Shell assets: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
});

// Cache-first: serve from cache, fallback to network, update cache
async function cacheFirstNetworkFallback(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Return cached immediately, then try to update in background
        fetchAndCache(request, cache).catch(() => {});
        return cachedResponse;
    }

    // No cache - try network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Network failed - try to find any cached API response
        const fallback = await findApiFallback(cache, request.url);
        if (fallback) {
            return fallback;
        }

        // Return empty data response for API endpoints
        const path = new URL(request.url).pathname;
        if (path.includes('/announcements')) {
            return jsonResponse([]);
        }
        if (path.includes('/assignments')) {
            return jsonResponse([]);
        }
        if (path.includes('/deadlines')) {
            return jsonResponse([]);
        }
        if (path.includes('/quizzes')) {
            return jsonResponse([]);
        }
        if (path.includes('/settings')) {
            return jsonResponse([{ id: 1, last_updated: null }]);
        }

        // No fallback available - return offline page
        return offlinePage();
    }
}

// Find any cached API response as fallback
async function findApiFallback(cache, urlPath) {
    const keys = await cache.keys();
    for (const key of keys) {
        if (key.url.includes(urlPath.split('?')[0])) {
            const response = await cache.match(key);
            if (response) {
                return response;
            }
        }
    }
    return null;
}

// Stale-while-revalidate: serve cached, fetch update in background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Check for redirect and clear if found
    if (cachedResponse?.redirected) {
        await cache.delete(request);
    }

    if (cachedResponse && !cachedResponse.redirected) {
        // Return cached immediately
        fetchAndCache(request, cache).catch(() => {});
        return cachedResponse;
    }

    // No cache - try network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && !networkResponse.redirected) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Try fallback HTML page
        const fallback = await findHtmlFallback(cache);
        if (fallback) {
            return fallback;
        }
        return offlinePage();
    }
}

// Find any cached HTML page
async function findHtmlFallback(cache) {
    const keys = await cache.keys();
    for (const key of keys) {
        if (key.url.endsWith('.html') || key.url.endsWith('/')) {
            const response = await cache.match(key);
            if (response && !response.redirected) {
                return response;
            }
        }
    }
    return null;
}

// Background fetch and cache
async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok && !response.redirected) {
            cache.put(request, response.clone());
        }
    } catch (error) {
        // Ignore network errors
    }
}

// Helper: create JSON response
function jsonResponse(data) {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Offline page response
function offlinePage() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Offline - My Cust</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0b0f19;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            text-align: center;
            padding: 2rem;
        }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #c4b5fd; }
        p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; max-width: 300px; }
        .icon { width: 48px; height: 48px; margin-bottom: 1.5rem; opacity: 0.5; }
        button {
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            border: none;
            background: #6366f1;
            color: white;
            font-size: 1rem;
            cursor: pointer;
        }
        button:hover { background: #818cf8; }
    </style>
</head>
<body>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 2l20 20M8.5 5.5A7 7 0 0 1 18 9c-3.75 3.75-7 7-7 11m-4-7a7 7 0 0 1 7 7"/>
    </svg>
    <h1>You are offline</h1>
    <p>Connect to the internet to load fresh data. Cached content is available when online.</p>
    <button onclick="window.location.reload()">Retry</button>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}