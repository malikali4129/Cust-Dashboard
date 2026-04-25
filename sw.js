const SHELL_CACHE = 'dashboard-shell-v3';
const API_CACHE = 'dashboard-api-v1';

const SHELL_ASSETS = [
    './',
    './index.html',
    './admin.html',
    './style.css',
    './config.js',
    './data.js',
    './cache.js',
    './script.js',
    './dashboard.js',
    './admin.js',
    './manifest.webmanifest'
];

// API endpoints to cache
const API_PATTERNS = [
    /\/rest\/v1\/announcements/,
    /\/rest\/v1\/assignments/,
    /\/rest\/v1\/deadlines/,
    /\/rest\/v1\/quizzes/,
    /\/rest\/v1\/settings/,
    /\/auth\/v1\/token/
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
                .map((key) => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Check if this is an API request
    const isApiRequest = API_PATTERNS.some(pattern => pattern.test(url.pathname));

    if (isApiRequest) {
        // API request strategy: Network first, fallback to cache
        event.respondWith(handleApiRequest(request));
    } else {
        // Static asset strategy: Cache first, fallback to network
        event.respondWith(handleStaticRequest(request));
    }
});

async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the fresh response
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
            
            // Update cache metadata
            await updateCacheMetadata(request.url);
            
            return networkResponse;
        }
        
        // If network fails but returned a response (e.g., 4xx/5xx), throw
        throw new Error(`API request failed: ${networkResponse.status}`);
    } catch (error) {
        // Network failed or returned error - try cache
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Add a header to indicate this is cached data
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Cached-Data', 'true');
            headers.set('X-Cached-Time', new Date().toISOString());
            
            return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers
            });
        }
        
        // No cache available - return offline error for API
        return new Response(
            JSON.stringify({ 
                error: 'You are offline and no cached data is available.',
                offline: true 
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

async function handleStaticRequest(request) {
    const cache = await caches.open(SHELL_CACHE);
    
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Fallback to network
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache for future use
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }
        
        return networkResponse;
    } catch (error) {
        // If navigation request, return offline page
        if (request.mode === 'navigate') {
            return cache.match('./index.html');
        }
        
        throw error;
    }
}

async function updateCacheMetadata(url) {
    try {
        const cache = await caches.open(API_CACHE);
        const metaKey = new Request(`${url}.meta`);
        const meta = {
            url: url.toString(),
            timestamp: Date.now(),
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        
        await cache.put(metaKey, new Response(JSON.stringify(meta), {
            headers: { 'Content-Type': 'application/json' }
        }));
    } catch (error) {
        console.warn('Failed to update cache metadata:', error);
    }
}

// Background sync for offline writes
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-writes') {
        event.waitUntil(syncOfflineWrites());
    }
});

async function syncOfflineWrites() {
    // This would sync queued write operations
    // Implementation depends on your offline queue system
    console.log('Background sync triggered');
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cleanup-old-cache') {
        event.waitUntil(cleanupOldCache());
    }
});

async function cleanupOldCache() {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();
    
    const now = Date.now();
    const cleanupPromises = requests.map(async (request) => {
        if (request.url.endsWith('.meta')) {
            const response = await cache.match(request);
            if (response) {
                const meta = await response.json();
                if (meta.expires && meta.expires < now) {
                    // Delete expired cache entry
                    await cache.delete(request);
                    // Also delete the actual data
                    const dataRequest = new Request(meta.url);
                    await cache.delete(dataRequest);
                }
            }
        }
    });
    
    await Promise.all(cleanupPromises);
}
