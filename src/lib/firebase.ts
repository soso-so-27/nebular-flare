import { initializeApp, getApps, getApp } from "firebase/app";
import { fcmLogger } from "@/lib/logger";

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
let app: ReturnType<typeof initializeApp> | null = null;
if (firebaseConfig.apiKey) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    } catch (e) {
        fcmLogger.error('Firebase initialization failed', e);
    }
}

export const requestFcmToken = async () => {
    fcmLogger.debug('Starting token request...');

    if (typeof window === 'undefined') {
        fcmLogger.debug('Skipped: window is undefined (SSR)');
        return null;
    }

    if (!app) {
        fcmLogger.debug('Skipped: Firebase app not initialized. Check env vars.');
        return null;
    }

    try {
        fcmLogger.debug('Importing firebase/messaging...');
        const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

        fcmLogger.debug('Checking if messaging is supported...');
        const supported = await isSupported();
        fcmLogger.debug('isSupported:', supported);

        if (!supported) {
            fcmLogger.debug('Firebase Messaging is not supported in this browser/device.');
            return null;
        }

        fcmLogger.debug('Getting messaging instance...');
        const messaging = getMessaging(app);

        fcmLogger.debug('Waiting for Service Worker to be ready...');
        const registration = await navigator.serviceWorker.ready;
        fcmLogger.debug('Service Worker ready');

        fcmLogger.debug('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        fcmLogger.debug('Permission status:', permission);

        if (permission !== 'granted') {
            fcmLogger.debug('Notification permission denied by user');
            return null;
        }

        fcmLogger.debug('Getting FCM token...');
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
            fcmLogger.debug('Token retrieved successfully');
            return currentToken;
        } else {
            fcmLogger.debug('No registration token available.');
            return null;
        }
    } catch (err: unknown) {
        fcmLogger.error('Token retrieval failed:', err);
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
        fcmLogger.error('Failed to get messaging', e);
    }
    return null;
};

