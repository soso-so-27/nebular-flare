"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CalendarScreen } from "./calendar-screen";

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 w-full h-full md:h-full md:max-h-[800px] md:max-w-md md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-transparent z-10 shrink-0">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                カレンダー
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            <div className="p-4">
                                <CalendarScreen />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
