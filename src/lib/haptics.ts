export const haptics = {
    // Basic vibration patterns (ms)
    // Note: iOS Safari does not support navigator.vibrate.
    // If wrapped in Capacitor/Cordova later, this can be swapped for native calls.

    // Light impact (e.g. tab switch, toggles)
    impactLight: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    // Medium impact (e.g. button press)
    impactMedium: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    // Heavy impact (e.g. critical action)
    impactHeavy: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    },

    // Success notification (Double tap)
    success: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([10, 50, 10]);
        }
    },

    // Error notification (Longer double)
    error: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
    },

    // Custom pattern
    vibrate: (pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
};

export function triggerFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
    switch (type) {
        case 'light': haptics.impactLight(); break;
        case 'medium': haptics.impactMedium(); break;
        case 'heavy': haptics.impactHeavy(); break;
        case 'success': haptics.success(); break;
        case 'error': haptics.error(); break;
    }
}
