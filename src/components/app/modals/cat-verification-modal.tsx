"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, HelpCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { Cat } from "@/types";
import { useCatContext } from "@/store/app-store";
import { cn, getFullImageUrl } from "@/lib/utils";

interface VerificationItem {
    id: string;
    url: string;
    aiAnalysis: any;
    currentCatId: string | null;
}

interface CatVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: VerificationItem[];
    onComplete: () => void;
}

export function CatVerificationModal({ isOpen, onClose, items, onComplete }: CatVerificationModalProps) {
    const { cats, updateCatImage } = useCatContext();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [queue, setQueue] = useState<VerificationItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQueue(items);
            setCurrentIndex(0);
        }
    }, [isOpen, items]);

    const currentItem = queue[currentIndex];

    const handleDecision = async (catId: string | null) => {
        if (!currentItem || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Update the image with the confirmed catId and remove the needUserConfirm flag
            // We also update the ai_analysis to reflect the user's decision (optional but good for history)
            const updatedAnalysis = {
                ...currentItem.aiAnalysis,
                needUserConfirm: false,
                userConfirmed: true,
                confirmedAt: new Date().toISOString()
            };

            await updateCatImage(currentItem.id, {
                cat_id: catId,
                ai_analysis: updatedAnalysis
            });

            // Move to next
            if (currentIndex < queue.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onComplete(); // All done
                onClose();
            }
        } catch (e) {
            console.error("Failed to update verified cat:", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-[#1c1c1e] dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        写っているのは誰？
                    </h3>
                    <div className="text-xs text-gray-500 font-medium tabular-nums">
                        {currentIndex + 1} / {queue.length}
                    </div>
                </div>

                {/* Content */}
                {currentItem ? (
                    <div className="p-4">
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 dark:bg-[#2c2c2e] rounded-xl overflow-hidden mb-4 relative">
                            <img
                                src={currentItem.url}
                                alt="Verification target"
                                className="w-full h-full object-cover"
                            />
                            {/* AI Suggestion Badge */}
                            {currentItem.aiAnalysis?.topCandidates?.[0]?.catId && (
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full border border-white/20">
                                    AI予想: {cats.find(c => c.id === currentItem.aiAnalysis.topCandidates[0].catId)?.name || '不明'}？
                                </div>
                            )}
                        </div>

                        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                            この写真に写っている猫ちゃんを選んでください
                        </p>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-2">
                            {cats.map(cat => {
                                const isSuggested = currentItem.aiAnalysis?.topCandidates?.[0]?.catId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleDecision(cat.id)}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-50",
                                            isSuggested
                                                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                                                : "bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                            {cat.avatar && !cat.avatar.startsWith('🐈') ? (
                                                <img src={getFullImageUrl(cat.avatar)} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px]">🐈</div>
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <div className="text-sm font-bold text-[#1c1c1e] dark:text-white truncate">
                                                {cat.name}
                                            </div>
                                            {isSuggested && (
                                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">AIのおすすめ</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={() => handleDecision(null)}
                                disabled={isSubmitting}
                                className="flex-1 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                誰も写っていない / わからない
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        すべて完了しました！
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </motion.div>
        </div>
    );
}
