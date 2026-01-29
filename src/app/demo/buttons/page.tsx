"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Heart, Star, Plus, Bell, Settings, Sparkles, Zap, Volume2, Vibrate } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";

// Demo page showcasing satisfying button interactions
export default function ButtonDemoPage() {
    const [counter, setCounter] = useState(0);
    const [liked, setLiked] = useState(false);
    const [starred, setStarred] = useState(false);
    const [toggled, setToggled] = useState(false);
    const [completed, setCompleted] = useState<string[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticEnabled, setHapticEnabled] = useState(true);

    const playSound = async (sound: () => Promise<void>) => {
        if (soundEnabled) {
            try {
                await sound();
            } catch (e) {
                console.warn('Sound failed:', e);
            }
        }
    };

    const playHaptic = (haptic: () => void) => {
        if (hapticEnabled) haptic();
    };

    const handleFeedback = async (sound: () => Promise<void>, haptic: () => void) => {
        playHaptic(haptic);
        await playSound(sound);
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 pb-20">
            <div className="max-w-md mx-auto space-y-8">
                {/* Header */}
                <div className="text-center pt-8">
                    <h1 className="text-2xl font-bold text-white mb-2">✨ Satisfying Buttons</h1>
                    <p className="text-purple-300 text-sm">タップして気持ち良さを体験</p>
                </div>

                {/* Settings */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${soundEnabled ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'
                            }`}
                    >
                        <Volume2 className="w-4 h-4" />
                        Sound
                    </button>
                    <button
                        onClick={() => setHapticEnabled(!hapticEnabled)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${hapticEnabled ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'
                            }`}
                    >
                        <Vibrate className="w-4 h-4" />
                        Haptic
                    </button>
                </div>

                {/* 1. Bouncy Counter Button */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 space-y-4">
                    <h2 className="text-white font-semibold">🎯 Bouncy Counter</h2>
                    <div className="flex items-center justify-center gap-4">
                        <motion.button
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            onClick={() => {
                                setCounter(Math.max(0, counter - 1));
                                handleFeedback(sounds.click, haptics.impactLight);
                            }}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white text-2xl font-bold shadow-lg shadow-rose-500/30"
                        >
                            −
                        </motion.button>
                        <motion.div
                            key={counter}
                            initial={{ scale: 1.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-5xl font-bold text-white w-20 text-center"
                        >
                            {counter}
                        </motion.div>
                        <motion.button
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            onClick={() => {
                                setCounter(counter + 1);
                                handleFeedback(sounds.pop, haptics.impactMedium);
                            }}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7CAA8E] to-[#5A8A6A] text-white text-2xl font-bold shadow-lg shadow-[#7CAA8E]/30"
                        >
                            +
                        </motion.button>
                    </div>
                </div>

                {/* 2. Like & Star Buttons */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 space-y-4">
                    <h2 className="text-white font-semibold">❤️ Like & Favorite</h2>
                    <div className="flex justify-center gap-6">
                        <motion.button
                            whileTap={{ scale: 0.75 }}
                            animate={liked ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            onClick={() => {
                                setLiked(!liked);
                                handleFeedback(liked ? sounds.toggleOff : sounds.success, haptics.success);
                            }}
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${liked
                                ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/40'
                                : 'bg-slate-700'
                                }`}
                        >
                            <Heart
                                className={`w-8 h-8 transition-all ${liked ? 'text-white fill-white' : 'text-slate-400'}`}
                            />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.75, rotate: -15 }}
                            animate={starred ? { rotate: [0, 15, -15, 0] } : {}}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            onClick={() => {
                                setStarred(!starred);
                                handleFeedback(starred ? sounds.toggleOff : sounds.bounce, haptics.impactMedium);
                            }}
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${starred
                                ? 'bg-gradient-to-br from-[#E8B4A0] to-[#C08A70] shadow-lg shadow-[#E8B4A0]/40'
                                : 'bg-slate-700'
                                }`}
                        >
                            <Star
                                className={`w-8 h-8 transition-all ${starred ? 'text-white fill-white' : 'text-slate-400'}`}
                            />
                        </motion.button>
                    </div>
                </div>

                {/* 3. Jelly Toggle */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 space-y-4">
                    <h2 className="text-white font-semibold">🔔 Jelly Toggle</h2>
                    <div className="flex items-center justify-center">
                        <motion.button
                            onClick={() => {
                                setToggled(!toggled);
                                handleFeedback(toggled ? sounds.toggleOff : sounds.toggleOn, haptics.impactLight);
                            }}
                            className={`w-20 h-10 rounded-full p-1 transition-colors ${toggled ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-slate-600'
                                }`}
                        >
                            <motion.div
                                animate={{ x: toggled ? 40 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="w-8 h-8 rounded-full bg-white shadow-lg"
                            />
                        </motion.button>
                    </div>
                </div>

                {/* 4. Checklist with Confetti */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 space-y-4">
                    <h2 className="text-white font-semibold">✅ Satisfying Checklist</h2>
                    <div className="space-y-3">
                        {['ごはん', 'お水', 'トイレ掃除'].map((item) => (
                            <motion.button
                                key={item}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    if (completed.includes(item)) {
                                        setCompleted(completed.filter(i => i !== item));
                                        handleFeedback(sounds.click, haptics.impactLight);
                                    } else {
                                        setCompleted([...completed, item]);
                                        handleFeedback(sounds.success, haptics.success);
                                    }
                                }}
                                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${completed.includes(item)
                                    ? 'bg-gradient-to-r from-[#7CAA8E]/20 to-[#5A8A6A]/20 border-2 border-[#7CAA8E]'
                                    : 'bg-white/5 border-2 border-white/10'
                                    }`}
                            >
                                <motion.div
                                    animate={completed.includes(item) ? { scale: [1, 1.4, 1] } : {}}
                                    transition={{ type: "spring", stiffness: 500 }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${completed.includes(item)
                                        ? 'bg-gradient-to-br from-[#7CAA8E] to-[#5A8A6A]'
                                        : 'bg-slate-600'
                                        }`}
                                >
                                    <Check className={`w-5 h-5 ${completed.includes(item) ? 'text-white' : 'text-slate-400'}`} />
                                </motion.div>
                                <span className={`text-lg ${completed.includes(item) ? 'text-white line-through' : 'text-slate-300'}`}>
                                    {item}
                                </span>
                                <AnimatePresence>
                                    {completed.includes(item) && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="ml-auto"
                                        >
                                            <Sparkles className="w-5 h-5 text-amber-400" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* 5. Big Action Button */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 space-y-4">
                    <h2 className="text-white font-semibold">⚡ Power Button</h2>
                    <motion.button
                        whileTap={{ scale: 0.92, y: 4 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => {
                            handleFeedback(sounds.success, haptics.impactHeavy);
                        }}
                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#7CAA8E] via-[#6B9B7A] to-[#E8B4A0] text-white font-bold text-lg shadow-xl shadow-[#7CAA8E]/30 flex items-center justify-center gap-3"
                    >
                        <Zap className="w-6 h-6" />
                        お世話完了！
                    </motion.button>
                </div>

                {/* Footer */}
                <p className="text-center text-purple-300/50 text-xs">
                    Powered by Framer Motion + Web Audio API
                </p>
            </div>
        </div>
    );
}
