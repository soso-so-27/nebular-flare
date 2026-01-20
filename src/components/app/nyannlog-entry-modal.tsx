"use client";

import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from '@/store/app-store';
import { X, Loader2, Camera, Utensils, Activity, Eye, Calendar, MessageCircle, Send, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useFootprintContext } from "@/providers/footprint-provider";

// =====================================================
// タグ定義（任意）
// =====================================================
const TAGS = [
    { id: 'gohan', label: 'ごはん', icon: Utensils },
    { id: 'toilet', label: 'トイレ', icon: Activity },
    { id: 'karada', label: 'からだ', icon: Activity },
    { id: 'yousu', label: 'ようす', icon: Eye },
    { id: 'dekigoto', label: 'できごと', icon: Calendar },
];

const HEALTH_CATEGORIES = [
    { id: 'vomit', label: '嘔吐', options: ['フードそのまま', '胃液/泡', '毛玉', 'その他'] },
    { id: 'toilet', label: '排泄', options: ['おしっこ正常', 'うんち正常', '軟便/下痢', '硬い'] },
    { id: 'physical', label: '体調', options: ['痒み/赤み', '目やに/涙', '跛行/元気ない', 'その他'] },
];

// =====================================================
// Types
// =====================================================
type NyannlogEntryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    preselectedCatId?: string;
};

// =====================================================
// Component
// =====================================================
export function NyannlogEntryModal({ isOpen, onClose, preselectedCatId }: NyannlogEntryModalProps) {
    const { cats, addIncident, uploadCatImage, settings } = useAppState();
    const { awardForNyannlog } = useFootprintContext();
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(() => {
        if (preselectedCatId) return new Set([preselectedCatId]);
        return cats.length > 0 ? new Set([cats[0].id]) : new Set();
    });
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [note, setNote] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [showTags, setShowTags] = useState(false);
    const [healthCategory, setHealthCategory] = useState<string | null>(null);
    const [healthValue, setHealthValue] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const isIsland = settings.layoutType === 'v2-island';

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Sync selectedCatIds when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (preselectedCatId) {
                setSelectedCatIds(new Set([preselectedCatId]));
            } else if (cats.length > 0 && selectedCatIds.size === 0) {
                setSelectedCatIds(new Set([cats[0].id]));
            }
        }
    }, [preselectedCatId, isOpen, cats]);

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

    const handleClose = () => {
        setNote('');
        setPhotos([]);
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        setSelectedTags(new Set());
        setShowTags(false);
        setHealthCategory(null);
        setHealthValue(null);
        setSelectedCatIds(preselectedCatId ? new Set([preselectedCatId]) : (cats.length > 0 ? new Set([cats[0].id]) : new Set()));
        onClose();
    };

    const handleSubmit = async (startChat: boolean = false) => {
        if (selectedCatIds.size === 0) {
            toast.error("猫を選択してください");
            return;
        }
        if (!note.trim() && photos.length === 0) {
            toast.error("メモか写真を入力してください");
            return;
        }

        setLoading(true);
        try {
            const catIds = Array.from(selectedCatIds);
            const tagsArray = Array.from(selectedTags);
            const tagString = tagsArray.length > 0 ? `[${tagsArray.join(',')}] ` : '';
            const type = startChat ? 'worried' : 'daily';

            for (const catId of catIds) {
                // 1. incidents テーブルに登録
                const { error } = await addIncident(
                    catId,
                    type,
                    tagString + note,
                    photos,
                    healthCategory || undefined,
                    healthValue || undefined
                );
                if (error) throw error;

                // 2. 写真がある場合は cat_images にも登録（ギャラリー連動）
                if (photos.length > 0) {
                    for (const photo of photos) {
                        await uploadCatImage(catId, photo, tagString + note);
                    }
                }

                // 3. 足あとポイント付与
                awardForNyannlog?.(catId);
            }

            toast.success(startChat
                ? "チャットをはじめました"
                : "シェアしました"
            );
            handleClose();
        } catch (e: any) {
            console.error(e);
            toast.error("投稿に失敗しました: " + (e.message || e.toString()));
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[50002] flex items-end justify-center bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`
                            bg-[#1E1E23]/90 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col w-full max-w-md overflow-hidden transition-all duration-300
                            ${isIsland
                                ? 'rounded-t-[32px] max-h-[90vh]'
                                : 'rounded-[32px] mb-24 max-h-[80vh]'}
                        `}
                    >
                        {/* Specular Highlight */}
                        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                        {/* Header */}
                        <div className="px-6 pt-6 pb-2 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">できごとを記録</h2>
                            <div className="text-slate-400 text-xs">
                                猫たちの今のようすを残しましょう
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-5 px-6 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                            {/* Cat Selection */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-[#E8B4A0] text-xs font-bold pl-1">だれのようす？</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar pl-1 flex-wrap">
                                    {cats.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                const next = new Set(selectedCatIds);
                                                if (next.has(cat.id)) {
                                                    if (next.size > 1) next.delete(cat.id);
                                                } else {
                                                    next.add(cat.id);
                                                }
                                                setSelectedCatIds(next);
                                            }}
                                            className={`
                                                px-4 py-2 rounded-full text-sm font-bold transition-all duration-200
                                                ${selectedCatIds.has(cat.id)
                                                    ? 'bg-[#E8B4A0] text-white shadow-[0_0_15px_rgba(232,180,160,0.4)] scale-105'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                                            `}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Photo Selection */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-[#E8B4A0] text-xs font-bold pl-1">写真</Label>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative flex-shrink-0">
                                            <div className="w-20 h-20 rounded-xl overflow-hidden ring-1 ring-white/10">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                onClick={() => removePhoto(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg"
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E8B4A0]/30 flex flex-col items-center justify-center gap-1 hover:border-[#E8B4A0] hover:bg-[#E8B4A0]/5 transition-all flex-shrink-0 bg-white/5"
                                    >
                                        <Camera className="w-5 h-5 text-[#E8B4A0]" />
                                        <span className="text-[9px] font-bold text-[#E8B4A0]">追加</span>
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Note */}
                            <div className="space-y-2">
                                <Label htmlFor="note" className="text-[#E8B4A0] text-xs font-bold pl-1">メモ</Label>
                                <Textarea
                                    id="note"
                                    placeholder="今日のにゃんこのようすは？"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="min-h-[80px] bg-black/20 border-white/10 focus:bg-black/40 focus:ring-[#E8B4A0] rounded-2xl resize-none shadow-inner text-white placeholder:text-slate-600"
                                />
                            </div>

                            {/* Tags (Optional) */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowTags(!showTags)}
                                    className="text-slate-400 text-xs font-medium pl-1 flex items-center gap-1.5 hover:text-slate-300 transition-colors"
                                >
                                    <Tag size={12} />
                                    タグを追加
                                    {selectedTags.size > 0 && (
                                        <span className="bg-[#E8B4A0] text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                            {selectedTags.size}
                                        </span>
                                    )}
                                    {showTags ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>

                                {showTags && (
                                    <div className="flex gap-2 flex-wrap">
                                        {TAGS.map(tag => {
                                            const isActive = selectedTags.has(tag.id);
                                            const IconComponent = tag.icon;
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => toggleTag(tag.id)}
                                                    className={`
                                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                                                        ${isActive
                                                            ? 'bg-[#E8B4A0] text-white'
                                                            : 'bg-white/10 text-slate-400 hover:bg-white/15 hover:text-slate-300'}
                                                    `}
                                                >
                                                    <IconComponent size={12} />
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Health Categories (Subdivided) */}
                            <div className="space-y-3 pt-2">
                                <Label className="text-[#E8B4A0] text-xs font-bold pl-1">お身体の記録（任意）</Label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {HEALTH_CATEGORIES.map(category => (
                                            <button
                                                key={category.id}
                                                onClick={() => {
                                                    if (healthCategory === category.id) {
                                                        setHealthCategory(null);
                                                        setHealthValue(null);
                                                    } else {
                                                        setHealthCategory(category.id);
                                                        setHealthValue(null);
                                                    }
                                                }}
                                                className={`
                                                    px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200
                                                    ${healthCategory === category.id
                                                        ? 'bg-[#E8B4A0]/20 text-[#E8B4A0] ring-1 ring-[#E8B4A0]'
                                                        : 'bg-white/5 text-slate-500 hover:bg-white/10'}
                                                `}
                                            >
                                                {category.label}
                                            </button>
                                        ))}
                                    </div>

                                    {healthCategory && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-2 flex-wrap pl-1"
                                        >
                                            {HEALTH_CATEGORIES.find(c => c.id === healthCategory)?.options.map(option => (
                                                <button
                                                    key={option}
                                                    onClick={() => setHealthValue(option)}
                                                    className={`
                                                        px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200
                                                        ${healthValue === option
                                                            ? 'bg-[#E8B4A0] text-white shadow-lg'
                                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                                                    `}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer - Two Equal Buttons */}
                        <div className="p-6 pt-3 shrink-0 border-t border-white/5">
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    className="flex-1 flex-col h-auto py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10"
                                    disabled={loading || (!note.trim() && photos.length === 0)}
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
                                    {!loading && <Send className="h-4 w-4 mb-1 opacity-70" />}
                                    <span className="font-bold text-sm">記録する</span>
                                    <span className="text-[10px] opacity-50">タイムラインに保存</span>
                                </Button>
                                <Button
                                    onClick={() => handleSubmit(true)}
                                    className="flex-1 flex-col h-auto py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10"
                                    disabled={loading || (!note.trim() && photos.length === 0)}
                                >
                                    <MessageCircle className="h-4 w-4 mb-1 opacity-70" />
                                    <span className="font-bold text-sm">相談する</span>
                                    <span className="text-[10px] opacity-50">みんなに意見を聞く</span>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
