"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, X, Plus, Activity, Menu } from "lucide-react";
import { BubblePickupList } from "./bubble-pickup-list";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity }: MagicBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const menuItems = [
        { icon: Cat, label: "猫", action: onOpenGallery, color: "text-emerald-400", delay: 0 },
        { icon: Activity, label: "活動", action: onOpenActivity, color: "text-rose-400", delay: 0.05 },
        { icon: Calendar, label: "予定", action: onOpenCalendar, color: "text-blue-400", delay: 0.1 },
        { icon: Menu, label: "お世話", action: onOpenCare, color: "text-slate-200", delay: 0.15 },
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

                            {/* Auto-Open Pickup List */}
                            <BubblePickupList onClose={() => setIsOpen(false)} />

                            {/* Menu Row */}
                            <div className="absolute bottom-20 z-50 flex gap-4 items-end justify-center mb-4">
                                {menuItems.map((item, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => {
                                            item.action();
                                            setIsOpen(false);
                                        }}
                                        initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                            transition: { delay: item.delay, type: "spring", stiffness: 300, damping: 20 }
                                        }}
                                        exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`p-4 rounded-full shadow-lg border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/20 transition-all active:scale-95`}>
                                            <item.icon className={`w-6 h-6 ${item.color} drop-shadow-sm`} />
                                        </div>
                                        <span className="text-white text-[10px] font-bold drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                                            {item.label}
                                        </span>
                                    </motion.button>
                                ))}
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
                        rotate: isOpen ? 90 : 0 // Rotate X effect
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
                    {isOpen ? <X className="w-8 h-8 stroke-[1.5]" /> : <div className="w-6 h-6 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
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

