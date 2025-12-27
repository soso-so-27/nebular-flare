import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App only (safe for SSR usually, but guard it)
let app: any = null;
if (firebaseConfig.apiKey) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    } catch (e) {
        console.error('Firebase initialization failed', e);
    }
}

export const requestFcmToken = async () => {
    if (typeof window === 'undefined' || !app) return null;

    try {
        const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

        const supported = await isSupported();
        if (!supported) {
            console.log('Firebase Messaging is not supported in this browser.');
            return null;
        }

        const messaging = getMessaging(app);

        // Get existing service worker registration
        const registration = await navigator.serviceWorker.ready;

        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
            return currentToken;
        } else {
            console.log('No registration token available.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token.', err);
        return null;
    }
};

export const getFirebaseMessaging = async () => {
    if (typeof window === 'undefined' || !app) return null;

    try {
        const { getMessaging, isSupported } = await import("firebase/messaging");
        const supported = await isSupported();
        if (supported) {
            return getMessaging(app);
        }
    } catch (e) {
        console.error('Failed to get messaging', e);
    }
    return null;
};
