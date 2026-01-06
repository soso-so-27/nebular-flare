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
    console.log('[FCM] Starting token request...');

    if (typeof window === 'undefined') {
        console.log('[FCM] Skipped: window is undefined (SSR)');
        return null;
    }

    if (!app) {
        console.log('[FCM] Skipped: Firebase app not initialized. Check env vars.');
        alert('[FCM] Firebase not initialized');
        return null;
    }

    try {
        console.log('[FCM] Importing firebase/messaging...');
        const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

        console.log('[FCM] Checking if messaging is supported...');
        const supported = await isSupported();
        console.log('[FCM] isSupported:', supported);

        if (!supported) {
            console.log('[FCM] Firebase Messaging is not supported in this browser/device.');
            alert('[FCM] このブラウザはプッシュ通知に対応していません');
            return null;
        }

        console.log('[FCM] Getting messaging instance...');
        const messaging = getMessaging(app);

        console.log('[FCM] Waiting for Service Worker to be ready...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[FCM] Service Worker ready:', registration.scope);

        console.log('[FCM] Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('[FCM] Permission status:', permission);

        if (permission !== 'granted') {
            console.log('[FCM] Notification permission denied by user');
            alert('[FCM] 通知の許可が拒否されました');
            return null;
        }

        console.log('[FCM] Getting FCM token with VAPID:', process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.substring(0, 20) + '...');
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
            console.log('[FCM] Token retrieved successfully:', currentToken.substring(0, 20) + '...');
            return currentToken;
        } else {
            console.log('[FCM] No registration token available.');
            alert('[FCM] トークンが空です');
            return null;
        }
    } catch (err: any) {
        console.error('[FCM] Token retrieval failed:', err);
        alert('[FCM] エラー: ' + (err?.message || err));
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
