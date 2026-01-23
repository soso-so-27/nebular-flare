/**
 * Debug logging utility that respects environment
 * In production, logs are suppressed to prevent PII exposure and improve performance
 */

const isDev = typeof window !== 'undefined'
    ? window.location.hostname === 'localhost'
    : process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

function createLogger(prefix: string): Logger {
    const log = (level: LogLevel, ...args: unknown[]) => {
        // Always show errors
        if (level === 'error') {
            console.error(`[${prefix}]`, ...args);
            return;
        }

        // Always show warnings
        if (level === 'warn') {
            console.warn(`[${prefix}]`, ...args);
            return;
        }

        // Only show debug/info in development
        if (!isDev) return;

        if (level === 'info') {
            console.info(`[${prefix}]`, ...args);
        } else {
            console.log(`[${prefix}]`, ...args);
        }
    };

    return {
        debug: (...args) => log('debug', ...args),
        info: (...args) => log('info', ...args),
        warn: (...args) => log('warn', ...args),
        error: (...args) => log('error', ...args),
    };
}

// Pre-configured loggers for common modules
export const fcmLogger = createLogger('FCM');
export const dbLogger = createLogger('DB');
export const audioLogger = createLogger('Audio');
export const notificationLogger = createLogger('Notification');
export const onboardingLogger = createLogger('Onboarding');

// Additional loggers for code cleanup
export const storeLogger = createLogger('Store');
export const hooksLogger = createLogger('Hooks');
export const componentsLogger = createLogger('UI');
export const storageLogger = createLogger('Storage');
export const authLogger = createLogger('Auth');

export { createLogger, isDev };
