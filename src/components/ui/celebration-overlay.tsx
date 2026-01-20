import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Heart } from "lucide-react";

interface CelebrationOverlayProps {
    isActive: boolean;
    onComplete: () => void;
    tapPosition?: { x: number; y: number };
    catAvatar?: string;
    catName?: string;
    reactionMessage: string;
    footprintTargetRef?: React.RefObject<HTMLElement>;
}

// Natural, context-aware cat reactions
export const COMPLETION_REACTIONS: Record<string, string[]> = {
    'care_food': ["うまうまだにゃ！", "お腹いっぱい...むにゃ", "次も待ってるにゃ", "さすが下僕、わかってるにゃ"],
    'care_water': ["新鮮なお水、最高だにゃ", "んく、んく...ぷはぁ！", "潤ったにゃ"],
    'care_litter': ["スッキリしたにゃ", "お掃除ありがとにゃ", "きれいなのが一番だにゃ"],
    'care_play': ["まだまだ遊ぶにゃ！", "今日はこのくらいにしてやるにゃ", "ハンターの血が騒ぐにゃ"],
    'care_brush': ["気持ちいい〜", "ふわふわだにゃ", "一生やってほしいにゃ"],
    'care_medicine': ["がんばった自分を褒めたいにゃ", "にがにが...でも我慢したにゃ"],
    'care_clip': ["手先が軽やかだにゃ", "引っかからなくて快適だにゃ"],
    'default': ["ありがとにゃ！", "嬉しいにゃ！", "最高だにゃ！", "ゴロゴロ..."]
};

export function getRandomReaction(taskId: string): string {
    const baseId = taskId.split(':')[0];
    const reactions = COMPLETION_REACTIONS[baseId] || COMPLETION_REACTIONS['default'];
    return reactions[Math.floor(Math.random() * reactions.length)];
}

// High-fidelity Paw Component
export function PawIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <circle cx="12" cy="14" r="5" />
            <circle cx="6" cy="8" r="3" />
            <circle cx="10" cy="5" r="3" />
            <circle cx="14" cy="5" r="3" />
            <circle cx="18" cy="8" r="3" />
        </svg>
    );
}

// Sparkle particle for varied burst
export function SparkleParticle({ delay, angle, distance }: { delay: number; angle: number; distance: number }) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;

    return (
        <motion.div
            className="absolute text-yellow-200"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: x,
                y: y,
            }}
            transition={{
                duration: 0.8,
                delay: delay,
                ease: "easeOut"
            }}
        >
            <div className="w-1 h-1 bg-white rounded-full blur-[1px] shadow-[0_0_8px_white]" />
        </motion.div>
    );
}

// Paw particle component with enhanced spring motion
export function PawParticle({ delay, angle, distance }: { delay: number; angle: number; distance: number }) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;

    return (
        <motion.div
            className="absolute text-[#E8B4A0]"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: angle }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.8],
                x: x,
                y: y,
                rotate: angle + (Math.random() * 60 - 30)
            }}
            transition={{
                duration: 0.6,
                delay: delay,
                ease: [0.23, 1, 0.32, 1] // Apple-like ease
            }}
        >
            <PawIcon className="w-6 h-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)]" />
        </motion.div>
    );
}

export function CelebrationOverlay({
    isActive,
    onComplete,
    tapPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    catAvatar,
    catName = "ねこ",
    reactionMessage,
    footprintTargetRef
}: CelebrationOverlayProps) {
    const [phase, setPhase] = useState<'burst' | 'reaction' | 'accumulate' | 'done'>('burst');
    const [mounted, setMounted] = useState(false);
    const onCompleteRef = useRef(onComplete);

    // Keep ref updated with latest callback
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isActive) {
            setPhase('burst');
            return;
        }

        // Phase transitions - use ref to avoid dependency on onComplete
        const timer1 = setTimeout(() => setPhase('reaction'), 300);
        const timer2 = setTimeout(() => setPhase('accumulate'), 1500);
        const timer3 = setTimeout(() => {
            setPhase('done');
            onCompleteRef.current();
        }, 2300);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [isActive]); // Only depend on isActive, not onComplete

    if (!mounted || !isActive) return null;

    const content = (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    className="fixed inset-0 z-[20000] pointer-events-none"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Phase 1: Burst - Paw particles from tap position */}
                    {(phase === 'burst' || phase === 'reaction') && (
                        <div
                            className="absolute"
                            style={{ left: tapPosition.x, top: tapPosition.y }}
                        >
                            {/* Mixed Particles: Paws + Sparkles */}
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                                <React.Fragment key={angle}>
                                    <PawParticle
                                        angle={angle}
                                        distance={60 + (i % 2) * 20}
                                        delay={i * 0.02}
                                    />
                                    <SparkleParticle
                                        angle={angle + 22.5}
                                        distance={80 + (i % 2) * 30}
                                        delay={i * 0.03}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Phase 2: Reaction - Top-positioned minimal feedback */}
                    <AnimatePresence>
                        {phase === 'reaction' && (
                            <motion.div
                                className="absolute left-1/2 top-24 -translate-x-1/2"
                                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        {catAvatar ? (
                                            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/40 shadow-2xl">
                                                <img src={catAvatar} alt={catName} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl backdrop-blur-xl border-4 border-white/30">
                                                😺
                                            </div>
                                        )}
                                        <motion.div
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-[#E8B4A0] rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                                        >
                                            <Heart className="w-3 h-3 text-white fill-current" />
                                        </motion.div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-white font-black tracking-[0.3em] uppercase opacity-60 drop-shadow-md">
                                            All Requests Done
                                        </p>
                                        <p className="text-white font-black text-sm drop-shadow-md">{catName}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Phase 3: Accumulate - Footprint flying up to Magic Bubble */}
                    <AnimatePresence>
                        {phase === 'accumulate' && (
                            <motion.div
                                className="absolute text-[#E8B4A0]"
                                initial={{
                                    left: tapPosition.x,
                                    top: tapPosition.y,
                                    scale: 1,
                                    opacity: 1,
                                    rotate: 0
                                }}
                                animate={{
                                    left: window.innerWidth - 48,
                                    top: window.innerHeight - 48, // Target: Bottom Right Magic Bubble area
                                    scale: [1, 1.4, 0.4],
                                    opacity: [1, 1, 0],
                                    rotate: 360
                                }}
                                transition={{
                                    duration: 0.8,
                                    ease: [0.45, 0, 0.55, 1] // Natural arc-like ease
                                }}
                            >
                                <PawIcon className="w-10 h-10 drop-shadow-[0_0_15px_rgba(232,180,160,0.5)]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}
