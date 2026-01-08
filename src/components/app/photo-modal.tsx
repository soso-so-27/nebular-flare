"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
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
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>今日の一枚</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Cat Selection */}
                    <div className="grid gap-2">
                        <Label>対象猫</Label>
                        <Select value={selectedCatId} onValueChange={setSelectedCatId}>
                            <SelectTrigger>
                                <SelectValue placeholder="猫を選択..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cats.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={cat.avatar} />
                                                <AvatarFallback>{cat.name[0]}</AvatarFallback>
                                            </Avatar>
                                            {cat.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Memo */}
                    <div className="grid gap-2">
                        <Label htmlFor="memo">メモ入力...</Label>
                        <Textarea
                            id="memo"
                            placeholder="メモを入力..."
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>

                    {/* Photo */}
                    <div className="grid gap-2">
                        <Label>写真（必須）</Label>
                        {previewUrl ? (
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={removePhoto}
                                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <Camera size={40} className="mb-2" />
                                <span className="text-sm font-medium">写真を撮る</span>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleClose}
                            variant="outline"
                            className="flex-1"
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
