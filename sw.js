// ─── AUTO-INVALIDATION: Bump BUILD_DATE any time you deploy changes ───────────
// Format: YYYYMMDD_vNNN  — This single change forces ALL student devices to
// automatically download the new Service Worker and clear the old cache.
// Students NEVER need to manually clear their browser cache.
const BUILD_DATE = '20261127_v248';
const CACHE_NAME = `topscore-cache-${BUILD_DATE}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './test.html',
  './result.html',
  './offline.html',
  './tutor.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  './css/style.css?v=20261119_v631',
  './css/dashboard.css?v=20261119_v631',
  './css/auth.css?v=20261125_v680',
  './css/test.css?v=20261121_v555',
  './css/result.css?v=20261125_v685',
  './css/tutor.css?v=20261123_v50',
  './css/components/avatars.css?v=20261028',
  './js/app.js?v=20261029',
  './js/api.js?v=20261127_v689',
  './js/auth.js?v=20261125_v680',
  './js/dashboard.js?v=20261127_v692',
  './js/tutor.js?v=20261123_v50',
  './js/test.js?v=20261127_v692',
  './js/result.js?v=20261127_v692',
  './js/session.js?v=20261108_v162',
  './js/supabase.js?v=20261121_v161',
  './js/indonesia-regions.js?v=20261117_v547',
  './js/grading.js?v=20261127_v692',
  './js/vendor/supabase.js',
  './js/vendor/xlsx.full.min.js?v=20261027d',
  './js/vendor/html2pdf.bundle.min.js?v=20261119_v1',
  './js/wake-lock.js?v=20261027d',
  './js/pwa.js?v=20261125_v681'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Resilient Pre-caching: Do not fail-stop if a single non-essential asset or slow network occurs
      const promises = ASSETS_TO_CACHE.map(async asset => {
        try {
          const res = await fetch(asset, { cache: 'no-cache' });
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn('[SW] Non-fatal precache failure for:', asset, err);
        }
      });
      await Promise.allSettled(promises);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim().catch(() => {});
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
  if (event.data === 'PURGE_CACHE' || (event.data && event.data.type === 'PURGE_CACHE')) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ done: true });
    });
  }
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return; // Bypass chrome-extension:// and other non-HTTP schemes
  }
  // Skip caching API/Supabase calls
  if (event.request.url.includes('supabase.co')) return;

  const url = new URL(event.request.url);
  // Bypass third-party origins (Google Fonts, CDNs) so browser loads them natively via <link> without Service Worker connect-src CSP restrictions
  if (url.origin !== self.location.origin) return;

  // Bypass Service Worker entirely for Admin & Tutor console to ensure zero-stale cache
  if (url.pathname.includes('admin') || url.pathname.includes('/admin/') || url.pathname.includes('tutor')) return;

  const isDoc = event.request.destination === 'document' || url.pathname.endsWith('.html');
  const isScript = event.request.destination === 'script' || url.pathname.endsWith('.js');
  const isStyle = event.request.destination === 'style' || url.pathname.endsWith('.css');
  const isCodeOrDoc = isDoc || isScript || isStyle;

  if (isCodeOrDoc) {
    // Network-First with Fast Timeout (2500ms) for HTML documents, scripts, and stylesheets
    // Guarantees zero-stale code updates propagate immediately when online,
    // while gracefully falling back to cache if offline or slow network.
    event.respondWith(
      new Promise(resolve => {
        let timedOut = false;
        const timer = setTimeout(async () => {
          timedOut = true;
          const cached = await caches.match(event.request);
          if (cached) return resolve(cached);
          if (isDoc) {
            const offlineResp = await caches.match('./offline.html');
            if (offlineResp) return resolve(offlineResp);
          }
          resolve(new Response('', { status: 408, statusText: 'Network Timeout' }));
        }, 2500);

        // Force no-cache for all code assets (HTML, JS, CSS) so HTTP cache
        // never serves stale files even if the Service Worker update is pending.
        fetch(event.request, { cache: 'no-cache' })
          .then(response => {
            if (!timedOut) {
              clearTimeout(timer);
              if (response && response.status === 200 && response.type === 'basic' && event.request.url.startsWith('http')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
              }
              resolve(response);
            }
          })
          .catch(async () => {
            if (!timedOut) {
              clearTimeout(timer);
              const cached = await caches.match(event.request);
              if (cached) return resolve(cached);
              if (isDoc) {
                const offlineResp = await caches.match('./offline.html');
                if (offlineResp) return resolve(offlineResp);
              }
              resolve(new Response('', { status: 408, statusText: 'Network Failed or Offline' }));
            }
          });
      })
    );
    return;
  }

  // Cache-first for other static assets (images, fonts, static css)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      return new Response('', { status: 404, statusText: 'Not Found' });
    })
  );
});
