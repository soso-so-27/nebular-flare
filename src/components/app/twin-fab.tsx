"use client";

import React from "react";
import { Heart, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TwinFABProps {
    careCount: number;
    catCount: number;
    onCareClick: () => void;
    onCatClick: () => void;
}

export function TwinFAB({ careCount, catCount, onCareClick, onCatClick }: TwinFABProps) {
    // Don't render if both counts are 0
    if (careCount === 0 && catCount === 0) return null;

    return (
        <div className="fixed right-0 bottom-0 z-[60] flex flex-col gap-1 pb-1">
            <AnimatePresence>
                {/* Care Tab */}
                {careCount > 0 && (
                    <motion.button
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onCareClick}
                        className="flex items-center rounded-l-xl bg-gradient-to-r from-[#7CAA8E] to-[#6B9B7A] shadow-lg pl-2 pr-1 py-2"
                    >
                        <Heart className="h-5 w-5 text-white" fill="white" />
                        <span className="ml-1 text-xs font-bold text-white min-w-[16px]">
                            {careCount}
                        </span>
                    </motion.button>
                )}

                {/* Cat Tab */}
                {catCount > 0 && (
                    <motion.button
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onCatClick}
                        className="flex items-center rounded-l-xl bg-gradient-to-r from-[#E8B4A0] to-[#E8B4A0] shadow-lg pl-2 pr-1 py-2"
                    >
                        <Cat className="h-5 w-5 text-white" />
                        <span className="ml-1 text-xs font-bold text-white min-w-[16px]">
                            {catCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
