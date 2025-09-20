// Service Worker for Push Notifications
// Erasmos App - 2025

const CACHE_NAME = 'erasmos-sw-v1';

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker: Installing');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Service Worker: Caching essential files');
            // Only cache files that actually exist
            return cache.addAll([
                '/'
            ]);
        })
    );

    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Activating');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    // Claim all clients immediately
    self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('📱 Service Worker: Push notification received');

    let notificationData = {
        title: '🔔 Erasmos',
        body: 'Νέα ειδοποίηση',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'erasmos-default',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'Προβολή'
            },
            {
                action: 'dismiss',
                title: 'Απόρριψη'
            }
        ]
    };

    // Parse push data if available
    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('📱 Push payload:', payload);

            // Merge with received data
            notificationData = {
                ...notificationData,
                ...payload,
                // Ensure data object exists
                data: {
                    url: '/',
                    timestamp: Date.now(),
                    ...payload.data
                }
            };
        } catch (error) {
            console.error('📱 Failed to parse push data:', error);
            // Use text content as body if JSON parsing fails
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    // Show notification
    const notificationPromise = self.registration.showNotification(
        notificationData.title,
        {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            actions: notificationData.actions,
            data: notificationData.data,
            silent: false,
            vibrate: [200, 100, 200]
        }
    );

    event.waitUntil(notificationPromise);
});

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Service Worker: Notification clicked');

    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    // Close the notification
    notification.close();

    if (action === 'dismiss') {
        console.log('❌ User dismissed notification');
        return;
    }

    // Determine URL to open
    let urlToOpen = data.url || '/';

    // Ensure URL is absolute
    if (!urlToOpen.startsWith('http')) {
        urlToOpen = self.location.origin + urlToOpen;
    }

    console.log('🔗 Opening URL:', urlToOpen);

    // Handle notification click
    const clientPromise = event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Look for existing Erasmos window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin)) {
                    // Focus existing window and navigate to URL
                    if (data.url && data.url !== '/') {
                        client.postMessage({
                            type: 'NAVIGATE',
                            url: data.url
                        });
                    }
                    return client.focus();
                }
            }

            // No existing window found, open new one
            return clients.openWindow(urlToOpen);
        })
    );

    event.waitUntil(clientPromise);
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
    console.log('💬 Service Worker: Message received:', event.data);

    const { type, data } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME,
                timestamp: Date.now()
            });
            break;

        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.delete(CACHE_NAME).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;

        default:
            console.log('❓ Unknown message type:', type);
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Service Worker unhandled rejection:', event.reason);
});

console.log('✅ Service Worker: Script loaded successfully');