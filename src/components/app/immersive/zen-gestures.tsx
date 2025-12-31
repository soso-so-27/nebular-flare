"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface ZenGesturesProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenSettings: () => void;
    onOpenActivity: () => void;
}

export function ZenGestures({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenSettings, onOpenActivity }: ZenGesturesProps) {
    const [showGuide, setShowGuide] = useState(true);

    // Fade out guide after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowGuide(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Bottom Swipe Zone (for Pickup) */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-auto"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y < -30) onOpenPickup();
                }}
            >
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50">
                    {showGuide && (
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <ChevronUp className="text-white w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Top Swipe Zone (for Calendar) */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-24 pointer-events-auto"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 30) onOpenCalendar();
                }}
            >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50">
                    {showGuide && (
                        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <ChevronDown className="text-white w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Right Edge Zone (Activity) */}
            <motion.div
                className="absolute top-24 bottom-32 right-0 w-12 pointer-events-auto"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.x < -30) onOpenActivity();
                }}
            >
                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col items-center opacity-50">
                    {showGuide && (
                        <motion.div animate={{ x: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <ChevronLeft className="text-white w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Left Edge Zone (Gallery) */}
            <motion.div
                className="absolute top-24 bottom-32 left-0 w-12 pointer-events-auto"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.x > 30) onOpenGallery();
                }}
            >
                <div className="absolute top-1/2 left-2 -translate-y-1/2 flex flex-col items-center opacity-50">
                    {showGuide && (
                        <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <ChevronRight className="text-white w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Config Corner (Top Right) */}
            <div
                className="absolute top-0 right-0 w-16 h-16 pointer-events-auto"
                onClick={onOpenSettings}
            />

            {/* Center Tap Guide */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-auto"
                onClick={() => setShowGuide(true)}
            />
        </div>
    );
}
