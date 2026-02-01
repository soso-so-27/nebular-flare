"use client";

import React, { useState } from "react";
import { Cat, X } from "lucide-react";
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
    subTab?: 'today' | 'history';
    setSubTab?: (tab: 'today' | 'history') => void;
    selectedCatId?: string | null;
}

export const NyannlogRequestsTabView = ({
    completedCareTasks,
    totalCareTasks,
    activeMedications,
    cats,
    onSelectItem,
    onClose,
    subTab = 'today',
    setSubTab,
    selectedCatId
}: NyannlogRequestsTabProps) => {

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto touch-pan-y no-scrollbar" data-version="new-view-v2">
            <div className="px-2 pb-4 pt-2 w-full">
                <AnimatePresence mode="wait">
                    {subTab === 'today' ? (
                        <div
                            key="today-v2"
                            className="space-y-2"
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
                        </div>
                    ) : (
                        <div
                            key="history"
                        >
                            <CareHistoryList
                                onOpenPhoto={(url) => {
                                    if (onSelectItem) {
                                        onSelectItem('preview', 'photo', [url]);
                                    }
                                }}
                                className="w-full"
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
