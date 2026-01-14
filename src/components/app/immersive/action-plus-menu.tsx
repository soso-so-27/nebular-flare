"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MessageCircle, X } from "lucide-react";

interface ActionPlusMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenPhoto: () => void;
    onOpenIncident: () => void;
    variant?: 'bubble' | 'dock' | 'sheet';
}

export function ActionPlusMenu({ isOpen, onClose, onOpenPhoto, onOpenIncident, variant = 'dock' }: ActionPlusMenuProps) {
    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(32px) saturate(2)',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.25), inset 0 2px 0 0 rgba(255,255,255,0.1)'
    };

    const items = [
        {
            id: 'photo',
            label: 'とどける',
            description: 'できごとを共有しましょう',
            icon: <Camera className="w-5 h-5" />,
            bgColor: 'bg-[#E8B4A0]',
            iconColor: 'text-white',
            onClick: () => { onOpenPhoto(); onClose(); }
        },
        {
            id: 'incident',
            label: 'そうだん',
            description: 'チャットで解決しましょう',
            icon: <MessageCircle className="w-5 h-5" />,
            bgColor: 'bg-[#B8A6D9]',
            iconColor: 'text-white',
            onClick: () => { onOpenIncident(); onClose(); }
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Menu Content */}
                    <motion.div
                        initial={variant === 'sheet' ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                        animate={variant === 'sheet' ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={variant === 'sheet' ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                        className={`fixed z-[70] ${variant === 'sheet'
                            ? 'bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-12'
                            : 'bottom-24 left-1/2 -translate-x-1/2 w-[280px] rounded-3xl p-4'}`}
                        style={glassStyle}
                    >


                        <div className="grid gap-3">
                            {items.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={item.onClick}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-left border border-white/20 hover:border-white/40"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${item.bgColor} ${item.iconColor}`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white drop-shadow-sm">{item.label}</div>
                                        <div className="text-[10px] text-white/70 font-medium">{item.description}</div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
