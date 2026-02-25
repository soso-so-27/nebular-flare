"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Camera, ChevronRight, ChevronLeft,
    Loader2, Sparkles, MessageCircle, Calendar,
    Tag, Check, Trash2, Utensils, Activity, Eye,
    Cat as CatIcon, Plus, Moon, Heart, Zap,
    AlertTriangle, Users, Sun, Stethoscope, Info,
    Image as ImageIcon
} from "lucide-react";
import { useCatContext, useCareContext, useIncidentContext, useCoreContext } from "@/store/app-store";
import { format } from 'date-fns';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase';
import { uploadCatImage } from "@/lib/storage";
import { getFullImageUrl, cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { resizeImage } from '@/lib/image-processing';

const TAGS = [
    { id: 'nenne', label: '眠り' },
    { id: 'gohan', label: 'ごはん' },
    { id: 'asobi', label: '遊び' },
    { id: 'amaenbou', label: '甘えん坊' },
    { id: 'itazura', label: 'いたずら' },
    { id: 'happening', label: 'ハプニング' },
    { id: 'futari', label: 'ふたり' },
    { id: 'madobe', label: '窓辺' },
    { id: 'odekake', label: 'おでかけ・病院' },
    { id: 'other', label: 'その他' },
];

const AI_TAG_MAP: Record<string, string> = {
    'Food': 'ごはん',
    'Eating': 'ごはん',
    'Feeding': 'ごはん',
    'meal': 'ごはん',
    'Toilet': 'トイレ',
    'Pooping': 'トイレ',
    'Peeing': 'トイレ',
    'accident': 'トイレ',
    'Health': 'からだ',
    'Body': 'からだ',
    'Vomit': 'からだ',
    'vet': 'からだ',
    'Behavior': 'ようす',
    'Status': 'ようす',
    'Event': 'できごと',
    'sleep': 'ようす',
    'play': 'ようす',
    'mischief': 'ようす',
    'explore': 'ようす',
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
    const [aiTags, setAiTags] = useState<Set<string>>(new Set()); // Track which tags are AI-generated
    const [aiReason, setAiReason] = useState<string | null>(null);
    const [aiConfidence, setAiConfidence] = useState<number | null>(null);
    const [rawAiAnalysis, setRawAiAnalysis] = useState<any>(null);
    const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
    const [aiSelectedShelf, setAiSelectedShelf] = useState<string | null>(null); // Track AI-suggested shelf
    const [tagInput, setTagInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Performance: Fast upload states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);

    // Debugging
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const isSavingRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
    };

    // Initialize with photos if provided
    useEffect(() => {
        if (isOpen && initialPhotos && initialPhotos.length > 0) {
            addLog(`Initialized with ${initialPhotos.length} photos`);
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

    const handleFiles = async (files: File[]) => {
        addLog(`Selected ${files.length} files`);
        const newUrls = files.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => [...prev, ...newUrls]);
        setPhotos(prev => [...prev, ...files]);

        // Immediate background upload for each new file
        setIsUploading(true);
        try {
            const uploadPromises = files.map(async (file) => {
                addLog(`Processing: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
                // 1. Resize on client (faster upload, faster AI)
                const optimizedFile = await resizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
                addLog(`Optimized: ${optimizedFile.name} (${Math.round(optimizedFile.size / 1024)}KB)`);

                // 2. Upload to 'incoming' folder (final bucket)
                const { storagePath, error } = await uploadCatImage('incoming', optimizedFile);
                if (error) {
                    addLog(`Upload error for ${file.name}: ${error}`);
                    throw new Error(error);
                }
                addLog(`Uploaded: ${storagePath}`);
                return storagePath;
            });

            const results = await Promise.all(uploadPromises);
            setUploadedPaths(prev => [...prev, ...(results.filter(Boolean) as string[])]);
        } catch (e: any) {
            console.error("[Quick Upload Error]", e);
            const msg = e?.message || String(e);
            addLog(`Batch upload error: ${msg}`);
            toast.error(`アップロード失敗: ${msg}`);
        } finally {
            setIsUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        addLog(`Removing photo at index ${index}: ${uploadedPaths[index] || 'no upload path'}`);
        if (previewUrls[index]?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrls[index]);
        }
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setUploadedPaths(prev => prev.filter((_, i) => i !== index));
    };

    const startAnalysis = async () => {
        if (photos.length === 0) return;
        addLog(`Starting AI Analysis... (photos: ${photos.length}, uploaded: ${uploadedPaths.length})`);
        setStep('ai');
        setIsAnalyzing(true);

        try {
            if (isDemo) {
                addLog("Demo mode: skipping real API call");
                await new Promise(r => setTimeout(r, 1500));
                if (cats.length > 0) setSuggestedCatIds(new Set([cats[0].id]));
                setAllTags(['ごはん', '遊んでる', 'リラックス']);
            } else {
                // 1. Ensure the first photo is uploaded (reuse the path from immediate upload)
                let targetUrl = '';
                if (uploadedPaths.length > 0) {
                    targetUrl = getFullImageUrl(uploadedPaths[0]);
                    addLog(`Using pre-uploaded path: ${uploadedPaths[0]} -> ${targetUrl}`);
                } else {
                    addLog(`Fallback upload starting (uploading first photo)...`);
                    const optimizedFile = await resizeImage(photos[0], { maxWidth: 1200, maxHeight: 1200 });
                    const { publicUrl, storagePath, error: uploadError } = await uploadCatImage('incoming', optimizedFile);
                    if (uploadError) {
                        addLog(`Fallback upload failed: ${uploadError}`);
                        throw new Error(uploadError);
                    }
                    targetUrl = publicUrl!;
                    addLog(`Fallback upload success: ${storagePath}`);
                    setUploadedPaths(prev => [storagePath!, ...prev]);
                }

                addLog(`Calling analyzeCatImage API...`);
                // Use a dummy UUID to avoid PostgreSQL syntax errors on the backend
                const dummyId = '00000000-0000-0000-0000-000000000000';
                const { data, error: aiError } = await analyzeCatImage(dummyId, targetUrl, cats);
                if (aiError) {
                    addLog(`AI API error: ${aiError.message}`);
                    if (aiError.details) addLog(`Details: ${aiError.details}`);
                    throw new Error(aiError.message);
                }

                const analysis = data.ai_analysis || {};
                const metadata = analysis.metadata || {};
                addLog(`AI Analysis received: ${analysis.zukanShelf || 'no shelf'}`);

                // 3. Set suggestions (Multiple Cats support)
                const suggestedIds = new Set<string>();
                if (analysis.catIds && Array.isArray(analysis.catIds)) {
                    analysis.catIds.forEach((id: string) => suggestedIds.add(id));
                } else if (analysis.catId) {
                    suggestedIds.add(analysis.catId);
                }

                if (suggestedIds.size > 0) {
                    addLog(`AI suggested catIds: ${Array.from(suggestedIds).join(', ')}`);
                    setSuggestedCatIds(suggestedIds);
                } else if (activeCatId) {
                    addLog(`Falling back to active catId: ${activeCatId}`);
                    setSuggestedCatIds(new Set([activeCatId]));
                }

                // AI Response Mapping (Expanded Axes A-K)
                const newTags: string[] = [];
                const newAiTags = new Set<string>();

                // Helper to add metadata values as tags
                const addMetadataTag = (val: string | null | undefined) => {
                    if (val && val !== '不明' && val !== 'unknown' && !newTags.includes(val)) {
                        newTags.push(val);
                        newAiTags.add(val);
                    }
                };

                // Add all metadata axes as tags
                if (metadata) {
                    Object.values(metadata).forEach((val: any) => {
                        if (typeof val === 'string') addMetadataTag(val);
                    });
                }

                // Legacy/UI tags support
                if (analysis.uiTags && Array.isArray(analysis.uiTags)) {
                    analysis.uiTags.forEach((t: string) => addMetadataTag(t));
                }

                if (analysis.labels?.moment && analysis.labels.moment !== 'unknown') {
                    const momentLabel = AI_TAG_MAP[analysis.labels.moment] || analysis.labels.moment;
                    addMetadataTag(momentLabel);
                }

                setAllTags(newTags);
                setAiTags(newAiTags);
                setAiReason(analysis.identificationReason && analysis.identificationReason !== '不明' ? analysis.identificationReason : (analysis.notes && analysis.notes !== '不明' ? analysis.notes : "AI判定中、または特徴が掴みづらい場面です。"));
                setAiConfidence(analysis.catConfidence || null);
                setRawAiAnalysis(analysis);

                if (analysis.zukanShelf && analysis.zukanShelf !== '不明') {
                    setSelectedShelf(analysis.zukanShelf);
                    setAiSelectedShelf(analysis.zukanShelf);
                } else {
                    setSelectedShelf('その他');
                    setAiSelectedShelf(null);
                }
                addLog("All analysis states set successfully");
            }
        } catch (e: any) {
            console.error("[Capture Analysis Error]", e);
            const msg = e?.message || String(e);
            addLog(`Analysis process failed: ${msg}`);
            toast.error(`AI判定失敗: ${msg}`);
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
        setAiTags(prev => {
            const next = new Set(prev);
            next.delete(tag);
            return next;
        });
    };

    const handleSave = async () => {
        if (suggestedCatIds.size === 0) {
            toast.error("ねこを選んでください");
            return;
        }

        if (isUploading) {
            toast.error("写真のアップロードが終わるまでお待ちください");
            return;
        }

        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setStep('saving');
        addLog(`Saving Incident... cats=${Array.from(suggestedCatIds).join(',')}`);

        try {
            // Filter to ensure we only send IDs that exist in our cat list (valid UUIDs)
            const catIds = Array.from(suggestedCatIds).filter(id => cats.some(c => c.id === id));

            if (catIds.length === 0) {
                toast.error("有効なねこを選択してください");
                isSavingRef.current = false;
                setStep('ai');
                return;
            }
            const type = isConsult ? 'worried' : 'daily';

            // 1. Final Persistence: Create a single unified Incident
            const dbTags = allTags.map(t => ({
                name: t,
                isAi: aiTags.has(t),
                confirmed: true
            }));

            addLog(`Calling addIncident with ${uploadedPaths.length} photos (total paths: ${uploadedPaths.join(',')})`);
            // Save single incident with already uploaded paths (prevents duplicate uploads)
            await addIncident(
                catIds[0], // primary catId
                type,
                note,
                undefined, // Skip sending Files as they are already uploaded
                undefined, undefined,
                onsetAt,
                {
                    tags: dbTags,
                    ai_analysis: {
                        ...rawAiAnalysis,
                        catConfidence: aiConfidence,
                        identificationReason: aiReason,
                        zukanShelf: selectedShelf || rawAiAnalysis?.zukanShelf
                    }
                },
                undefined,     // batch_id
                catIds,        // all catIds array
                uploadedPaths  // PASS ALREADY UPLOADED PATHS
            );

            addLog(`Save success!`);
            toast.success("記録しました");
            onClose();
            // Reset state
            setPhotos([]);
            setPreviewUrls([]);
            setNote('');
            setStep('annotate');
            setSuggestedCatIds(new Set());
            setAllTags([]);
            setAiTags(new Set());
            setTagInput('');
            setIsConsult(false);
            setOnsetAt(format(new Date(), 'yyyy-MM-dd'));
        } catch (e: any) {
            console.error("[Capture Save Error]", e);
            const msg = e?.message || String(e);
            addLog(`Save failed: ${msg}`);
            toast.error(`保存失敗: ${msg}`);
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
                className="absolute inset-0 bg-[#4E342E]/10 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#fafafa] dark:bg-[#1c1c1e] w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                {/* Pull Indicator */}
                <div className="flex flex-col items-center pt-3 pb-1 gap-2">
                    <div className="w-12 h-1.5 bg-gray-200/60 rounded-full" />
                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                        {(['annotate', 'ai', 'saving'] as const).map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-300",
                                    step === s ? "bg-[#4E342E] dark:bg-white scale-125" :
                                        (['annotate', 'ai', 'saving'].indexOf(step) > i) ? "bg-[#4E342E]/40 dark:bg-white/40" :
                                            "bg-gray-200 dark:bg-white/10"
                                )} />
                                {i < 2 && <div className={cn(
                                    "w-4 h-px transition-colors",
                                    (['annotate', 'ai', 'saving'].indexOf(step) > i) ? "bg-[#4E342E]/30 dark:bg-white/30" : "bg-gray-200 dark:bg-white/10"
                                )} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Header */}
                <header className="px-6 py-4 flex items-center justify-between" role="banner">
                    <button
                        onClick={onClose}
                        aria-label="閉じる"
                        className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-[#8E8B85] active:scale-90 transition-all border border-black/[0.02]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-[#4E342E] dark:text-white tracking-tight">
                        {step === 'annotate' && '写真を記録しよう'}
                        {step === 'ai' && 'AIが分析しました'}
                        {step === 'saving' && '保存中...'}
                    </h2>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        aria-label="デバッグ情報を表示"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-200 active:scale-90 transition-all"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-6">

                    {step === 'annotate' && (
                        <>
                            {/* Photo Preview Scroll */}
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2" role="list" aria-label="プレビュー写真一覧">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="relative group shrink-0" role="listitem">
                                        <img
                                            src={url}
                                            alt={`プレビュー写真 ${i + 1}`}
                                            className="w-32 h-32 object-cover rounded-[28px] shadow-sm ring-1 ring-black/5"
                                        />
                                        <button
                                            onClick={() => removePhoto(i)}
                                            aria-label={`この写真を削除`}
                                            className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 active:scale-90 transition-all border border-black/5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    aria-label="写真を追加する"
                                    className="w-32 h-32 rounded-[28px] border-2 border-dashed border-black/[0.06] bg-white/50 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 text-[#8E8B85] shrink-0 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-black/[0.02] group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                        <Camera className="w-5 h-5 group-hover:text-black" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">追加</span>
                                </button>
                            </div>

                            {/* Note Input */}
                            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-black/[0.02] space-y-3">
                                <label className="flex items-center gap-2 px-1" htmlFor="note-input">
                                    <span className="text-[12px] font-black text-[#8E8B85] uppercase tracking-[0.2em]">メモ</span>
                                </label>
                                <textarea
                                    id="note-input"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="何があった？"
                                    className="w-full bg-transparent p-1 text-[18px] font-medium text-[#4E342E] dark:text-[#E8E6E1] placeholder:text-[#D4CFC9] min-h-[140px] border-none focus:ring-0 resize-none leading-relaxed"
                                />
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsConsult(!isConsult)}
                                    aria-pressed={isConsult}
                                    className={cn(
                                        "flex items-center justify-between p-4 px-5 rounded-[28px] border transition-all duration-300",
                                        isConsult
                                            ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-sm"
                                            : "bg-white dark:bg-[#2c2c2e] border-black/[0.02] text-[#8E8B85] shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
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
                                    <div className="w-9 h-9 rounded-full bg-black/[0.02] flex items-center justify-center text-[#8E8B85]">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-[#4E342E]">
                                        {onsetAt === format(new Date(), 'yyyy-MM-dd') ? "今日" : onsetAt.slice(5)}
                                    </span>
                                    <input
                                        type="date"
                                        value={onsetAt}
                                        onChange={(e) => setOnsetAt(e.target.value)}
                                        aria-label="日付を選択"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="ml-auto">
                                        <ChevronRight className="w-4 h-4 text-[#D4CFC9]" />
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
                                        <Loader2 className="w-12 h-12 text-black dark:text-white animate-spin" />
                                    </div>
                                    <p className="text-gray-400 font-bold text-lg opacity-80">AIが写真を解析中...</p>
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
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-brand-peach/60" />
                                                    <span className="text-[12px] font-black text-[#8E8B85] uppercase tracking-[0.2em]">どの猫ですか？</span>
                                                </div>
                                                {aiConfidence !== null && (
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-full text-[11px] font-bold bg-black dark:bg-white text-white dark:text-black"
                                                    )}>
                                                        AI確信度: {Math.round(aiConfidence * 100)}%
                                                    </div>
                                                )}
                                            </div>

                                            {aiReason && (
                                                <div className="mx-1 p-3.5 bg-white dark:bg-[#2c2c2e] border border-black/[0.03] dark:border-white/5 rounded-2xl flex items-start gap-2.5 shadow-sm">
                                                    <p className="text-[13px] text-[#4E342E] dark:text-[#E8E6E1] font-medium leading-relaxed">
                                                        <span className="text-[#8E8B85] dark:text-[#A6A29A] font-bold mr-1">判定理由:</span>
                                                        {aiReason}
                                                    </p>
                                                </div>
                                            )}

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
                                                                ? "ring-4 ring-black dark:ring-white ring-offset-2 ring-offset-[#fafafa] dark:ring-offset-[#1c1c1e] scale-105"
                                                                : "ring-1 ring-black/5 opacity-40 grayscale"
                                                        )}>
                                                            <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-inner">
                                                                {cat.avatar ? (
                                                                    <img
                                                                        src={getFullImageUrl(cat.avatar)}
                                                                        alt={cat.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                                        <CatIcon className="w-8 h-8 opacity-20" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-bold transition-colors",
                                                            suggestedCatIds.has(cat.id) ? "text-[#4A3028]" : "text-gray-400"
                                                        )}>{cat.name}</span>
                                                        {suggestedCatIds.has(cat.id) && (
                                                            <div className="absolute -top-1 -right-1 w-7 h-7 bg-black dark:bg-white rounded-full border-2 border-[#fafafa] dark:border-[#1c1c1e] flex items-center justify-center text-white dark:text-black shadow-lg shadow-black/20">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Suggested Tags Card */}
                                        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/[0.02] space-y-6">
                                            {/* Zukan Shelf Selection */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-[#8E8B85] uppercase tracking-[0.2em]">図鑑の棚（アルバム）</span>
                                                    </div>
                                                    {aiSelectedShelf && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black dark:bg-white rounded-full">
                                                            <span className="text-[11px] text-white dark:text-black font-bold uppercase tracking-wider">AI 推奨</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 py-1">
                                                    {TAGS.map(dt => (
                                                        <button
                                                            key={dt.id}
                                                            onClick={() => setSelectedShelf(dt.label)}
                                                            className={cn(
                                                                "px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2.5 border",
                                                                selectedShelf === dt.label
                                                                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-md shadow-black/10"
                                                                    : "bg-black/[0.03] border-transparent text-gray-500 hover:bg-black/[0.06] dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            {dt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px bg-black/[0.04]" />

                                            {/* Generic Tags Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-[#8E8B85] uppercase tracking-[0.2em]">検索用キーワード・特徴</span>
                                                    </div>
                                                    {isAnalyzing && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/[0.03] rounded-full">
                                                            <Loader2 className="w-3.5 h-3.5 text-[#8E8B85] animate-spin" />
                                                            <span className="text-[11px] text-[#8E8B85] font-bold">推論中...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mx-1 p-3 bg-black/[0.03] dark:bg-white/5 rounded-2xl flex items-start gap-2.5 opacity-80">
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-bold">
                                                        写真に映っている物や状況をキーワードとして登録しておくと、後から図鑑で「窓辺」「スイカ」などの言葉で検索できるようになります。
                                                    </p>
                                                </div>

                                                {/* Selected Tags Display */}
                                                <div className="flex flex-wrap gap-2.5">
                                                    {allTags.filter(t => !TAGS.some(dt => dt.label === t)).map(tag => (
                                                        <motion.button
                                                            layout
                                                            key={tag}
                                                            onClick={() => removeTag(tag)}
                                                            whileTap={{ scale: 0.95 }}
                                                            className={cn(
                                                                "px-5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 border transition-all",
                                                                aiTags.has(tag)
                                                                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-sm"
                                                                    : "bg-white dark:bg-[#2c2c2e] border-black/[0.05] dark:border-white/5 text-gray-700 dark:text-gray-400 hover:border-black/20"
                                                            )}
                                                        >
                                                            {tag}
                                                            <X className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                                        </motion.button>
                                                    ))}

                                                    {allTags.filter(t => !TAGS.some(dt => dt.label === t)).length === 0 && !isAnalyzing && (
                                                        <div className="py-2 px-1 text-xs text-gray-300 font-medium italic">
                                                            タグがありません
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Custom Tag Input */}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addLocalTag()}
                                                        placeholder="例：窓辺、今日の一枚"
                                                        className="flex-1 bg-black/[0.02] rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 border border-black/[0.01] focus:outline-none focus:ring-2 focus:ring-brand-peach/10"
                                                    />
                                                    <button
                                                        onClick={addLocalTag}
                                                        className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg shadow-black/5 active:scale-95 transition-all"
                                                    >
                                                        <Plus className="w-7 h-7" />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-[#8E8B85] dark:text-[#A6A29A] font-bold px-1 tracking-tight">
                                                    ※AI判定されたキーワードは自動で強調されます
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
                            <Loader2 className="w-12 h-12 text-black dark:text-white animate-spin" />
                            <p className="text-xl font-bold text-gray-800 dark:text-white opacity-80">保存しています...</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <footer className="p-8 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] bg-white/60 backdrop-blur-xl shrink-0 border-t border-black/[0.02]" role="contentinfo">
                    {step === 'annotate' && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={startAnalysis}
                                disabled={photos.length === 0}
                                aria-label="AI解析を開始して内容を確認する"
                                className="w-full h-16 rounded-[32px] bg-black dark:bg-white text-white dark:text-black font-black text-lg shadow-2xl shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                            >
                                <span>AI判定に進む</span>
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={photos.length === 0}
                                aria-label="AI判定をスキップしてすぐ保存する"
                                className="w-full h-12 rounded-[24px] text-[#787570] dark:text-[#A6A29A] font-bold text-[14px] active:scale-[0.98] transition-all hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                スキップして保存
                            </button>
                        </div>
                    )}

                    {(step === 'ai' || step === 'saving') && !isAnalyzing && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep('annotate')}
                                disabled={step === 'saving'}
                                aria-label="入力画面に戻る"
                                className="w-16 h-16 rounded-[28px] bg-black/[0.03] flex items-center justify-center text-[#8E8B85] active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={step === 'saving' || isUploading}
                                aria-label="この内容で記録を保存する"
                                className={cn(
                                    "flex-1 h-16 rounded-[32px] bg-black dark:bg-white text-white dark:text-black font-black text-lg shadow-2xl shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3",
                                    step === 'saving' && "opacity-80 pointer-events-none"
                                )}
                            >
                                {step === 'saving' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>保存する</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </footer>

                {/* Debug Overlay */}
                {showDebug && (
                    <div className="absolute inset-x-0 bottom-0 z-[100] bg-white/95 dark:bg-black/95 h-[70%] overflow-y-auto p-6 font-mono text-[11px] rounded-t-[32px] shadow-2xl border-t border-black/10">
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit py-2 border-b border-black/5">
                            <h3 className="font-black text-sm tracking-widest text-gray-400">デバッグログ</h3>
                            <button
                                onClick={() => setShowDebug(false)}
                                className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold"
                            >
                                閉じる
                            </button>
                        </div>
                        <div className="space-y-1.5 pb-20">
                            {debugLogs.length === 0 && <div className="text-gray-300 italic">No logs yet...</div>}
                            {debugLogs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-black/[0.03] dark:border-white/5 pb-1 text-gray-600 dark:text-gray-300 break-all">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
