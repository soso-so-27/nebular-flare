"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, Settings, X, Plus } from "lucide-react";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void; // Usually onNavigate('gallery')
    onOpenSettings: () => void;
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenSettings }: MagicBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const menuItems = [
        { icon: LayoutGrid, label: "お世話", action: onOpenPickup, color: "bg-amber-400" },
        { icon: Calendar, label: "カレンダー", action: onOpenCalendar, color: "bg-blue-400" },
        { icon: Cat, label: "ねこ", action: onOpenGallery, color: "bg-green-400" },
        { icon: Settings, label: "設定", action: onOpenSettings, color: "bg-slate-400" },
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
                            <div className="absolute bottom-4 flex gap-4 items-end justify-center mb-16">
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
                                            transition: { delay: index * 0.05, type: "spring", stiffness: 400, damping: 20 }
                                        }}
                                        exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`p-4 rounded-full shadow-lg text-white ${item.color} hover:brightness-110 transition-all active:scale-95`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-white text-xs font-bold drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {isOpen ? <Plus className="w-8 h-8 rotate-45" /> : <div className="w-6 h-6 rounded-full bg-white/80" />}
                    {/* Simple geometric shape or icon inside */}
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

