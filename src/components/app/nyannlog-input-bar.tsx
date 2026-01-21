"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from '@/store/app-store';
import { Camera, Send, MessageCircle, Tag, ChevronRight, X, Loader2, Utensils, Activity, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFootprintContext } from "@/providers/footprint-provider";

// =====================================================
// Config
// =====================================================

// Basic Tags
const TAGS = [
    { id: 'gohan', label: 'ごはん', icon: Utensils },
    { id: 'toilet', label: 'トイレ', icon: Activity },
    { id: 'karada', label: 'からだ', icon: Activity }, // Trigger drill-down/submenu
    { id: 'yousu', label: 'ようす', icon: Eye },
    { id: 'dekigoto', label: 'できごと', icon: Calendar },
];

// Health Sub-options (Drill-down)
const HEALTH_CATEGORIES = [
    { id: 'vomit', label: '嘔吐', options: ['フードそのまま', '胃液/泡', '毛玉', 'その他'] },
    { id: 'toilet_sub', label: '排泄詳細', options: ['軟便/下痢', '硬い', '血尿', 'その他'] },
    { id: 'physical', label: '体調', options: ['痒み/赤み', '目やに/涙', '元気ない', 'その他'] },
];

type Props = {
    onClose?: () => void; // Optional if we ever need to close it (e.g. if it was a modal)
};

export function NyannlogInputBar({ onClose }: Props) {
    const { cats, addIncident, uploadCatImage } = useAppState();
    const { awardForNyannlog } = useFootprintContext();

    // -- State --
    const [mode, setMode] = useState<'record' | 'consult'>('record');
    const [note, setNote] = useState('');
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
    const [isCatStackExpanded, setIsCatStackExpanded] = useState(false);

    // Photos
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tags & Smart Options
    const [showTags, setShowTags] = useState(false);
    const [activeDrillDown, setActiveDrillDown] = useState<string | null>(null); // 'vomit', 'physical' etc.
    const [insertedTags, setInsertedTags] = useState<string[]>([]); // Tags inserted into text as "[Tag]"

    const [loading, setLoading] = useState(false);

    // Default select all or first
    useEffect(() => {
        if (cats.length > 0 && selectedCatIds.size === 0) {
            setSelectedCatIds(new Set([cats[0].id]));
        }
    }, [cats]);

    // -- Handlers --

    const toggleCat = (catId: string) => {
        setSelectedCatIds(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                // Prevent empty selection? Allow for now, validation on send
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

    const insertTag = (label: string, category?: string, value?: string) => {
        // Construct tag string. Simple "[Tag]" or "[Category: Value]"
        let tagText = `[${label}]`;
        if (category && value) {
            tagText = `[${category}: ${value}]`;
        }

        // Append to note
        setNote(prev => (prev ? prev + ' ' : '') + tagText + ' ');
        setInsertedTags(prev => [...prev, tagText]);

        // Close menus
        setActiveDrillDown(null);
        // setShowTags(false); // Keep tags open? Maybe close for cleaner UI
    };

    const handleSubmit = async () => {
        if (selectedCatIds.size === 0) {
            toast.error("ねこを選んでください");
            return;
        }
        if (!note.trim() && photos.length === 0) {
            toast.error("メモか写真を入力してください");
            return;
        }

        setLoading(true);
        try {
            const catIds = Array.from(selectedCatIds);
            const type = mode === 'consult' ? 'worried' : 'daily';

            for (const catId of catIds) {
                // 1. Register incident
                const { error } = await addIncident(
                    catId,
                    type,
                    note,
                    photos,
                    // We allow healthCategory to be inferred from tags text for now or simple undefined
                    // Ideally we parse the note for structured data but for "Chat UI" plain text is fine
                    undefined,
                    undefined
                );
                if (error) throw error;

                // 2. Upload photos to gallery
                if (photos.length > 0) {
                    for (const photo of photos) {
                        await uploadCatImage(catId, photo, note);
                    }
                }

                // 3. Award points
                awardForNyannlog?.(catId);
            }

            toast.success(mode === 'consult' ? "相談を投稿しました" : "記録しました");

            // Reset
            setNote('');
            setPhotos([]);
            setPreviewUrls([]);
            setIsCatStackExpanded(false);
            setShowTags(false);
            setActiveDrillDown(null);
        } catch (e: any) {
            console.error(e);
            toast.error("投稿に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // -- Render Helpers --
    const getCatAvatar = (catId: string) => {
        const cat = cats.find(c => c.id === catId);
        return cat?.avatar || '/placeholder-cat.png'; // Fallback
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
            {/* 1. Accessory Rail (Glass) */}
            <div className="w-full flex justify-center -mb-3 relative z-0 pointer-events-auto">
                <AnimatePresence>
                    {showTags ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-[#1E1E23]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex gap-2 overflow-x-auto no-scrollbar max-w-full shadow-lg"
                        >
                            {/* Back Button for Drilldown */}
                            {activeDrillDown && (
                                <button
                                    onClick={() => setActiveDrillDown(null)}
                                    className="p-1.5 rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                </button>
                            )}

                            {/* Drill Down or Top Level */}
                            {!activeDrillDown ? (
                                <>
                                    {TAGS.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => {
                                                if (tag.id === 'karada') {
                                                    setActiveDrillDown('root_health'); // Show health sub-cats
                                                } else {
                                                    insertTag(tag.label);
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 whitespace-nowrap flex items-center gap-1.5"
                                        >
                                            <tag.icon className="w-3 h-3 opacity-70" />
                                            {tag.label}
                                        </button>
                                    ))}
                                </>
                            ) : activeDrillDown === 'root_health' ? (
                                <>
                                    {HEALTH_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveDrillDown(cat.id)}
                                            className="px-3 py-1.5 rounded-lg bg-[#E8B4A0]/20 border border-[#E8B4A0]/30 text-[10px] font-bold text-[#E8B4A0] hover:bg-[#E8B4A0]/30 whitespace-nowrap"
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </>
                            ) : (
                                // Leaf Options (e.g. Vomit options)
                                <>
                                    {HEALTH_CATEGORIES.find(c => c.id === activeDrillDown)?.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => insertTag(opt, HEALTH_CATEGORIES.find(c => c.id === activeDrillDown)?.label, opt)}
                                            className="px-3 py-1.5 rounded-lg bg-[#E8B4A0] text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </>
                            )}
                        </motion.div>
                    ) : (
                        // Default Rail (Mode Switcher)
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-2 w-full"
                        >
                            {/* Segmented Control */}
                            <div className="flex p-0.5 bg-black/40 rounded-lg border border-white/10 relative w-full max-w-[200px]">
                                <motion.div
                                    className="absolute top-0.5 bottom-0.5 rounded-md bg-white/10 shadow-sm z-0"
                                    initial={false}
                                    animate={{
                                        left: mode === 'record' ? '2px' : '50%',
                                        width: 'calc(50% - 4px)',
                                        x: mode === 'record' ? 0 : 0
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                                <button
                                    onClick={() => setMode('record')}
                                    className={`flex-1 relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold transition-colors ${mode === 'record' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <Send className="w-3 h-3" />
                                    記録
                                </button>
                                <button
                                    onClick={() => setMode('consult')}
                                    className={`flex-1 relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold transition-colors ${mode === 'consult' ? 'text-[#E8B4A0]' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <MessageCircle className="w-3 h-3" />
                                    相談
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 2. Main Bar (Glass) */}
            <div className="bg-[#1E1E23]/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-8 pointer-events-auto shadow-2xl relative">

                {/* Photo Previews */}
                {previewUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
                        {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removePhoto(idx)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-2">
                    {/* A. Expandable Stack Avatar */}
                    <div className="relative z-20 shrink-0">
                        <AnimatePresence>
                            {isCatStackExpanded && (
                                <motion.div
                                    initial={{ width: 40, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: 40, opacity: 0 }}
                                    className="absolute bottom-0 left-0 flex gap-2 p-1 bg-[#2A2A30] rounded-full border border-white/10 shadow-xl"
                                    style={{ transform: 'translateX(-4px) translateY(4px)' }}
                                >
                                    {cats.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                toggleCat(cat.id);
                                            }}
                                            className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${selectedCatIds.has(cat.id) ? 'border-[#E8B4A0] scale-105' : 'border-transparent opacity-50'
                                                }`}
                                        >
                                            <img src={cat.avatar} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setIsCatStackExpanded(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                                    >
                                        <ChevronRight className="w-5 h-5 text-white rotate-180" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            onClick={() => setIsCatStackExpanded(true)}
                            animate={{ opacity: isCatStackExpanded ? 0 : 1, scale: isCatStackExpanded ? 0.8 : 1 }}
                            className="w-10 h-10 rounded-full border border-white/10 overflow-hidden relative shadow-md bg-black"
                        >
                            {Array.from(selectedCatIds).slice(0, 2).map((id, i) => (
                                <img
                                    key={id}
                                    src={getCatAvatar(id)}
                                    className={`absolute top-0 w-full h-full object-cover border-r border-black/50 ${selectedCatIds.size > 1 && i === 0 ? 'left-[-25%] clip-path-half' : ''
                                        } ${selectedCatIds.size > 1 && i === 1 ? 'left-[25%]' : 'left-0'
                                        }`}
                                    style={{
                                        clipPath: selectedCatIds.size > 1 && i === 0 ? 'inset(0 50% 0 0)' : undefined,
                                    }}
                                />
                            ))}
                            {selectedCatIds.size === 0 && (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-white">
                                    All
                                </div>
                            )}
                        </motion.button>
                    </div>

                    {/* B. Tools (Camera & Tag) - Placed Left to break Chat Pattern */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-xl bg-transparent hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#E8B4A0] transition-colors shrink-0"
                    >
                        <Camera className="w-6 h-6" />
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />



                    {/* C. Input Field (Transparent / Sub) */}
                    <div className="flex-1 min-w-0 flex items-center px-2 py-2">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="メモを追加..."
                            className="bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600 w-full resize-none max-h-24 py-1 leading-relaxed"
                            rows={1}
                            style={{ minHeight: '24px' }}
                            onInput={(e) => {
                                (e.target as HTMLTextAreaElement).style.height = 'auto';
                                (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px';
                            }}
                        />
                    </div>

                    {/* D. Tag (Priority 3) */}
                    <button
                        onClick={() => setShowTags(!showTags)}
                        className={`w-10 h-10 rounded-xl bg-transparent hover:bg-white/5 flex items-center justify-center transition-colors shrink-0 ${showTags || selectedCatIds.size > 0 ? 'text-slate-400' : 'text-slate-500'
                            }`}
                    >
                        <Tag className="w-5 h-5" />
                    </button>

                    {/* D. Send Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || (!note && photos.length === 0)}
                        className={`w-10 h-10 rounded-xl p-0 flex items-center justify-center transition-all ${mode === 'consult' ? 'bg-pink-500 hover:bg-pink-600' : 'bg-[#E8B4A0] hover:bg-[#D69D8A]'
                            } text-white shrink-0`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
