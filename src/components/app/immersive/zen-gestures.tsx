"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface ZenGesturesProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenSettings: () => void;
}

export function ZenGestures({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenSettings }: ZenGesturesProps) {
    const [showGuide, setShowGuide] = useState(true);

    // Fade out guide after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowGuide(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;
        const swipeThreshold = 50;

        // Vertical Swipes (Primary Actions)
        if (Math.abs(offset.y) > Math.abs(offset.x)) {
            if (offset.y < -swipeThreshold) {
                // Swipe Up -> Primary Action (Pickup)
                onOpenPickup();
            } else if (offset.y > swipeThreshold) {
                // Swipe Down -> History/Calendar
                onOpenCalendar();
            }
        }
        // Horizontal Swipes (Secondary Actions - handled by carousel mostly, but we can add edge gestures)
        // Note: Horizontal swipes in center are reserved for cat switching.
    };

    return (
        <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Full screen gesture area - allowing clicks on background to pass through, but capturing drags? 
                Actually, to capture swipes, we need a transparent overlay that might block clicks.
                However, for Zen mode, 'clicks' on the background usually just toggle UI visibility or do nothing.
                We'll place discrete gesture zones or a full overlay.
            */}

            {/* Bottom Swipe Zone (for Pickup) */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-auto"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y < -30) onOpenPickup();
                }}
            >
                {/* Visual Cue */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50">
                    {showGuide && (
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <ChevronUp className="text-white w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Top Swipe Zone (for Settings/Menu) */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-24 pointer-events-auto"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 30) onOpenSettings();
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

            {/* Central Tap Zone (Optional - maybe toggle guide?) */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-auto"
                onClick={() => setShowGuide(true)}
            />
        </div>
    );
}
