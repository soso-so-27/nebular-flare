"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Wand2,
    Check,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Sparkles
} from "lucide-react";
import { Cat } from "@/types";

interface PhotoToSort {
    id: string;
    url: string;
    suggestedCatId?: string;
    confidence?: number;
}

interface PhotoSortModalProps {
    isOpen: boolean;
    onClose: () => void;
    photos: PhotoToSort[];
    onAssign: (photoId: string, catId: string) => void;
}

export function PhotoSortModal({ isOpen, onClose, photos, onAssign }: PhotoSortModalProps) {
    const { cats, isDemo } = useAppState();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [analyzing, setAnalyzing] = useState(false);

    const currentPhoto = photos[currentIndex];
    const progress = ((currentIndex + 1) / photos.length) * 100;

    // Simulate AI analysis in demo mode
    useEffect(() => {
        if (isOpen && isDemo && photos.length > 0) {
            setAnalyzing(true);
            // Simulate AI delay
            const timer = setTimeout(() => {
                setAnalyzing(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, currentIndex, isDemo, photos.length]);

    const handleAssign = (catId: string) => {
        if (!currentPhoto) return;

        setAssignments(prev => ({
            ...prev,
            [currentPhoto.id]: catId
        }));

        if (currentIndex < photos.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // All photos assigned, complete
            handleComplete();
        }
    };

    const handleSkip = () => {
        if (currentIndex < photos.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        // Apply all assignments
        Object.entries(assignments).forEach(([photoId, catId]) => {
            onAssign(photoId, catId);
        });

        const assignedCount = Object.keys(assignments).length;
        toast.success(`${assignedCount}枚の写真を振り分けました`);
        onClose();
    };

    const getSuggestedCat = (): Cat | undefined => {
        if (!currentPhoto) return undefined;

        // In demo mode, suggest a random cat
        if (isDemo && cats.length > 0) {
            const randomIndex = Math.floor(Math.random() * cats.length);
            return cats[randomIndex];
        }

        // Use AI suggestion if available
        if (currentPhoto.suggestedCatId) {
            return cats.find(c => c.id === currentPhoto.suggestedCatId);
        }

        return undefined;
    };

    const suggestedCat = getSuggestedCat();

    if (photos.length === 0) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black flex flex-col"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="flex-1 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 flex items-center justify-between bg-black/80 backdrop-blur">
                            <button onClick={onClose} className="text-white p-2">
                                <X className="h-6 w-6" />
                            </button>
                            <div className="flex items-center gap-2 text-white">
                                <Wand2 className="h-4 w-4 text-[#B8A6D9]" />
                                <span className="text-sm font-medium">写真の振り分け</span>
                            </div>
                            <span className="text-white/60 text-sm">{currentIndex + 1}/{photos.length}</span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-white/20">
                            <div
                                className="h-full bg-[#B8A6D9] transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Photo */}
                        <div className="flex-1 flex items-center justify-center p-4 relative">
                            {currentPhoto && (
                                <img

                                    src={currentPhoto.url}
                                    alt=""
                                    className="max-w-full max-h-full object-contain rounded-xl"
                                />
                            )}

                            {analyzing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-[#B8A6D9]" />
                                        <span className="text-white text-sm">猫を識別中...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Suggestion */}
                        {suggestedCat && !analyzing && (
                            <div className="px-4 pb-2">
                                <div className="bg-[#B8A6D9]/20 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 text-[#B8A6D9]" />
                                    <span className="text-white text-sm flex-1">
                                        これは <span className="font-bold">{suggestedCat.name}</span> かも？
                                    </span>
                                    <button
                                        onClick={() => handleAssign(suggestedCat.id)}
                                        className="px-3 py-1 rounded-full bg-[#B8A6D9] text-white text-sm font-medium"
                                    >
                                        はい
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Cat Selection */}
                        <div className="p-4 bg-black/80 backdrop-blur">
                            <p className="text-white/60 text-xs mb-3 text-center">この写真の猫を選んでください</p>
                            <div className="flex gap-2 justify-center flex-wrap">
                                {cats.map(cat => {
                                    const hasAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleAssign(cat.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                                "hover:bg-white/10 active:scale-95"
                                            )}
                                        >
                                            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
                                                {hasAvatar ? (
                                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl">{cat.avatar || "🐈"}</span>
                                                )}
                                            </div>
                                            <span className="text-white text-xs font-medium">{cat.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Skip button */}
                            <button
                                onClick={handleSkip}
                                className="w-full mt-4 py-2 text-white/50 text-sm hover:text-white/70"
                            >
                                スキップ
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
