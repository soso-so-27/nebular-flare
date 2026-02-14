"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Camera, ChevronRight, ChevronLeft,
    Loader2, Sparkles, MessageCircle, Calendar,
    Tag, Check, Trash2, Utensils, Activity, Eye,
    Cat as CatIcon, Plus
} from "lucide-react";
import { useCatContext, useCareContext, useIncidentContext, useCoreContext } from "@/store/app-store";
import { format } from 'date-fns';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase';
import { uploadCatImage } from "@/lib/storage";
import { getFullImageUrl, cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

const TAGS = [
    { id: 'gohan', label: 'ごはん', icon: Utensils },
    { id: 'toilet', label: 'トイレ', icon: Activity },
    { id: 'karada', label: 'からだ', icon: Activity },
    { id: 'yousu', label: 'ようす', icon: Eye },
    { id: 'dekigoto', label: 'できごと', icon: Calendar },
];

const AI_TAG_MAP: Record<string, string> = {
    'Food': 'ごはん',
    'Eating': 'ごはん',
    'Feeding': 'ごはん',
    'Toilet': 'トイレ',
    'Pooping': 'トイレ',
    'Peeing': 'トイレ',
    'Health': 'からだ',
    'Body': 'からだ',
    'Vomit': 'からだ',
    'Behavior': 'ようす',
    'Status': 'ようす',
    'Event': 'できごと',
};

type Step = 'annotate' | 'ai' | 'saving';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialPhotos?: File[];
}

export function CaptureWorkflowSheet({ isOpen, onClose, initialPhotos }: Props) {
    const { cats, activeCatId, analyzeCatImage } = useCatContext();
    const { addIncident } = useIncidentContext();
    const { isDemo } = useCoreContext();

    const [step, setStep] = useState<Step>('annotate');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [isConsult, setIsConsult] = useState(false);
    const [onsetAt, setOnsetAt] = useState(format(new Date(), 'yyyy-MM-dd'));

    // AI / Refinement
    const [suggestedCatIds, setSuggestedCatIds] = useState<Set<string>>(new Set());
    const [allTags, setAllTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const isSavingRef = useRef(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize with photos if provided
    useEffect(() => {
        if (isOpen && initialPhotos && initialPhotos.length > 0) {
            const urls = initialPhotos.map(f => URL.createObjectURL(f));
            setPreviewUrls(urls);
            setPhotos(initialPhotos);
            setStep('annotate');
        }
    }, [isOpen, initialPhotos]);

    // Cleanup URLs
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [previewUrls]);

    const handleFiles = (files: File[]) => {
        setPhotos(prev => [...prev, ...files]);
        const urls = files.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => [...prev, ...urls]);
        setStep('annotate');
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        if (previewUrls[index]?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrls[index]);
        }
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        if (photos.length <= 1) {
            // onClose if no photos left? or keep empty.
            // For now, allow adding more.
        }
    };

    const startAnalysis = async () => {
        if (photos.length === 0) return;
        setStep('ai');
        setIsAnalyzing(true);

        try {
            if (isDemo) {
                await new Promise(r => setTimeout(r, 1500));
                if (cats.length > 0) setSuggestedCatIds(new Set([cats[0].id]));
                setAllTags(['ごはん', '遊んでる', 'リラックス']);
            } else {
                // 1. Upload for AI analysis to a 'temp' path (storage only, no DB record)
                // We use a specific temp path to avoid triggering table-based notifications
                const { publicUrl, error: uploadError } = await uploadCatImage('temp', photos[0]);
                if (uploadError) throw new Error(uploadError);

                // 2. Trigger AI Analysis with Cat Context
                // Use a dummy UUID to avoid PostgreSQL syntax errors on the backend
                const dummyId = '00000000-0000-0000-0000-000000000000';
                const { data, error: aiError } = await analyzeCatImage(dummyId, publicUrl!, cats);
                if (aiError) throw new Error(aiError.message);

                // 3. Set suggestions
                if (data.catId) {
                    setSuggestedCatIds(new Set([data.catId]));
                } else if (activeCatId) {
                    setSuggestedCatIds(new Set([activeCatId]));
                }

                if (data.tags && Array.isArray(data.tags)) {
                    setAllTags(data.tags);
                }
            }
        } catch (e: any) {
            console.error("[Capture Analysis Error]", e);
            toast.error("AI判定に失敗しました。手動で設定してください。");
            if (activeCatId && suggestedCatIds.size === 0) {
                setSuggestedCatIds(new Set([activeCatId]));
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const addLocalTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !allTags.includes(trimmed)) {
            setAllTags(prev => [...prev, trimmed]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setAllTags(prev => prev.filter(t => t !== tag));
    };

    const handleSave = async () => {
        if (suggestedCatIds.size === 0) {
            toast.error("ねこを選んでください");
            return;
        }

        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setStep('saving');

        try {
            const catIds = Array.from(suggestedCatIds);
            const type = isConsult ? 'worried' : 'daily';

            // 1. Final Persistence: Create Incident and Cat Images
            // Convert tags to DB format
            const dbTags = allTags.map(t => ({ name: t, isAi: true, confirmed: true }));

            for (const catId of catIds) {
                // Save incident
                await addIncident(
                    catId,
                    type,
                    note,
                    photos,
                    undefined, undefined,
                    onsetAt,
                    { tags: dbTags }
                );
            }

            toast.success("記録しました");
            onClose();
            // Reset state
            setPhotos([]);
            setPreviewUrls([]);
            setNote('');
            setStep('annotate');
            setSuggestedCatIds(new Set());
            setAllTags([]);
            setTagInput('');
            setIsConsult(false);
            setOnsetAt(format(new Date(), 'yyyy-MM-dd'));
        } catch (e: any) {
            toast.error("保存に失敗しました");
            setStep('ai');
        } finally {
            isSavingRef.current = false;
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#FDF8F1] w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                {/* Pull Indicator */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-gray-200/60 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-gray-400 active:scale-90 transition-all border border-black/[0.02]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-serif text-gray-800 tracking-tight">
                        {step === 'annotate' && "内容を入力"}
                        {step === 'ai' && "AI判定"}
                        {step === 'saving' && "保存中..."}
                    </h2>
                    <div className="w-10 h-10" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-6">

                    {step === 'annotate' && (
                        <>
                            {/* Photo Preview Scroll */}
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="relative group shrink-0">
                                        <img
                                            src={url}
                                            className="w-32 h-32 object-cover rounded-[28px] shadow-md ring-2 ring-white"
                                        />
                                        <button
                                            onClick={() => removePhoto(i)}
                                            className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 active:scale-90 transition-all border border-black/5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-32 h-32 rounded-[28px] border-2 border-dashed border-black/[0.06] bg-white/50 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 text-gray-400 shrink-0 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-black/[0.02] group-hover:bg-brand-peach/10 transition-colors flex items-center justify-center">
                                        <Camera className="w-5 h-5 group-hover:text-brand-peach" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">追加</span>
                                </button>
                            </div>

                            {/* Note Input */}
                            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-black/[0.02] space-y-3">
                                <label className="flex items-center gap-2 px-1">
                                    <MessageCircle className="w-4 h-4 text-brand-peach/60" />
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">メモ</span>
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="何があった？"
                                    className="w-full bg-transparent p-1 text-[18px] font-medium text-gray-800 placeholder:text-gray-300 min-h-[140px] border-none focus:ring-0 resize-none leading-relaxed"
                                />
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsConsult(!isConsult)}
                                    className={cn(
                                        "flex items-center justify-between p-4 px-5 rounded-[28px] border transition-all duration-300",
                                        isConsult
                                            ? "bg-brand-peach/20 border-brand-peach/60 text-[#4A3028] shadow-sm"
                                            : "bg-white border-black/[0.02] text-gray-400 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                            isConsult ? "bg-brand-peach/30" : "bg-black/[0.02]"
                                        )}>
                                            <MessageCircle className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold">チャットで相談</span>
                                    </div>
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border transition-all flex items-center justify-center",
                                        isConsult ? "bg-[#4A3028] border-[#4A3028]" : "bg-white border-gray-200"
                                    )}>
                                        {isConsult && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </button>

                                <div className="relative h-16 rounded-[28px] bg-white shadow-sm border border-black/[0.02] flex items-center px-5 gap-3 group">
                                    <div className="w-9 h-9 rounded-full bg-black/[0.02] flex items-center justify-center text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">
                                        {onsetAt === format(new Date(), 'yyyy-MM-dd') ? "今日" : onsetAt.slice(5)}
                                    </span>
                                    <input
                                        type="date"
                                        value={onsetAt}
                                        onChange={(e) => setOnsetAt(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="ml-auto">
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'ai' && (
                        <div className="flex flex-col gap-8 py-2">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center gap-5 py-20">
                                    <div className="relative">
                                        <Loader2 className="w-12 h-12 text-brand-peach animate-spin" />
                                        <Sparkles className="absolute top-0 right-0 w-4 h-4 text-brand-peach/40 animate-pulse" />
                                    </div>
                                    <p className="text-gray-400 font-serif italic text-lg opacity-80">AIが写真を解析中...</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col gap-8"
                                    >
                                        {/* Suggested Cats */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 px-1">
                                                <Sparkles className="w-4 h-4 text-brand-peach/60" />
                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">どの猫ですか？</span>
                                            </div>
                                            <div className="flex flex-wrap gap-5 px-1">
                                                {cats.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => {
                                                            const next = new Set(suggestedCatIds);
                                                            if (next.has(cat.id)) next.delete(cat.id);
                                                            else next.add(cat.id);
                                                            setSuggestedCatIds(next);
                                                        }}
                                                        className="group relative flex flex-col items-center gap-3"
                                                    >
                                                        <div className={cn(
                                                            "w-20 h-20 rounded-full p-1 transition-all duration-300",
                                                            suggestedCatIds.has(cat.id)
                                                                ? "ring-4 ring-[#4A3028]/60 ring-offset-2 ring-offset-[#FDF8F1] scale-105"
                                                                : "ring-1 ring-black/5 opacity-40 grayscale"
                                                        )}>
                                                            <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-inner">
                                                                <img
                                                                    src={getFullImageUrl(cat.avatar || '')}
                                                                    alt={cat.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-bold transition-colors",
                                                            suggestedCatIds.has(cat.id) ? "text-[#4A3028]" : "text-gray-400"
                                                        )}>{cat.name}</span>
                                                        {suggestedCatIds.has(cat.id) && (
                                                            <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#4A3028] rounded-full border-2 border-[#FDF8F1] flex items-center justify-center text-white shadow-lg shadow-black/20">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Suggested Tags Card */}
                                        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/[0.02] space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-4 h-4 text-brand-peach/60" />
                                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">タグ付け</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2.5">
                                                    {allTags.map(tag => (
                                                        <motion.button
                                                            layout
                                                            key={tag}
                                                            onClick={() => removeTag(tag)}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="px-5 py-2.5 rounded-2xl bg-brand-peach/20 text-[#4A3028] text-sm font-black flex items-center gap-2 border border-brand-peach/30"
                                                        >
                                                            {tag}
                                                            <X className="w-3.5 h-3.5 opacity-60" />
                                                        </motion.button>
                                                    ))}

                                                    {TAGS.filter(dt => !allTags.includes(dt.label)).map(dt => (
                                                        <button
                                                            key={dt.id}
                                                            onClick={() => setAllTags(prev => [...prev, dt.label])}
                                                            className="px-5 py-2.5 rounded-2xl bg-white text-gray-400 text-sm font-bold border border-black/[0.05] hover:border-brand-peach/30 transition-all flex items-center gap-2"
                                                        >
                                                            <dt.icon className="w-4 h-4 opacity-50" />
                                                            {dt.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="h-px bg-black/[0.04] mx-1" />

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addLocalTag()}
                                                        placeholder="タグを追加"
                                                        className="flex-1 bg-black/[0.02] rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 border border-black/[0.01] focus:outline-none focus:ring-2 focus:ring-brand-peach/20"
                                                    />
                                                    <button
                                                        onClick={addLocalTag}
                                                        className="w-14 h-14 rounded-2xl bg-brand-peach text-[#4A3028] flex items-center justify-center shadow-lg shadow-brand-peach/10 active:scale-95 transition-all"
                                                    >
                                                        <Plus className="w-8 h-8" />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-bold px-1 tracking-tight">
                                                    ※AI判定されたタグをタップすると削除できます
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    )}

                    {step === 'saving' && (
                        <div className="h-64 flex flex-col items-center justify-center gap-5">
                            <Loader2 className="w-12 h-12 text-brand-peach animate-spin" />
                            <p className="text-xl font-serif italic text-gray-800 opacity-80">保存しています...</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 pb-10 bg-white/60 backdrop-blur-xl shrink-0 safe-area-pb border-t border-black/[0.02]">
                    {step === 'annotate' && (
                        <button
                            onClick={startAnalysis}
                            disabled={photos.length === 0}
                            className="w-full h-16 rounded-[32px] bg-brand-peach text-[#4A3028] font-black text-lg shadow-2xl shadow-brand-peach/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                        >
                            <span>AI判定に進む</span>
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}

                    {(step === 'ai' || step === 'saving') && !isAnalyzing && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep('annotate')}
                                disabled={step === 'saving'}
                                className="w-16 h-16 rounded-[28px] bg-black/[0.03] flex items-center justify-center text-gray-400 active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={step === 'saving'}
                                className={cn(
                                    "flex-1 h-16 rounded-[32px] bg-brand-peach text-[#4A3028] font-black text-lg shadow-2xl shadow-brand-peach/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3",
                                    step === 'saving' && "opacity-80 pointer-events-none"
                                )}
                            >
                                {step === 'saving' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-7 h-7" />
                                        <span>保存する</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
        </div>,
        document.body
    );
}
