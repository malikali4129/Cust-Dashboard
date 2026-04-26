const CACHE_VERSION = 'v8';
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

// ─── Install: pre-cache shell (per-asset so one failure doesn't block all) ──
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(async (cache) => {
            for (const asset of SHELL_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    // Per-asset failure — log and continue (assets may succeed on next load)
                    console.warn(`[SW] Could not cache ${asset}:`, err.message);
                }
            }
        })
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

        // If cache has a valid (non-redirect) response, return it immediately
        if (cached && !cachedIsRedirect) {
            // Even if online, return cached immediately for speed
            fetchAndCache(request, cache).catch(() => {});
            return cached;
        }

        // No valid cache — try network
        try {
            const response = await fetch(request);
            if (response.ok && !response.redirected) {
                cache.put(request, response.clone());
            }
            return response;
        } catch (_) {
            // Offline + no cache — try to serve ANY cached HTML page as last resort
            const entries = await cache.keys();
            for (const req of entries) {
                if (req.url.endsWith('.html') || req.url.endsWith('/')) {
                    const fallback = await cache.match(req);
                    if (fallback && !fallback.redirected) {
                        return fallback;
                    }
                }
            }
            // Truly nothing cached — return a minimal offline page
            return new Response(
                '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0b0f19;color:#e2e8f0;flex-direction:column;text-align:center;padding:2rem}svg{width:48px;height:48px;margin-bottom:1.5rem;opacity:.4}h2{font-size:1.5rem;margin:0 0 .75rem;font-weight:700;color:#c4b5fd}p{color:#94a3b8;font-size:.95rem;margin:0;max-width:300px;line-height:1.6}</style></head><body><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2l20 20M8.5 5.5A7 7 0 0 1 18 9c-3.75 3.75-7 7-7 11m-4-7a7 7 0 0 1 7 7"/></svg><h2>You are offline</h2><p>Connect to the internet to load this page. Cached content is available when online.</p></body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        }
    });
}

async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok && !response.redirected) {
            cache.put(request, response.clone());
        }
    } catch (_) {
        // Network failed — that's fine, we already served the cached response
    }
}