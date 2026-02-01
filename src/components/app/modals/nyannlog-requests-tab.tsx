"use client";

import React, { useState } from "react";
import { Cat } from "lucide-react";
import { QuestGrid } from '../immersive/quest-grid';
import { CareHistoryList } from '../immersive/care-history-list';
import { getFullImageUrl, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface NyannlogRequestsTabProps {
    completedCareTasks: number;
    totalCareTasks: number;
    activeMedications: any[];
    cats: any[];
    onSelectItem?: (id: string, type: string, photos: string[]) => void;
    onClose?: () => void;
}

export const NyannlogRequestsTab = ({
    completedCareTasks,
    totalCareTasks,
    activeMedications,
    cats,
    onSelectItem,
    onClose
}: NyannlogRequestsTabProps) => {
    // Hardcoded 'today' since history button is gone.
    const [subTab, setSubTab] = useState<'today' | 'history'>('today');

    return (
        <div className="w-full flex flex-col min-h-full pt-1">
            {/* Header: Left N Button Only. No Center Pill. No Right Button. */}
            <div className="sticky top-0 z-50 px-6 mb-6 flex items-center justify-between pointer-events-auto py-2">
                {/* Left: Home/Close Button (Integrated N Style) */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="w-12 h-12 rounded-full backdrop-blur-md bg-[#A48E82]/20 border border-[#E6D5CC]/30 flex items-center justify-center shadow-lg hover:bg-[#A48E82]/30 transition-colors group"
                >
                    <span className="text-xl font-black text-[#E6D5CC] italic tracking-tighter group-hover:scale-110 transition-transform">N</span>
                </motion.button>

                {/* Center: Empty */}
                <div />

                {/* Right: Empty */}
                <div className="w-12" />
            </div>

            {/* Content Area */}
            <div className="px-4 pb-12 flex-1">
                <AnimatePresence mode="wait">
                    {subTab === 'today' ? (
                        <motion.div
                            key="today"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="space-y-3">
                                <QuestGrid className="w-full" />
                            </div>

                            {activeMedications.length > 0 && (
                                <div className="space-y-4 pt-4">
                                    <div className="px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        <span className="text-xs font-black text-blue-400 tracking-wider">現在のお薬</span>
                                    </div>
                                    <div className="space-y-2">
                                        {activeMedications.map(log => {
                                            const cat = cats.find(c => c.id === log.cat_id);
                                            return (
                                                <div key={log.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between shadow-xl backdrop-blur-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                                            {cat?.avatar ? (
                                                                <img src={getFullImageUrl(cat.avatar)} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <Cat className="w-6 h-6 text-white/10" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[14px] font-black text-white leading-tight">{log.product_name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                                                    {log.frequency === 'daily' ? '毎日' : '定期記録'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            <CareHistoryList
                                onOpenPhoto={(url) => {
                                    if (onSelectItem) {
                                        onSelectItem('preview', 'photo', [url]);
                                    }
                                }}
                                className="w-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
