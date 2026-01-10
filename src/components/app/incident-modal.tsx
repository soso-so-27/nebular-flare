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

export function IncidentModal({ isOpen, onClose, defaultCatId }: IncidentModalProps) {
    const { cats, addIncident } = useAppState();
    const [loading, setLoading] = useState(false);
    const [catId, setCatId] = useState(defaultCatId || (cats.length > 0 ? cats[0].id : ''));
    const [type, setType] = useState('vomit');
    const [note, setNote] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!catId) {
            toast.error("猫を選択してください");
            return;
        }
        if (!note && type === 'other') {
            toast.error("その他の場合は詳細を入力してください");
            return;
        }

        setLoading(true);
        try {
            const { error } = await addIncident(catId, type, note, photos);
            if (error) throw error;

            toast.success("気付きを記録しました");
            onClose();
            // Reset form
            setNote('');
            setPhotos([]);
            setPreviewUrls([]);
            setType('vomit');
        } catch (e) {
            console.error(e);
            toast.error("記録に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const selectedCat = cats.find(c => c.id === catId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto bg-[#FAF9F7]/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-slate-800">気付きを記録</DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                        気になる体調や様子を記録します
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 px-6 py-4">
                    {/* Cat Selection - Horizontal Scroll with Bounce */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-600 text-xs font-bold pl-1">誰の記録？</Label>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar pl-1">
                            {cats.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCatId(cat.id)}
                                    className={`flex flex-col items-center gap-2 transition-all relative group flex-shrink-0 ${catId === cat.id ? 'scale-105' : 'scale-100 opacity-60 hover:opacity-100'}`}
                                >
                                    <div className={`relative p-1 rounded-full transition-all ${catId === cat.id ? 'ring-2 ring-[#E8B4A0] ring-offset-2 ring-offset-[#FAF9F7]' : ''}`}>
                                        <CatAvatar src={cat.avatar} alt={cat.name} size="lg" />
                                        {catId === cat.id && (
                                            <div className="absolute -bottom-1 -right-1 bg-[#E8B4A0] text-white rounded-full p-0.5 shadow-sm">
                                                <Sparkles size={10} fill="currentColor" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold ${catId === cat.id ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Incident Type - Icon Grid */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-600 text-xs font-bold pl-1">どうしたの？</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {INCIDENT_TYPES.map(t => {
                                const isActive = type === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setType(t.id)}
                                        className={`flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-200 ${isActive
                                            ? 'bg-gradient-to-br from-[#E8B4A0]/20 to-[#E8B4A0]/10 border-[#E8B4A0] shadow-sm scale-95'
                                            : 'bg-white/40 border-white/40 hover:bg-white/60 text-slate-500'
                                            }`}
                                    >
                                        <div className={`p-2.5 rounded-full mb-1.5 ${isActive ? 'bg-[#E8B4A0] text-white shadow-sm' : 'bg-transparent'}`}>
                                            <t.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-[#D09B85]' : 'text-slate-500'}`}>
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
                            <Label htmlFor="note" className="text-slate-600 text-xs font-bold pl-1">詳細メモ</Label>
                            <Textarea
                                id="note"
                                placeholder="詳しい状況を入力..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="min-h-[80px] bg-white/40 border-white/40 focus:bg-white/60 focus:ring-[#E8B4A0] rounded-2xl resize-none shadow-inner"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 text-xs font-bold pl-1">写真</Label>
                            <div className="flex flex-wrap gap-2">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/40 shadow-sm group">
                                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removePhoto(i)}
                                            className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-[#E8B4A0]/40 rounded-xl hover:bg-[#E8B4A0]/10 text-[#E8B4A0] transition-colors bg-white/20"
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

                <div className="p-6 pt-2 bg-gradient-to-t from-[#FAF9F7] to-transparent">
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 rounded-full hover:bg-slate-100 text-slate-500"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-[2] rounded-full bg-gradient-to-r from-[#E8B4A0] to-[#C08A70] hover:from-[#D69E8A] hover:to-[#B07A60] text-white shadow-lg shadow-[#E8B4A0]/30 border-none"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            記録する
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
