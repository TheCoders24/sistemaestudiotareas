const CACHE_NAME = 'estudioapp-v1'
const urlsToCache = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => {
        if (name !== CACHE_NAME) return caches.delete(name)
      }))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request).then((res) => {
        if (res.type === 'basic') {
          const resClone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone))
        }
        return res
      })
    )
  )
})
