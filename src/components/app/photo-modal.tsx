import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CatAvatar } from "@/components/ui/cat-avatar";

type PhotoModalProps = {
    isOpen: boolean;
    onClose: () => void;
    preselectedCatId?: string;
};

export function PhotoModal({ isOpen, onClose, preselectedCatId }: PhotoModalProps) {
    const { cats, uploadCatImage } = useAppState();
    const [loading, setLoading] = useState(false);
    const [selectedCatId, setSelectedCatId] = useState<string>(() => {
        if (preselectedCatId) return preselectedCatId;
        return cats.length > 0 ? cats[0].id : '';
    });
    const [memo, setMemo] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update selectedCatId when preselectedCatId changes or modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (preselectedCatId) {
                setSelectedCatId(preselectedCatId);
            } else if (cats.length > 0 && !selectedCatId) {
                setSelectedCatId(cats[0].id);
            }
        }
    }, [preselectedCatId, isOpen, cats]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const removePhoto = () => {
        setPhoto(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!selectedCatId) {
            toast.error("猫を選択してください");
            return;
        }

        if (!photo) {
            toast.error("写真を選択してください");
            return;
        }

        setLoading(true);
        try {
            const { error } = await uploadCatImage(selectedCatId, photo, memo);
            if (error) throw error;

            toast.success("写真を保存しました");
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
        setPhoto(null);
        setPreviewUrl(null);
        setSelectedCatId(preselectedCatId || (cats.length > 0 ? cats[0].id : ''));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px] w-[95vw] max-h-[90vh] overflow-y-auto bg-[#FAF9F7]/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-slate-800">今日の一枚</DialogTitle>
                    <div className="text-slate-500 text-xs">
                        可愛い瞬間を残しましょう
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-6 px-6 py-4">
                    {/* Cat Selection - Horizontal Scroll */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-600 text-xs font-bold pl-1">モデルは誰？</Label>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar pl-1">
                            {cats.map((cat, index) => {
                                // Colored rings matching concept: pink, blue, green, purple
                                const ringColors = ['#F8BBD9', '#90CAF9', '#A5D6A7', '#CE93D8'];
                                const ringColor = ringColors[index % ringColors.length];
                                const isSelected = selectedCatId === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCatId(cat.id)}
                                        className={`flex flex-col items-center gap-2 transition-all duration-300 relative group flex-shrink-0 focus:outline-none ${isSelected ? 'scale-110 opacity-100' : 'scale-95 opacity-50 hover:opacity-100 hover:scale-100'}`}
                                    >
                                        <div
                                            className="relative rounded-full transition-all shadow-sm"
                                            style={{
                                                boxShadow: isSelected ? `0 0 0 3px ${ringColor}, 0 0 0 5px white` : 'none',
                                                filter: isSelected ? 'none' : 'grayscale(0.5)',
                                            }}
                                        >
                                            <CatAvatar src={cat.avatar} alt={cat.name} size="lg" />
                                        </div>
                                        <span
                                            className="text-[10px] font-bold tracking-wide transition-colors"
                                            style={{ color: isSelected ? ringColor : '#94a3b8' }}
                                        >
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photo - Card Style */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-600 text-xs font-bold pl-1">写真</Label>
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-white/40 bg-white/40 group transition-all hover:bg-white/60">
                            {previewUrl ? (
                                <>
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    <button
                                        onClick={removePhoto}
                                        className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all shadow-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-full flex flex-col items-center justify-center text-[#E8B4A0] hover:scale-[1.02] transition-transform active:scale-95"
                                >
                                    <div className="w-16 h-16 rounded-full bg-[#E8B4A0]/10 flex items-center justify-center mb-3">
                                        <Camera size={32} />
                                    </div>
                                    <span className="text-sm font-bold opacity-80">ここをタップして撮影</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Memo */}
                    <div className="space-y-2">
                        <Label htmlFor="memo" className="text-slate-600 text-xs font-bold pl-1">メモ</Label>
                        <Textarea
                            id="memo"
                            placeholder="ひとことメモ..."
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="min-h-[80px] bg-white/40 border-white/40 focus:bg-white/60 focus:ring-[#E8B4A0] rounded-2xl resize-none shadow-inner"
                        />
                    </div>
                </div>

                <div className="p-6 pt-2 bg-gradient-to-t from-[#FAF9F7] to-transparent">
                    <div className="flex gap-3">
                        <Button
                            onClick={handleClose}
                            variant="ghost"
                            className="flex-1 rounded-full hover:bg-slate-100 text-slate-500"
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-[2] rounded-full bg-gradient-to-r from-[#E8B4A0] to-[#C08A70] hover:from-[#D69E8A] hover:to-[#B07A60] text-white shadow-lg shadow-[#E8B4A0]/30 border-none"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存する
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
