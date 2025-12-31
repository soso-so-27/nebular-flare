"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, Settings, X, Plus, Activity } from "lucide-react";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenSettings: () => void;
    onOpenActivity: () => void;
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenSettings, onOpenActivity }: MagicBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const menuItems = [
        { icon: Cat, label: "猫", action: onOpenGallery, color: "text-emerald-400", delay: 0 },
        { icon: Activity, label: "活動", action: onOpenActivity, color: "text-rose-400", delay: 0.05 },
        // Center Item (Pickup)
        { icon: LayoutGrid, label: "お世話", action: onOpenPickup, color: "text-amber-400", isMain: true, delay: 0.1 },
        { icon: Calendar, label: "予定", action: onOpenCalendar, color: "text-blue-400", delay: 0.15 },
        { icon: Settings, label: "設定", action: onOpenSettings, color: "text-slate-400", delay: 0.2 },
    ];

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-end justify-center pb-8">
            <div className="relative flex items-center justify-center pointer-events-auto">

                {/* Expanded Menu Actions */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop to close */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1]"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Menu Arc */}
                            <div className="absolute bottom-4 flex items-end justify-center mb-16 w-[300px] h-[150px]">
                                {menuItems.map((item, index) => {
                                    // Fan positioning
                                    const count = menuItems.length;
                                    const angle = -160 + (index * (140 / (count - 1))); // Spread across -70 to 70 deg? -160 to -20?
                                    // Let's manually position for 5 items to ensure balance
                                    // 0: Left Far (Gallery)
                                    // 1: Left Mid (Activity)
                                    // 2: Center Top (Pickup)
                                    // 3: Right Mid (Calendar)
                                    // 4: Right Far (Settings)

                                    // Use absolute positioning relative to center bottom
                                    const positions = [
                                        { x: -100, y: -20 }, // Cat
                                        { x: -50, y: -80 },  // Activity
                                        { x: 0, y: -110 },   // Pickup (Top)
                                        { x: 50, y: -80 },   // Calendar
                                        { x: 100, y: -20 },  // Settings
                                    ];
                                    const pos = positions[index];

                                    return (
                                        <motion.button
                                            key={index}
                                            onClick={() => {
                                                item.action();
                                                setIsOpen(false);
                                            }}
                                            initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                                            animate={{
                                                opacity: 1,
                                                x: pos.x,
                                                y: pos.y,
                                                scale: item.isMain ? 1.2 : 1,
                                                transition: { delay: item.delay, type: "spring", stiffness: 300, damping: 20 }
                                            }}
                                            exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                                            className="absolute bottom-0 flex flex-col items-center gap-2 group"
                                        >
                                            <div className={`
                                                flex items-center justify-center rounded-2xl shadow-lg border border-white/20 backdrop-blur-md transition-all active:scale-95
                                                ${item.isMain
                                                    ? 'w-16 h-16 bg-white/20'
                                                    : 'w-12 h-12 bg-white/10 hover:bg-white/20'}
                                            `}>
                                                <item.icon className={`
                                                    ${item.isMain ? 'w-8 h-8' : 'w-5 h-5'} 
                                                    ${item.color} drop-shadow-sm
                                                `} />
                                            </div>
                                            <span className="text-white text-[10px] font-bold drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                                                {item.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Orb Button */}
                <motion.button
                    onClick={toggleOpen}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                        scale: isOpen ? 0.9 : 1,
                        rotate: isOpen ? 45 : 0
                    }}
                    className={`
                        w-16 h-16 rounded-full 
                        bg-gradient-to-br from-white/40 to-white/10 
                        backdrop-blur-md border border-white/30 
                        shadow-[0_0_20px_rgba(255,255,255,0.3)]
                        flex items-center justify-center text-white
                        transition-all duration-300
                        ${isOpen ? 'bg-white/20' : 'hover:bg-white/30'}
                    `}
                >
                    {isOpen ? <Plus className="w-8 h-8 rotate-45" /> : <div className="w-6 h-6 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
                </motion.button>

                {/* Glow Effect behind Orb */}
                {!isOpen && (
                    <motion.div
                        className="absolute inset-0 bg-white/20 blur-xl rounded-full -z-10"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    />
                )}
            </div>
        </div>
    );
}

