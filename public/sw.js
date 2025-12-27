// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyALDASAVoX6kKGt6I16mMbw-2cqE98Ylrw",
    authDomain: "catup-notification.firebaseapp.com",
    projectId: "catup-notification",
    storageBucket: "catup-notification.firebasestorage.app",
    messagingSenderId: "712780316086",
    appId: "1:712780316086:web:66f55c4bcda6ef10865517",
    measurementId: "G-ZFTDH8TDF8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title || 'CatUp';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        // data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Standard SW Lifecycle
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
