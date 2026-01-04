"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { NotificationSettings } from "./notification-settings";

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 dark:text-white">通知設定</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-500 mb-4">お世話の時間を忘れないように、通知を受け取ることができます。</p>
                            <NotificationSettings />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
