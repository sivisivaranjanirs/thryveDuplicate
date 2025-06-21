const CACHE_NAME = 'thryve-v1';
const STATIC_CACHE_NAME = 'thryve-static-v1';
const DYNAMIC_CACHE_NAME = 'thryve-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls and external APIs - always go to network
  if (request.url.includes('supabase.co') || 
      request.url.includes('api-inference.huggingface.co') ||
      request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response for caching
            const responseToCache = networkResponse.clone();

            // Determine which cache to use
            const isStaticAsset = request.url.includes('.js') || 
                                 request.url.includes('.css') || 
                                 request.url.includes('.png') || 
                                 request.url.includes('.jpg') || 
                                 request.url.includes('.svg') ||
                                 request.url.includes('.ico');

            const cacheName = isStaticAsset ? STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;

            // Cache the response
            caches.open(cacheName)
              .then((cache) => {
                console.log('Service Worker: Caching new resource', request.url);
                cache.put(request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Network failed, try to serve a meaningful offline response
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // For other requests, return a generic offline response
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'This feature requires an internet connection' 
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
      })
  );
});

// Handle background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'health-metrics-sync') {
    event.waitUntil(
      // Future: sync offline health metrics when back online
      console.log('Service Worker: Syncing health metrics...')
    );
  }
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);
  
  let notificationData = {
    title: 'Thryve Health Update',
    body: 'New health update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      timestamp: Date.now(),
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    tag: 'thryve-notification',
    requireInteraction: false
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
      // Fallback to text content
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'close') {
    // Just close the notification (already handled above)
    return;
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event);
  
  // Track notification dismissal if needed
  // This could be used for analytics or to avoid showing similar notifications
});