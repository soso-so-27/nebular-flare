// Simple sound synthesis utility for satisfying button feedback
// Uses Web Audio API for lightweight, instantaneous sounds
// Handles mobile browser autoplay restrictions

let audioContext: AudioContext | null = null;
let isUnlocked = false;

// iOS fallback: Pre-loaded Audio elements
// Base64 encoded short beep sounds
const BEEP_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQARj8PO1Z5NExNrl7vSt30kADqDsNPJkkcLA0yEqMnKnlkPADJ4pM3EjD8SCz5vos/MnFgOAC9vn83Jkz4RDjZnns7QnlwQAC5nn83MmEMTDjFhm8zRo2MSAC1hm8zOmUYVDy5dlsjTqGgUACxelsfNmEQUECxcksfTq2oVACpck8bMl0IUECpakMTSrG0WACpZj8TNmEQUEClXjcLQrG0WACdYjMLNl0IUEChVir/PrGwXAqZWir/OmEQTECdTh77OrGwXAqZVh77OmEQTECZShrLMrmwYAqRUhrPNmEQTDyVRhLDLrmwYAqNThbPNmEQTDyRQg6/KrmwYAqNSg7DOmUUTDyROgq7JrWwZAqJRgq/NmUUTDyNOga3IrWwZAqFQga7NmUYTDiJMf6zHrG0ZAqBPf6zMmUYTDiFMfqvGrG0aAp9OfqzLmkYSDiBLfKrFq20aAp5NfavLm0YSDh9Ke6nFq24aAp1Me6rKm0YSDR5KeanEqm4bApxLeanKnUcSDR1JeKjDqm4bAptKeafKnkcSDRxIdqfCqW8cAplJdqbJnkgRDBtHdabBqW8cAphIdKXInkgRDBpGc6XAqHAcApdHc6THnkkRCxpFcqS/qHAdAZZGcqPHn0kRCxlEcaO+p3AdAZVFcaLGn0oRChpDcKK+pnEeAZREb6LFoEoRChpDb6G9pXIeAZNDb6DFoUsQChlBbqC8pHIfAZJCbaDF oUsQCRlAbqC8pHIfAZFBbJ+9o3MfAZBBbJ+8onQg';

// Pool of pre-created Audio elements for reuse
let audioPool: HTMLAudioElement[] = [];
let poolIndex = 0;

function getPooledAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    // Create pool on first use
    if (audioPool.length === 0) {
        for (let i = 0; i < 5; i++) {
            const audio = new Audio(BEEP_SOUND);
            audio.preload = 'auto';
            audio.volume = 0.3;
            audioPool.push(audio);
        }
    }

    // Round-robin through the pool
    const audio = audioPool[poolIndex];
    poolIndex = (poolIndex + 1) % audioPool.length;
    return audio;
}

// Detect iOS
function isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

// Must be called on user gesture to unlock audio on mobile
export async function unlockAudio(): Promise<boolean> {
    const ctx = getAudioContext();
    if (!ctx) return false;

    // Already unlocked
    if (isUnlocked && ctx.state === 'running') return true;

    try {
        // iOS requires resume() to be called during user gesture
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Play a silent sound via Web Audio API to fully unlock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        // iOS additional workaround: Also touch an HTML Audio element
        // This helps with iOS lock screen audio resumption
        const silentAudio = document.getElementById('silent-audio-unlock') as HTMLAudioElement;
        if (silentAudio) {
            try {
                await silentAudio.play();
                silentAudio.pause();
            } catch (e) {
                // Ignore - this is just a fallback
            }
        }

        isUnlocked = true;
        console.log('[Audio] Unlocked successfully, state:', ctx.state);
        return true;
    } catch (e) {
        console.warn('[Audio] Failed to unlock:', e);
        return false;
    }
}

// Check if audio is ready
export function isAudioUnlocked(): boolean {
    return isUnlocked;
}

// Helper to ensure audio is unlocked before playing
// iOS Safari may re-suspend AudioContext, so we check every time
async function ensureUnlocked(): Promise<AudioContext | null> {
    const ctx = getAudioContext();
    if (!ctx) {
        console.warn('[Audio] No AudioContext available');
        return null;
    }

    // Always check state - iOS can re-suspend at any time
    if (ctx.state === 'suspended') {
        console.log('[Audio] Context suspended, attempting resume...');
        try {
            await ctx.resume();
            console.log('[Audio] Context resumed, state:', ctx.state);
        } catch (e) {
            console.error('[Audio] Failed to resume:', e);
            return null;
        }
    }

    // Double-check state after resume attempt
    if (ctx.state !== 'running') {
        console.warn('[Audio] Context still not running:', ctx.state);
        // Try one more time
        try {
            await ctx.resume();
        } catch (e) {
            console.error('[Audio] Second resume attempt failed:', e);
        }
    }

    return ctx;
}

export const sounds = {
    // Pop sound - like a bubble popping
    pop: async () => {
        // iOS fallback: Use pre-loaded Audio element
        if (isIOS()) {
            const audio = getPooledAudio();
            if (audio) {
                try {
                    audio.currentTime = 0;
                    await audio.play();
                    console.log('[Audio] pop played (iOS fallback)');
                    return;
                } catch (e) {
                    console.warn('[Audio] iOS audio fallback failed:', e);
                }
            }
        }

        const ctx = await ensureUnlocked();
        if (!ctx) {
            console.warn('[Audio] pop: No context');
            return;
        }

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
            console.log('[Audio] pop played');
        } catch (e) {
            console.error('[Audio] pop error:', e);
        }
    },

    // Click sound - sharp and snappy
    click: async () => {
        // iOS fallback: Use pre-loaded Audio element
        if (isIOS()) {
            const audio = getPooledAudio();
            if (audio) {
                try {
                    audio.currentTime = 0;
                    await audio.play();
                    console.log('[Audio] click played (iOS fallback)');
                    return;
                } catch (e) {
                    console.warn('[Audio] iOS audio fallback failed:', e);
                }
            }
        }

        const ctx = await ensureUnlocked();
        if (!ctx) {
            console.warn('[Audio] click: No context');
            return;
        }

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
            console.log('[Audio] click played (Web Audio)');
        } catch (e) {
            console.error('[Audio] click error:', e);
        }
    },

    // Success chime - happy ascending tone
    success: async () => {
        // iOS fallback: Use pre-loaded Audio element
        if (isIOS()) {
            const audio = getPooledAudio();
            if (audio) {
                try {
                    audio.currentTime = 0;
                    await audio.play();
                    console.log('[Audio] success played (iOS fallback)');
                    return;
                } catch (e) {
                    console.warn('[Audio] iOS audio fallback failed:', e);
                }
            }
        }

        const ctx = await ensureUnlocked();
        if (!ctx) {
            console.warn('[Audio] success: No context');
            return;
        }

        try {
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            const now = ctx.currentTime;

            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);

                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };

                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.2);
            });
            console.log('[Audio] success played');
        } catch (e) {
            console.error('[Audio] success error:', e);
        }
    },

    // Bounce sound - playful spring
    bounce: async () => {
        const ctx = await ensureUnlocked();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },

    // Toggle on - soft ascending
    toggleOn: async () => {
        const ctx = await ensureUnlocked();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    },

    // Toggle off - soft descending
    toggleOff: async () => {
        const ctx = await ensureUnlocked();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    },
};
