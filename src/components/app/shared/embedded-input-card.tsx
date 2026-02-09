"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useCatContext, useCareContext, useCoreContext, useSettingsContext, useIncidentContext } from "@/store/app-store";
import { format } from 'date-fns';
import { Camera, Send, X, Loader2, MessageCircle, Tag, Utensils, Activity, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useFootprintContext } from "@/providers/footprint-provider";
import { getFullImageUrl, cn } from '@/lib/utils';

// Tags
const TAGS = [
    { id: 'gohan', label: 'ごはん', icon: Utensils },
    { id: 'toilet', label: 'トイレ', icon: Activity },
    { id: 'karada', label: 'からだ', icon: Activity },
    { id: 'yousu', label: 'ようす', icon: Eye },
    { id: 'dekigoto', label: 'できごと', icon: Calendar },
];
type Props = {
    onSubmitSuccess?: () => void;
    onSuccess?: () => void;
    isStandalone?: boolean;
    initialCatId?: string;
    onExpandChange?: (expanded: 'none' | 'tags' | 'health') => void;
    onHeightChange?: (height: number) => void;
    initialDate?: Date;
};

export function EmbeddedInputCard({ onSubmitSuccess, onSuccess, isStandalone = false, initialCatId, onExpandChange, onHeightChange, initialDate }: Props) {
    const { cats, activeCatId, uploadCatImage } = useCatContext();
    const { addObservation, addCareLog } = useCareContext();
    const { addIncident } = useIncidentContext();
    const { isDemo } = useCoreContext();
    const { settings } = useSettingsContext();
    const { awardForNyannlog } = useFootprintContext();

    const [note, setNote] = useState('');
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const [isConsult, setIsConsult] = useState(false);
    const [showHealthPanel, setShowHealthPanel] = useState(false);

    // Notify parent about expansion changes
    useEffect(() => {
        if (onExpandChange) {
            if (showHealthPanel) onExpandChange('health');
            else if (showTags) onExpandChange('tags');
            else onExpandChange('none');
        }
    }, [showTags, showHealthPanel, onExpandChange]);
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

    // Advanced Symptom State
    const [healthCategory, setHealthCategory] = useState<string | null>(null);
    const [healthValue, setHealthValue] = useState<string | null>(null);
    const [onsetAt, setOnsetAt] = useState<string>(
        format(initialDate || new Date(), 'yyyy-MM-dd')
    );

    // Sync onsetAt when initialDate changes (Global Sync)
    useEffect(() => {
        if (initialDate) {
            setOnsetAt(format(initialDate, 'yyyy-MM-dd'));
        }
    }, [initialDate]);
    const [vomitDetails, setVomitDetails] = useState({ type: '', count: 1, hasBlood: false });
    const [stoolDetails, setStoolDetails] = useState({ score: 4, hasBlood: false, hasMucus: false });
    const [emergencySymptom, setEmergencySymptom] = useState({ lethargy: false, prayerPose: false, rapidBreathing: false });
    const [ingestionSuspicion, setIngestionSuspicion] = useState({ active: false, object: '', amount: '', time: '' });

    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const dateInputId = React.useId();

    // Snappy Responsive Logic: 
    // Instead of waiting for ResizeObserver, we proactively report 
    // our expected height during state changes for instant tracking.
    const reportSnappyHeight = () => {
        if (!onHeightChange) return;

        // Wait for next tick to let react finish rendering the DOM changes
        setTimeout(() => {
            if (containerRef.current) {
                const height = containerRef.current.getBoundingClientRect().height;
                onHeightChange(height + 48); // Pixel-perfect reveal + icon buffer
            }
        }, 0);
    };

    // Trigger snappy report on any state that changes height
    useEffect(() => {
        reportSnappyHeight();
    }, [showTags, showHealthPanel, note, photos, onHeightChange]);

    const HEALTH_CATEGORIES = [
        { id: 'vomit', label: '嘔吐', options: ['フードそのまま', '胃液/泡', '毛玉', 'その他'] },
        { id: 'toilet', label: '排泄', options: ['おしっこ正常', 'うんち正常', '軟便/下痢', '硬い'] },
        { id: 'physical', label: '体調', options: ['痒み/赤み', '目やに/涙', '跛行/元気ない', 'その他'] },
    ];

    useEffect(() => {
        if (cats.length > 0 && selectedCatIds.size === 0) {
            setSelectedCatIds(new Set([initialCatId || cats[0].id]));
        }
    }, [cats, initialCatId]);

    const toggleCat = (catId: string) => {
        setSelectedCatIds(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                if (next.size > 1) next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...files]);
            const urls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...urls]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const insertTag = (label: string) => {
        setSelectedTags(prev => {
            const next = new Set(prev);
            if (next.has(label)) {
                next.delete(label);
            } else {
                next.add(label);
            }
            return next;
        });
        // setShowTags(false); // Keep panel open for multiple selection
    };

    const handleSubmit = async () => {
        if (selectedCatIds.size === 0) {
            toast.error("ねこを選んでください");
            return;
        }
        if (!note.trim() && photos.length === 0 && selectedTags.size === 0 && !healthValue) {
            toast.error("メモか写真を入力してください");
            return;
        }

        setLoading(true);
        try {
            const catIds = Array.from(selectedCatIds);
            const type = isConsult ? 'worried' : 'daily';
            const batch_id = catIds.length > 1 ? crypto.randomUUID() : undefined;

            // Combine note with tags and health info for submission
            let finalNote = note;
            if (selectedTags.size > 0) {
                const tagText = Array.from(selectedTags).map(t => `[${t}]`).join(' ');
                finalNote = finalNote ? `${finalNote} ${tagText}` : tagText;
            }
            if (healthCategory && healthValue) {
                const healthText = `[${HEALTH_CATEGORIES.find(c => c.id === healthCategory)?.label}:${healthValue}]`;
                finalNote = finalNote ? `${finalNote} ${healthText}` : healthText;
            }

            for (const catId of catIds) {
                // symptom_details を構築
                const symptom_details: any = {};
                if (healthCategory === 'vomit') {
                    symptom_details.vomit = vomitDetails;
                } else if (healthCategory === 'toilet') {
                    symptom_details.stool = stoolDetails;
                }
                if (emergencySymptom.lethargy || emergencySymptom.prayerPose || emergencySymptom.rapidBreathing) {
                    symptom_details.emergency = emergencySymptom;
                }
                if (ingestionSuspicion.active) {
                    symptom_details.ingestion = ingestionSuspicion;
                }

                // addIncident handles photo upload internally
                const { error } = await addIncident(
                    catId,
                    type,
                    finalNote,
                    photos,
                    healthCategory || undefined,
                    healthValue || undefined,
                    onsetAt,
                    symptom_details,
                    batch_id
                );
                if (error) throw error;

                awardForNyannlog?.(catId);
            }

            toast.success(isConsult ? "相談を投稿しました" : "記録しました");

            setNote('');
            setPhotos([]);
            setPreviewUrls([]);
            setShowTags(false);
            setShowHealthPanel(false);
            setHealthCategory(null);
            setHealthValue(null);
            setSelectedTags(new Set());
            setIsConsult(false);
            setVomitDetails({ type: '', count: 1, hasBlood: false });
            setStoolDetails({ score: 4, hasBlood: false, hasMucus: false });
            setEmergencySymptom({ lethargy: false, prayerPose: false, rapidBreathing: false });
            setIngestionSuspicion({ active: false, object: '', amount: '', time: '' });
            onSubmitSuccess?.();
            onSuccess?.();
        } catch (e: any) {
            console.error('投稿エラー詳細:', e);
            console.error('エラーメッセージ:', e?.message);
            console.error('エラーコード:', e?.code);
            toast.error(`投稿に失敗しました: ${e?.message || '不明なエラー'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [note]);

    const hasContent = note.trim().length > 0 || photos.length > 0;
    const selectedCats = cats.filter(c => selectedCatIds.has(c.id));

    const isHistorySelected = onsetAt !== format(new Date(), 'yyyy-MM-dd');

    return (
        <div ref={containerRef} className="w-full flex flex-col gap-4 px-1 pb-4">
            {/* 1. Cat Chips (Refined Spacing) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {cats.map((cat) => {
                    const isSelected = selectedCatIds.has(cat.id);
                    return (
                        <button
                            key={cat.id}
                            onClick={() => toggleCat(cat.id)}
                            className={cn(
                                "flex items-center h-10 gap-2 px-1 rounded-full transition-all duration-300 shrink-0",
                                isSelected
                                    ? "bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-black/[0.04]"
                                    : "bg-black/[0.03] opacity-50 grayscale hover:opacity-100"
                            )}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden shadow-inner">
                                {cat.avatar ? (
                                    <img src={getFullImageUrl(cat.avatar)} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">
                                        {cat.name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                            {isSelected && (
                                <span className="text-[14px] font-bold text-[#3a3a3c] pr-3 tracking-tight">
                                    {cat.name}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 2. Main Bento Input (Deep Depth) */}
            <div className="relative group">
                <textarea
                    ref={textareaRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`${selectedCats[0]?.name || 'ねこ'}の様子を記録...`}
                    className={cn(
                        "w-full bg-white/90 backdrop-blur-3xl rounded-[28px] px-6 py-5 text-[#1c1c1e] text-[17px] min-h-[110px] leading-relaxed placeholder:text-gray-400/70 resize-none focus:outline-none transition-all duration-500",
                        "shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02),0_20px_40px_-10px_rgba(0,0,0,0.05)]",
                        isConsult && "bg-[#F5F5F7]/80 shadow-inner"
                    )}
                    rows={2}
                />

                {/* Floating Previews */}
                <AnimatePresence>
                    {previewUrls.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute bottom-4 left-4 right-4 flex gap-2.5 overflow-x-auto no-scrollbar z-20"
                        >
                            {previewUrls.map((url, i) => (
                                <motion.div
                                    key={i}
                                    layout
                                    className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-xl border-2 border-white/80 backdrop-blur-sm"
                                >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active Chips (Tags & Health) */}
                <div className="flex flex-wrap gap-2 px-4 pb-2 empty:pb-0">
                    {healthCategory && healthValue && (
                        <div className="flex items-center gap-1 bg-[#1c1c1e] text-white px-3 py-1 rounded-full text-[13px] font-bold shadow-sm">
                            <Activity className="w-3.5 h-3.5" />
                            <span>{HEALTH_CATEGORIES.find(c => c.id === healthCategory)?.label}:{healthValue}</span>
                            <button
                                onClick={() => {
                                    setHealthCategory(null);
                                    setHealthValue(null);
                                }}
                                className="ml-1 opacity-70 hover:opacity-100"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {Array.from(selectedTags).map(tag => (
                        <div key={tag} className="flex items-center gap-1 bg-white border border-black/[0.04] text-[#1c1c1e] px-3 py-1 rounded-full text-[13px] font-bold shadow-sm">
                            <Tag className="w-3.5 h-3.5 text-[#8e8e93]" />
                            <span>{tag}</span>
                            <button
                                onClick={() => insertTag(tag)}
                                className="ml-1 opacity-40 hover:opacity-100"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

            </div>

            {/* In-Flow Panels (Tags & Health) - Natural Layout */}
            {showTags && (
                <div className="w-full mb-2">
                    <div className="flex flex-wrap items-center gap-2 py-1 px-1">
                        {TAGS.map((tag) => {
                            const isSelected = selectedTags.has(tag.label);
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => insertTag(tag.label)}
                                    className={cn(
                                        "px-4 h-9 rounded-full backdrop-blur-lg shadow-sm border border-black/[0.04] flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all text-[13px] font-bold",
                                        isSelected
                                            ? "bg-[#1c1c1e] text-white"
                                            : "bg-white/80 text-[#1c1c1e] hover:bg-white"
                                    )}
                                >
                                    <tag.icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-[#1c1c1e]")} />
                                    <span>{tag.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {showHealthPanel && (
                <div className="w-full mb-2">
                    <div className="flex flex-col gap-3 py-1 px-1">
                        {HEALTH_CATEGORIES.map((cat) => (
                            <div key={cat.id} className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black text-[#8e8e93] px-1 uppercase tracking-widest">{cat.label}</span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {cat.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                setHealthCategory(cat.id);
                                                setHealthValue(opt);
                                                setShowHealthPanel(false);
                                            }}
                                            className={cn(
                                                "px-3 h-8 rounded-full backdrop-blur-md shadow-sm border border-black/[0.04] text-[12px] font-bold whitespace-nowrap active:scale-95 transition-all",
                                                (healthCategory === cat.id && healthValue === opt)
                                                    ? "bg-[#1c1c1e] text-white"
                                                    : "bg-white/80 text-[#1c1c1e] hover:bg-white"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Master Controller (Compact on Mobile) */}
            <div className="flex items-center justify-between gap-1 h-11 w-full overflow-hidden px-1">
                {/* Left: Input Tools (Precision Circles) */}
                <div className="flex items-center gap-1 h-full shrink-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-full bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#5c5c5f] active:scale-90 transition-all border border-black/[0.02]"
                    >
                        <Camera className="w-5 h-5 stroke-[1.8]" />
                    </button>
                    <button
                        onClick={() => setShowTags(prev => !prev)}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-90 transition-all border border-black/[0.02]",
                            showTags ? "bg-[#1c1c1e] text-white" : "bg-white/95 text-[#5c5c5f]"
                        )}
                    >
                        <Tag className="w-5 h-5 stroke-[1.8]" />
                    </button>
                    <button
                        onClick={() => setShowHealthPanel(prev => !prev)}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-[0_2px_8_rgba(0,0,0,0.08)] active:scale-90 transition-all border border-black/[0.02]",
                            showHealthPanel ? "bg-[#1c1c1e] text-white" : "bg-white/95 text-[#5c5c5f]"
                        )}
                    >
                        <Activity className="w-5 h-5 stroke-[1.8]" />
                    </button>
                </div>

                {/* Right: Submission Helpers (Pills) */}
                <div className="flex items-center gap-1 h-full flex-1 justify-end min-w-0">
                    <button
                        onClick={() => setIsConsult(prev => !prev)}
                        className={cn(
                            "h-10 px-2 sm:px-3 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-black/[0.01] shrink",
                            isConsult
                                ? "bg-[#1c1c1e] text-white shadow-inner"
                                : "bg-white/60 text-[#8e8e93]"
                        )}
                    >
                        <MessageCircle className={cn("w-4 h-4", isConsult && "fill-current")} />
                        <span className="text-[12px] sm:text-[13px] font-black tracking-tight whitespace-nowrap hidden min-[380px]:inline">相談</span>
                    </button>

                    <div className="relative h-10 flex items-center shrink">
                        <input
                            type="date"
                            value={onsetAt}
                            onChange={(e) => setOnsetAt(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={cn(
                                "h-full px-2 sm:px-3 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-black/[0.01] appearance-none",
                                isHistorySelected
                                    ? "bg-[#1c1c1e] text-white shadow-inner"
                                    : "bg-white/60 text-[#8e8e93]"
                            )}
                            style={{
                                fontFamily: 'inherit'
                            }}
                        />
                        {/* Icon Overlay (Must be pointer-events-none to let input handle clicks) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-1 px-2 sm:px-3">
                            <Calendar className={cn("w-4 h-4", isHistorySelected ? "text-white" : "text-[#8e8e93]")} />
                            <span className={cn("text-[12px] sm:text-[13px] font-black tracking-tight tabular-nums whitespace-nowrap", isHistorySelected ? "text-white" : "text-[#8e8e93]")}>
                                {isHistorySelected ? onsetAt.slice(5) : <span className="hidden min-[380px]:inline">今日</span>}
                                {!isHistorySelected && <span className="min-[380px]:hidden">今</span>}
                            </span>
                        </div>
                        {/* HACK: Mask transparent color on the native input text so we show our custom span */}
                        <style jsx>{`
                            input[type="date"]::-webkit-calendar-picker-indicator {
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                width: auto;
                                height: auto;
                                color: transparent;
                                background: transparent;
                            }
                            input[type="date"]::-webkit-inner-spin-button,
                            input[type="date"]::-webkit-clear-button {
                                display: none;
                            }
                            input[type="date"] {
                                color: transparent;
                            }
                        `}</style>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!hasContent || loading}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.15)] active:scale-90 transition-all ml-0.5 border border-black/[0.02] shrink-0",
                            hasContent
                                ? "bg-[#1c1c1e] text-white shadow-black/20"
                                : "bg-white/20 text-gray-300 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
            />
        </div >
    );
}
