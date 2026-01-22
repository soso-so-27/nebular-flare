"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from '@/store/app-store';
import { Camera, Send, X, Loader2, MessageCircle, Tag, Utensils, Activity, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useFootprintContext } from "@/providers/footprint-provider";
import { getFullImageUrl } from '@/lib/utils';

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
};

export function EmbeddedInputCard({ onSubmitSuccess }: Props) {
    const { cats, addIncident, uploadCatImage } = useAppState();
    const { awardForNyannlog } = useFootprintContext();

    const [note, setNote] = useState('');
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const [isConsult, setIsConsult] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (cats.length > 0 && selectedCatIds.size === 0) {
            setSelectedCatIds(new Set([cats[0].id]));
        }
    }, [cats]);

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
        const tagText = `[${label}]`;
        setNote(prev => (prev ? prev + ' ' : '') + tagText + ' ');
        setShowTags(false);
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
            const type = isConsult ? 'worried' : 'daily';

            for (const catId of catIds) {
                const { error } = await addIncident(catId, type, note, photos);
                if (error) throw error;

                if (photos.length > 0) {
                    for (const photo of photos) {
                        await uploadCatImage(catId, photo, note);
                    }
                }

                awardForNyannlog?.(catId);
            }

            toast.success(isConsult ? "相談を投稿しました" : "記録しました");

            setNote('');
            setPhotos([]);
            setPreviewUrls([]);
            setShowTags(false);
            setIsConsult(false);
            onSubmitSuccess?.();
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#222226] rounded-2xl border border-white/10 shadow-lg overflow-hidden"
        >
            <div className="p-4 space-y-3">
                {/* Cat Avatars + Text Input */}
                <div className="flex gap-3">
                    {/* Cat Selector */}
                    <div className="flex flex-col gap-1 shrink-0">
                        {cats.slice(0, 3).map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => toggleCat(cat.id)}
                                className={`w-9 h-9 rounded-full overflow-hidden transition-all ${selectedCatIds.has(cat.id)
                                    ? 'ring-2 ring-brand-peach ring-offset-2 ring-offset-[#222226]'
                                    : 'opacity-40 hover:opacity-70'
                                    }`}
                            >
                                {cat.avatar ? (
                                    <img src={getFullImageUrl(cat.avatar)} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs text-white/50 font-bold">
                                        {cat.name?.charAt(0)}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Text Area */}
                    <div className="flex-1 min-w-0">
                        <textarea
                            ref={textareaRef}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={`${selectedCats[0]?.name || 'ねこ'}の様子を記録...`}
                            className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-brand-peach/30 min-h-[80px]"
                            rows={3}
                        />
                    </div>
                </div>

                {/* Photo Previews */}
                {previewUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                        {previewUrls.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                <img src={url} className="w-full h-full object-cover" alt="" />
                                <button
                                    onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tags */}
                <AnimatePresence>
                    {showTags && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex gap-1.5 flex-wrap"
                        >
                            {TAGS.map(tag => {
                                const Icon = tag.icon;
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => insertTag(tag.label)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-[11px] font-medium transition-colors border border-white/5"
                                    >
                                        <Icon className="w-3 h-3" />
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2">
                    {/* Left Actions */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowTags(prev => !prev)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showTags ? 'bg-brand-peach/20 text-brand-peach' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                            }`}
                    >
                        <Tag className="w-4 h-4" />
                    </button>

                    {/* Consult Toggle */}
                    <button
                        onClick={() => setIsConsult(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${isConsult
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/5 text-white/40 hover:text-white/60'
                            }`}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        相談
                    </button>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!hasContent || loading}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${hasContent
                            ? isConsult
                                ? 'bg-amber-500 text-white hover:bg-amber-500/80'
                                : 'bg-brand-peach text-white hover:bg-brand-peach/80'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {isConsult ? '相談' : '記録'}
                            </>
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
        </motion.div>
    );
}
