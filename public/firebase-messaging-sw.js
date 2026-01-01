/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These must match your client-side config, or rely on hardcoded if env vars aren't available in SW (Next.js env vars are build time, so usually OK, but SW scope is different)
// Better to check if we can import config or just hardcode for this file since it's static.
// For now, I'll use placeholders that the user might need to fill, OR I can try to read from a shared config if I make this a template.
// Actually, `firebase-messaging-sw.js` accepts `self.firebaseConfig` if initialized from main thread? No.

// Recommended strategy: Hardcode for now, or use a script to generate this file during build.
// Since I can't read .env here easily without build steps, I will leave placeholders or rely on "default" if the hosting provider injects them (unlikely).
// I will assume the user needs to paste their config here or I'll try to find values from `src/lib/firebase.ts` if I can read them (I can't run TS here).

// Let's look at `src/lib/firebase.ts` again... I saw process.env calls.
// I will create a basic worker that just handles background events if initialized.
// Wait, `firebase-messaging-sw.js` needs explicit initialization.

const firebaseConfig = {
    apiKey: "dummy-api-key-replace-me", // TODO: Replace with real keys or set up build process
    projectId: "dummy-project-id",
    messagingSenderId: "dummy-sender-id",
    appId: "dummy-app-id",
};

// Initialize only if config is valid (prevent crash on dummy)
if (firebaseConfig.projectId !== "dummy-project-id") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);

        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/icon.svg' // Customize icon
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} else {
    console.warn("Firebase Config not set in service worker.");
}
