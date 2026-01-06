// Simple sound synthesis utility for satisfying button feedback
// Simplified for maximum iOS compatibility

let audioContext: AudioContext | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
        if (!audioContext) {
            // Use standard AudioContext
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
            }
        }
        return audioContext;
    } catch (e) {
        console.error('[Audio] Failed to create context:', e);
        return null;
    }
}

// Ensure AudioContext is running
async function resumeContext(ctx: AudioContext): Promise<boolean> {
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
            console.log('[Audio] Resumed context, state:', ctx.state);
        } catch (e) {
            console.error('[Audio] Failed to resume context:', e);
            return false;
        }
    }
    return ctx.state === 'running';
}

// Unlock audio on first user interaction
export async function unlockAudio(): Promise<boolean> {
    const ctx = getAudioContext();
    if (!ctx) return false;

    // Try to resume
    await resumeContext(ctx);

    // Play a silent buffer to force unlock
    try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        // Also try the HTML audio workaround
        const silentAudio = document.getElementById('silent-audio-unlock') as HTMLAudioElement;
        if (silentAudio) {
            silentAudio.play().catch(() => { });
        }

        isUnlocked = true;
        console.log('[Audio] Unlocked successfully');
        return true;
    } catch (e) {
        console.error('[Audio] Unlock failed:', e);
        return false;
    }
}

export function isAudioUnlocked(): boolean {
    return isUnlocked;
}

// Generic sound player that handles node creation/cleanup properly
const playTone = async (
    freqStart: number,
    freqEnd: number,
    details: {
        duration: number,
        type?: OscillatorType,
        volStart?: number,
        volEnd?: number
    }
) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Important: Always try to resume context on iOS before playing
    await resumeContext(ctx);

    try {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = details.type || 'sine';
        osc.frequency.setValueAtTime(freqStart, t);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, t + details.duration);

        gain.gain.setValueAtTime(details.volStart ?? 0.3, t);
        gain.gain.exponentialRampToValueAtTime(details.volEnd ?? 0.01, t + details.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + details.duration);

        // Schedule cleanup
        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, (details.duration + 0.1) * 1000);

    } catch (e) {
        console.error('[Audio] Play error:', e);
    }
};

export const sounds = {
    pop: () => playTone(400, 150, { duration: 0.1 }),
    click: () => playTone(600, 200, { duration: 0.05, type: 'square', volStart: 0.2 }),
    bounce: () => playTone(800, 400, { duration: 0.15, volStart: 0.25 }),
    toggleOn: () => playTone(300, 500, { duration: 0.1, volStart: 0.2 }),
    toggleOff: () => playTone(500, 300, { duration: 0.1, volStart: 0.2 }),

    success: async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        await resumeContext(ctx);

        const now = ctx.currentTime;
        const tones = [523.25, 659.25, 783.99]; // C E G

        tones.forEach((freq, i) => {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.frequency.setValueAtTime(freq, now + i * 0.1);

                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.3);

                setTimeout(() => {
                    osc.disconnect();
                    gain.disconnect();
                }, 500);
            } catch (e) {
                console.error('[Audio] Success tone error:', e);
            }
        });
    }
};
