const CACHE_NAME = 'clinical-research-graph-shell-v2.0.0'
const APP_SHELL = [
  './', './index.html', './assets/css/styles.css',
  './assets/js/app.js', './assets/js/api.js', './assets/js/config.js',
  './assets/js/dictionary.js', './assets/js/normalizer.js', './assets/js/storage.js',
  './assets/js/federated.js', './assets/js/graph.js',
  './assets/favicon.svg', './manifest.webmanifest'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.hostname === 'clinicaltrials.gov') return

  // 多源 JSON 快照必须优先读取网络，避免 GitHub 已更新而浏览器仍显示旧快照。
  if (url.pathname.includes('/data/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')))
    return
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
    return response
  })))
})
