import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { Loader2, Camera, X, Sparkles, Wind, Bandage, Utensils, BatteryLow, Trash2, FileText, Cat } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CatAvatar } from "@/components/ui/cat-avatar";
import { useFootprintContext } from "@/providers/footprint-provider";

type IncidentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    defaultCatId?: string | null;
};

const INCIDENT_TYPES = [
    { id: 'vomit', label: '嘔吐', icon: Sparkles },
    { id: 'diarrhea', label: '下痢', icon: Wind },
    { id: 'injury', label: '怪我', icon: Bandage },
    { id: 'appetite', label: '食欲不振', icon: Utensils },
    { id: 'energy', label: '元気がない', icon: BatteryLow },
    { id: 'toilet', label: 'トイレ失敗', icon: Trash2 },
    { id: 'other', label: 'その他', icon: FileText },
];

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export function IncidentModal({ isOpen, onClose, defaultCatId }: IncidentModalProps) {
    const { cats, addIncident, settings } = useAppState();
    const { awardForIncident } = useFootprintContext();
    const [loading, setLoading] = useState(false);
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(() => {
        if (defaultCatId) return new Set([defaultCatId]);
        return cats.length > 0 ? new Set([cats[0].id]) : new Set();
    });
    const [type, setType] = useState('vomit');
    const [note, setNote] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const isIsland = settings.layoutType === 'v2-island';

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Sync selectedCatIds with cats when modal opens or cats load
    React.useEffect(() => {
        if (isOpen) {
            if (defaultCatId) {
                setSelectedCatIds(new Set([defaultCatId]));
            } else if (cats.length > 0 && selectedCatIds.size === 0) {
                setSelectedCatIds(new Set([cats[0].id]));
            }
        }
    }, [defaultCatId, isOpen, cats]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...files]);

            // Create previews
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedCatIds.size === 0) {
            toast.error("猫を選択してください");
            return;
        }
        if (!note && type === 'other') {
            toast.error("その他の場合は詳細を入力してください");
            return;
        }

        setLoading(true);
        try {
            // Submit for each selected cat
            const catIds = Array.from(selectedCatIds);
            for (const id of catIds) {
                const { error } = await addIncident(id, type, note, photos);
                if (error) throw error;
                // Award footprint for incident (2pts)
                awardForIncident(id);
            }

            toast.success(`${selectedCatIds.size}件の相談を記録しました`);
            onClose();
            // Reset form
            setNote('');
            setPhotos([]);
            setPreviewUrls([]);
            setType('vomit');
            setSelectedCatIds(new Set(cats.length > 0 ? [cats[0].id] : []));
        } catch (e) {
            console.error(e);
            toast.error("記録に失敗しました");
        } finally {
            setLoading(false);
        }
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
                    onClick={onClose}
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
                            <h2 className="text-xl font-bold text-white">家族に相談</h2>
                            <div className="text-slate-400 text-xs">
                                気になる体調や様子を記録します
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 px-6 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                            {/* Cat Selection - Horizontal Scroll with Bounce */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-brand-peach text-xs font-bold pl-1">だれのようす？</Label>
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
                                                    ? 'bg-brand-peach text-white shadow-[0_0_15px_rgba(var(--brand-peach-rgb),0.4)] scale-105'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                                            `}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Incident Type - Compact Icon Grid */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-brand-peach text-xs font-bold pl-1">どうしたの？</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {INCIDENT_TYPES.map(t => {
                                        const isActive = type === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setType(t.id)}
                                                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all duration-200 ${isActive
                                                    ? 'bg-brand-peach/20 border-brand-peach shadow-[0_0_12px_rgba(var(--brand-peach-rgb),0.2)]'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400'
                                                    }`}
                                            >
                                                <div className={`p-1.5 rounded-full mb-1 ${isActive ? 'bg-brand-peach text-white' : 'bg-transparent'}`}>
                                                    <t.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                </div>
                                                <span className={`text-[9px] font-bold leading-tight ${isActive ? 'text-brand-peach' : 'text-slate-500'}`}>
                                                    {t.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Note & Photos */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="note" className="text-brand-peach text-xs font-bold pl-1">詳細メモ</Label>
                                    <Textarea
                                        id="note"
                                        placeholder="詳しい状況を入力..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="min-h-[80px] bg-black/20 border-white/10 focus:bg-black/40 focus:ring-brand-peach rounded-2xl resize-none shadow-inner text-white placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-brand-peach text-xs font-bold pl-1">写真</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {previewUrls.map((url, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 shadow-sm group">
                                                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-brand-peach/40 rounded-xl hover:bg-brand-peach/10 text-brand-peach transition-colors bg-white/5"
                                        >
                                            <Camera size={20} />
                                            <span className="text-[9px] mt-0.5 font-bold">追加</span>
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-2 shrink-0 border-t border-white/5">
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-[2] rounded-full bg-brand-peach hover:bg-brand-peach/90 text-white shadow-[0_0_20px_rgba(var(--brand-peach-rgb),0.3)] border-none"
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    記録する
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

