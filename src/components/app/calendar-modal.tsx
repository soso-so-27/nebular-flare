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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FAF9F7]/90 dark:bg-[#1E1E23]/90 backdrop-blur-xl border border-white/40 dark:border-white/10 w-full md:max-w-md h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-[32px] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
