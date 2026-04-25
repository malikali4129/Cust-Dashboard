const CACHE_NAME = 'dashboard-shell-v2';
const ASSETS = [
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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                if (cached) {
                    return cached;
                }
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                throw new Error('Offline and not cached.');
            })
    );
});
