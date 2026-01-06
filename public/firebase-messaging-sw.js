/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration - MUST match client-side config
const firebaseConfig = {
    apiKey: "AIzaSyALDASAVoX6kKGt6I16mMbw-2cqE98Ylrw",
    authDomain: "catup-notification.firebaseapp.com",
    projectId: "catup-notification",
    storageBucket: "catup-notification.firebasestorage.app",
    messagingSenderId: "712780316086",
    appId: "1:712780316086:web:66f55c4bcda6ef10865517",
    measurementId: "G-ZFTDH8TDF8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'CatUp 通知';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'catup-notification',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If a window is already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Handle push events directly (for cases where onBackgroundMessage doesn't fire)
self.addEventListener('push', function (event) {
    console.log('[firebase-messaging-sw.js] Push event received:', event);

    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('[firebase-messaging-sw.js] Push payload:', payload);

            // Only show notification if we have notification data
            if (payload.notification) {
                const notificationTitle = payload.notification.title || 'CatUp';
                const notificationOptions = {
                    body: payload.notification.body || '',
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    tag: 'catup-push',
                    data: payload.data
                };

                event.waitUntil(
                    self.registration.showNotification(notificationTitle, notificationOptions)
                );
            }
        } catch (e) {
            console.error('[firebase-messaging-sw.js] Error parsing push data:', e);
        }
    }
});
