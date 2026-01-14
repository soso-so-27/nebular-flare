import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from '@/store/app-store';
import { X, Loader2, Image as ImageIcon, MessageCircle, Camera } from "lucide-react";
import { toast } from "sonner";
import { CatAvatar } from "@/components/ui/cat-avatar";
import { useFootprintContext } from "@/providers/footprint-provider";

type PhotoModalProps = {
    isOpen: boolean;
    onClose: () => void;
    preselectedCatId?: string;
};

export function PhotoModal({ isOpen, onClose, preselectedCatId }: PhotoModalProps) {
    const { cats, uploadCatImage, settings } = useAppState();
    const { awardForPhoto } = useFootprintContext();
    const [loading, setLoading] = useState(false);
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(() => {
        if (preselectedCatId) return new Set([preselectedCatId]);
        return cats.length > 0 ? new Set([cats[0].id]) : new Set();
    });
    const [memo, setMemo] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const isIsland = settings.layoutType === 'v2-island';

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Update selectedCatId when preselectedCatId changes or modal opens
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

    const handleSave = async () => {
        if (photos.length === 0) {
            toast.error("写真を選択してください");
            return;
        }

        setLoading(true);
        try {
            const catIds = Array.from(selectedCatIds).join(',');

            // Upload photos one by one or batch if supported
            for (const photo of photos) {
                const { error } = await uploadCatImage(catIds, photo, memo);
                if (error) throw error;
            }

            // Award footprint for photo (2pts) for each cat (scaling based on photo count?)
            // For now, simple 1 award per batch per cat
            selectedCatIds.forEach(id => awardForPhoto(id));
            toast.success(`${photos.length}件の写真を保存しました`);
            handleClose();
        } catch (e: any) {
            console.error(e);
            toast.error("保存に失敗しました: " + (e.message || e.toString()));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setMemo('');
        setPhotos([]);
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        setSelectedCatIds(preselectedCatId ? new Set([preselectedCatId]) : (cats.length > 0 ? new Set([cats[0].id]) : new Set()));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 backdrop-blur-sm"
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
                                : 'rounded-[32px] mb-24 max-h-[75vh]'}
                        `}
                    >
                        {/* Specular Highlight */}
                        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                        <div className="px-6 pt-6 pb-2 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">とどける</h2>
                            <div className="text-slate-400 text-xs">
                                今のようすを家族へとどけましょう
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 px-6 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                            {/* Cat Selection - Horizontal Scroll */}
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

                            {/* Photo Selection Area */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-[#E8B4A0] text-xs font-bold pl-1">写真</Label>

                                <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar min-h-[140px]">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 animate-in zoom-in-50 duration-300">
                                            <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-md ring-1 ring-white/10">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newPhotos = [...photos];
                                                    const newUrls = [...previewUrls];
                                                    newPhotos.splice(idx, 1);
                                                    URL.revokeObjectURL(newUrls[idx]);
                                                    newUrls.splice(idx, 1);
                                                    setPhotos(newPhotos);
                                                    setPreviewUrls(newUrls);
                                                }}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 active:scale-95 transition-transform"
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-[#E8B4A0]/30 flex flex-col items-center justify-center gap-2 hover:border-[#E8B4A0] hover:bg-[#E8B4A0]/5 transition-all group flex-shrink-0 bg-white/5"
                                    >
                                        <div className="p-2 rounded-full bg-[#E8B4A0]/10 group-hover:bg-[#E8B4A0]/20 transition-colors">
                                            <Camera className="w-6 h-6 text-[#E8B4A0]" />
                                        </div>
                                        <span className="text-[10px] font-bold text-[#E8B4A0]">追加</span>
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

                            {/* Memo */}
                            <div className="space-y-2">
                                <Label htmlFor="memo" className="text-[#E8B4A0] text-xs font-bold pl-1">メモ</Label>
                                <Textarea
                                    id="memo"
                                    placeholder="ひとことメモ..."
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    className="min-h-[80px] bg-black/20 border-white/10 focus:bg-black/40 focus:ring-[#E8B4A0] rounded-2xl resize-none shadow-inner text-white placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="p-6 pt-2 shrink-0 border-t border-white/5">
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleClose}
                                    variant="ghost"
                                    className="flex-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                                    disabled={loading}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="flex-[2] rounded-full bg-[#E8B4A0] hover:bg-[#D69E8A] text-white shadow-[0_0_20px_rgba(232,180,160,0.2)] border-none"
                                    disabled={loading || photos.length === 0}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    保存する
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

