"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Library } from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface HomeViewToggleProps {
    currentView: 'home' | 'dekigoto';
    onViewChange: (view: 'home' | 'dekigoto') => void;
}

export function HomeViewToggle({ currentView, onViewChange }: HomeViewToggleProps) {
    const isHome = currentView === 'home';

    return (
        <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
                triggerFeedback('medium');
                onViewChange(isHome ? 'dekigoto' : 'home');
            }}
            className="group relative flex items-center justify-center h-14 w-14 bg-white/15 dark:bg-black/40 backdrop-blur-3xl rounded-full border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all hover:bg-white/25 active:bg-white/10 overflow-hidden"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex flex-col items-center justify-center gap-0.5"
                >
                    {isHome ? (
                        <>
                            <Library className="w-5 h-5 text-white" strokeWidth={2} />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-white/70">履歴</span>
                        </>
                    ) : (
                        <>
                            <Cat className="w-5 h-5 text-white" strokeWidth={2} />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-white/70">ホーム</span>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Subtle Inner Glow */}
            <div className="absolute inset-px rounded-full border border-white/10 pointer-events-none" />
        </motion.button>
    );
}
