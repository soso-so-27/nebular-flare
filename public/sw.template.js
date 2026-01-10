// CatUp Service Worker with Offline Support
// Handles: Firebase Messaging + Offline Caching
// NOTE: This file is generated at build time. Do not edit directly.

// Cache versioning - Build hash will be injected
const CACHE_VERSION = '__BUILD_HASH__';
const STATIC_CACHE = `catup-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `catup-dynamic-${CACHE_VERSION}`;
const API_CACHE = `catup-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/icon.svg',
    '/manifest.json'
];

// Firebase Cloud Messaging Setup
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase config injected at build time
const firebaseConfig = __FIREBASE_CONFIG__;

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] onBackgroundMessage received:', JSON.stringify(payload));

    // Read from data payload (data-only message from Edge Function)
    const data = payload.data || {};
    const notificationTitle = data.title || payload.notification?.title || 'CatUp';
    const notificationBody = data.body || payload.notification?.body || '';
    const notificationIcon = data.icon || '/icon.svg';

    const notificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        badge: '/icon.svg',
        tag: 'catup-notification-' + Date.now(),
        renotify: true,
    };

    console.log('[sw.js] Showing notification:', notificationTitle, notificationOptions);
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback push handler (in case Firebase SDK doesn't catch it)
self.addEventListener('push', (event) => {
    console.log('[sw.js] Push event received:', event);

    // If Firebase SDK handled it, this might be a duplicate
    // Check if payload exists
    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('[sw.js] Push payload:', JSON.stringify(payload));

            // Only show if notification field exists and Firebase didn't auto-show
            if (payload.notification) {
                const title = payload.notification.title || 'CatUp';
                const body = payload.notification.body || '';

                event.waitUntil(
                    self.registration.showNotification(title, {
                        body: body,
                        icon: '/icon.svg',
                        badge: '/icon.svg',
                        tag: 'catup-push-' + Date.now(),
                    })
                );
            }
        } catch (e) {
            console.log('[sw.js] Push data parse error:', e);
        }
    }
});


// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[sw.js] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[sw.js] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[sw.js] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => {
                    return key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE;
                }).map((key) => {
                    console.log('[sw.js] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network First with Fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension, websocket, etc.
    if (!url.protocol.startsWith('http')) return;

    // Skip Supabase API (auth, realtime)
    if (url.hostname.includes('supabase.co')) {
        return; // Let these pass through without caching
    }

    // Strategy: Network First with Cache Fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone response before caching
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request).then((cached) => {
                    if (cached) {
                        return cached;
                    }
                    // If navigating, show offline page
                    if (request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                    // Return nothing for other failed requests
                    return new Response('Offline', { status: 503, statusText: 'Offline' });
                });
            })
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Test notification handler (from client postMessage)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TEST_NOTIFICATION') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: '/icon.svg',
            badge: '/icon.svg',
        });
    }
});
