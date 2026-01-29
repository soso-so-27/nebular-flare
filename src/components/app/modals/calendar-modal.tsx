"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CalendarScreen } from "../screens/calendar-screen";

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
                        className="bg-[#1E1E23]/90 backdrop-blur-3xl border border-white/10 w-full md:max-w-md h-[100lvh] md:h-auto md:max-h-[85vh] rounded-t-[32px] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Specular Highlight */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 rounded-t-[32px]" />

                        {/* Drag Handle (for visual cue) */}
                        <div className="w-full flex justify-center pt-3 pb-1 shrink-0 bg-transparent z-20">
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Close Button Only - Header is inside screen content */}
                        <div className="absolute top-4 right-4 z-30">
                            <button
                                onClick={onClose}
                                className="p-2 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded-full transition-colors backdrop-blur-md border border-white/5"
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
