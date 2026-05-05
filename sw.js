const CACHE = 'copa2026-static-v1';

// Só cacheia assets estáticos que nunca mudam (ícones)
// HTML, JS e CSS sempre vêm da rede para garantir atualizações
const STATIC = ['/copa2026/icon-192.png', '/copa2026/icon-512.png', '/copa2026/logo-fifa.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML, JS, CSS — sempre da rede, nunca do cache
  if (url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.json') ||
      url.pathname === '/copa2026/' ||
      url.pathname === '/copa2026') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Imagens: cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
