"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, AlertCircle, X } from "lucide-react";

interface ActionPlusMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenPhoto: () => void;
    onOpenIncident: () => void;
    variant?: 'bubble' | 'dock' | 'sheet';
}

export function ActionPlusMenu({ isOpen, onClose, onOpenPhoto, onOpenIncident, variant = 'dock' }: ActionPlusMenuProps) {
    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.4)'
    };

    const items = [
        {
            id: 'photo',
            label: 'とどける',
            description: '写真を送る',
            icon: <MessageCircle className="w-5 h-5" />,
            color: 'text-blue-500',
            onClick: () => { onOpenPhoto(); onClose(); }
        },
        {
            id: 'incident',
            label: 'そうだん・しるす',
            description: '異常や記録',
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'text-orange-500',
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 tracking-wider uppercase">Actions</h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {items.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={item.onClick}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 hover:bg-white/80 transition-colors text-left shadow-sm border border-white/40"
                                >
                                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner ${item.color}`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{item.label}</div>
                                        <div className="text-[10px] text-slate-400">{item.description}</div>
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
