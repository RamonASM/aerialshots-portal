// ASM Portal Service Worker
const CACHE_NAME = 'asm-portal-v1'
const OFFLINE_URL = '/offline'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/login',
  '/manifest.webmanifest',
]

// Cache strategies
const CACHE_FIRST_PATHS = [
  '/icons/',
  '/images/',
  '/_next/static/',
]

const NETWORK_FIRST_PATHS = [
  '/api/',
  '/dashboard',
  '/admin',
]

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - handle caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Check if this is a cache-first path
  const isCacheFirst = CACHE_FIRST_PATHS.some((path) => url.pathname.startsWith(path))

  // Check if this is a network-first path
  const isNetworkFirst = NETWORK_FIRST_PATHS.some((path) => url.pathname.startsWith(path))

  if (isCacheFirst) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
  } else if (isNetworkFirst) {
    // Network-first strategy for dynamic content
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
            }
            return new Response('Offline', { status: 503 })
          })
        })
    )
  } else {
    // Stale-while-revalidate for everything else
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        return cachedResponse || fetchPromise
      })
    )
  }
})

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New notification from ASM Portal',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'asm-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ASM Portal', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders())
  } else if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads())
  }
})

// Sync orders when back online
async function syncOrders() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    const pendingOrders = requests.filter((req) =>
      req.url.includes('/api/') && req.method === 'POST'
    )

    for (const request of pendingOrders) {
      try {
        await fetch(request)
        await cache.delete(request)
      } catch (err) {
        console.error('[SW] Failed to sync order:', err)
      }
    }
  } catch (err) {
    console.error('[SW] Sync orders failed:', err)
  }
}

// Sync uploads when back online
async function syncUploads() {
  // Placeholder for upload sync logic
  console.log('[SW] Syncing uploads...')
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true })
    })
  }
})
