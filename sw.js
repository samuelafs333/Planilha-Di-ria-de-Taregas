const CACHE_NAME = 'planilha-tarefas-v4.3';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css?v=4.2',
    './manifest.json',
    './assets/icon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './motivo1.jpg',
    './motivo2.jpg',
    './js/state.js',
    './js/ui.js',
    './js/rpg.js',
    './js/tasks.js',
    './js/pomodoro.js',
    './js/shop.js',
    './js/history.js',
    './js/motivation.js',
    './js/main.js',
    './js/sync.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Precache parcial:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Estratégia Network-First para arquivos do app (garante atualizações rápidas e fallback offline)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.hostname === 'tarefas.2-29-212-239.sslip.io') return;
    if (url.origin !== self.location.origin) {
        // CDN externa (fontes, ícones, confetes): cache-first com atualização em background
        event.respondWith(
            caches.match(req).then((cached) => {
                const networkFetch = fetch(req)
                    .then((response) => {
                        if (response && response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || networkFetch;
            })
        );
        return;
    }

    event.respondWith(
        fetch(req)
            .then((response) => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return response;
            })
            .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
});

// Listener para cliques em notificações
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('./');
        })
    );
});
