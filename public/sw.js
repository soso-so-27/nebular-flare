// CatUp Service Worker with Offline Support
// Handles: Firebase Messaging + Offline Caching
// NOTE: This file is generated at build time. Do not edit directly.

// Cache versioning - Build hash will be injected
const CACHE_VERSION = '952da867';
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
const firebaseConfig = {"apiKey":"AIzaSyALDASAVoX6kKGt6I16mMbw-2cqE98Ylrw","authDomain":"catup-notification.firebaseapp.com","projectId":"catup-notification","storageBucket":"catup-notification.firebasestorage.app","messagingSenderId":"712780316086","appId":"1:712780316086:web:66f55c4bcda6ef10865517","measurementId":"G-ZFTDH8TDF8"};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background message', payload);

    // Read from data payload (data-only message from Edge Function)
    const data = payload.data || {};
    const notificationTitle = data.title || payload.notification?.title || 'CatUp';
    const notificationBody = data.body || payload.notification?.body || '';
    const notificationIcon = data.icon || '/icon.svg';

    const notificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        badge: '/icon.svg',
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
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
