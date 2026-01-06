// Simple sound synthesis utility for satisfying button feedback
// Uses Web Audio API for lightweight, instantaneous sounds
// Handles mobile browser autoplay restrictions

let audioContext: AudioContext | null = null;
let isUnlocked = false;

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
        const ctx = await ensureUnlocked();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    },

    // Click sound - sharp and snappy
    click: async () => {
        const ctx = await ensureUnlocked();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    },

    // Success chime - happy ascending tone
    success: async () => {
        const ctx = await ensureUnlocked();
        if (!ctx) return;

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

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
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
