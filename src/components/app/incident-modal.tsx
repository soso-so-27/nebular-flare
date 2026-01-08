"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type IncidentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    defaultCatId?: string | null;
};

const INCIDENT_TYPES = [
    { id: 'vomit', label: '嘔吐', icon: '🤮' },
    { id: 'diarrhea', label: '下痢', icon: '💩' },
    { id: 'injury', label: '怪我', icon: '🤕' },
    { id: 'appetite', label: '食欲不振', icon: '🍽️' },
    { id: 'energy', label: '元気がない', icon: '💤' },
    { id: 'toilet', label: 'トイレ失敗', icon: '🚽' },
    { id: 'other', label: 'その他', icon: '📝' },
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>気になるところを記録</DialogTitle>
                    <DialogDescription>
                        猫の体調不良や気になる行動を記録して、家族と共有しましょう。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Cat Selection */}
                    <div className="grid gap-2">
                        <Label>対象の猫</Label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {cats.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCatId(cat.id)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all min-w-[60px] ${catId === cat.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-transparent hover:bg-muted'
                                        }`}
                                >
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={cat.avatar} />
                                        <AvatarFallback>{cat.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium truncate w-full text-center">
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Incident Type */}
                    <div className="grid gap-2">
                        <Label>種類</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {INCIDENT_TYPES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-md border text-sm transition-all ${type === t.id
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border hover:bg-muted text-muted-foreground'
                                        }`}
                                >
                                    <span className="text-xl mb-1">{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="grid gap-2">
                        <Label htmlFor="note">詳細メモ</Label>
                        <Textarea
                            id="note"
                            placeholder="状況や様子を詳しく..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    {/* Photos */}
                    <div className="grid gap-2">
                        <Label>写真 (任意)</Label>
                        <div className="flex flex-wrap gap-2">
                            {previewUrls.map((url, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border">
                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-md hover:bg-black/70"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 flex flex-col items-center justify-center border border-dashed rounded-md hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <Camera size={20} />
                                <span className="text-[10px] mt-1">追加</span>
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

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        記録する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
