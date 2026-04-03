const CACHE_NAME = 'chat-claude-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json'
];

// Instalar: cachear el shell de la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: shell desde cache, API siempre desde red
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Las llamadas a la API nunca se cachean
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para el shell: cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cachear respuestas exitosas del shell
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
