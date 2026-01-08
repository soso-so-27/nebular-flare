"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { Loader2, Camera, X, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type IncidentDetailModalProps = {
    isOpen: boolean;
    onClose: () => void;
    incidentId: string;
};

const STATUS_OPTIONS = [
    { id: 'watching', label: '様子見', color: 'bg-orange-500' },
    { id: 'hospital', label: '通院中', color: 'bg-red-500' },
    { id: 'resolved', label: '解決済み', color: 'bg-green-500' },
];

const TYPE_LABELS = {
    'vomit': '嘔吐',
    'diarrhea': '下痢',
    'injury': '怪我',
    'appetite': '食欲不振',
    'energy': '元気がない',
    'toilet': 'トイレ失敗',
    'other': 'その他'
};

export function IncidentDetailModal({ isOpen, onClose, incidentId }: IncidentDetailModalProps) {
    const { incidents, cats, addIncidentUpdate, resolveIncident } = useAppState();
    const [loading, setLoading] = useState(false);
    const [updateNote, setUpdateNote] = useState('');
    const [statusChange, setStatusChange] = useState('no_change');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [showUpdateForm, setShowUpdateForm] = useState(false);

    console.log("IncidentDetailModal Rendered. incidentId:", incidentId);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const incident = incidents.find(inc => inc.id === incidentId);

    if (!incident) return null;

    const cat = cats.find(c => c.id === incident.cat_id);
    const typeLabel = TYPE_LABELS[incident.type as keyof typeof TYPE_LABELS] || incident.type;
    const statusOption = STATUS_OPTIONS.find(s => s.id === incident.status);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddUpdate = async () => {
        if (!updateNote && photos.length === 0 && (statusChange === 'no_change' || !statusChange)) {
            toast.error("更新内容を入力してください");
            return;
        }

        setLoading(true);
        try {
            const { error } = await addIncidentUpdate(
                incidentId,
                updateNote,
                photos,
                (statusChange && statusChange !== 'no_change') ? statusChange : undefined
            );
            if (error) throw error;

            toast.success("更新を記録しました");
            setUpdateNote('');
            setStatusChange('no_change');
            setPhotos([]);
            setPreviewUrls([]);
            setShowUpdateForm(false);
        } catch (e) {
            console.error(e);
            toast.error("更新に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setLoading(true);
        try {
            const { error } = await resolveIncident(incidentId);
            if (error) throw error;

            toast.success("解決済みにしました");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("更新に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={cat?.avatar} />
                            <AvatarFallback>{cat?.name?.[0] || '🐈'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-xl">{typeLabel}</DialogTitle>
                            <DialogDescription>
                                {cat?.name} の記録 · {new Date(incident.created_at).toLocaleDateString('ja-JP')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-3 py-1 rounded-full text-white text-sm font-bold",
                            statusOption?.color
                        )}>
                            {statusOption?.label}
                        </span>
                        {incident.status !== 'resolved' && (
                            <Button
                                onClick={handleResolve}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                            >
                                解決済みにする
                            </Button>
                        )}
                    </div>

                    {/* Initial Note */}
                    {incident.note && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
                                初期メモ
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{incident.note}</p>
                        </div>
                    )}

                    {/* Updates Timeline */}
                    {incident.updates && incident.updates.length > 0 && (
                        <div className="space-y-3">
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                更新履歴
                            </div>
                            <div className="space-y-2">
                                {incident.updates.map((update: any) => (
                                    <div
                                        key={update.id}
                                        className="bg-white dark:bg-slate-800 border rounded-lg p-3 space-y-2"
                                    >
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3 h-3" />
                                            {new Date(update.created_at).toLocaleString('ja-JP')}
                                        </div>
                                        {update.status_change && (
                                            <div className="text-sm">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    ステータス変更:
                                                </span>
                                                <span className={cn(
                                                    "ml-2 px-2 py-0.5 rounded-full text-xs text-white font-bold",
                                                    STATUS_OPTIONS.find(s => s.id === update.status_change)?.color
                                                )}>
                                                    {STATUS_OPTIONS.find(s => s.id === update.status_change)?.label}
                                                </span>
                                            </div>
                                        )}
                                        {update.note && (
                                            <p className="text-sm whitespace-pre-wrap">{update.note}</p>
                                        )}
                                        {update.photos && update.photos.length > 0 && (
                                            <div className="text-xs text-slate-500">
                                                📷 {update.photos.length}枚の写真
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Update Form */}
                    {!showUpdateForm ? (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowUpdateForm(true);
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            + 更新を追加
                        </Button>
                    ) : (
                        <div className="border-t pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm">新しい更新</h3>
                                <Button
                                    onClick={() => setShowUpdateForm(false)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    キャンセル
                                </Button>
                            </div>

                            {/* Status Change */}
                            <div className="grid gap-2">
                                <Label>ステータス変更（任意）</Label>
                                <Select value={statusChange} onValueChange={setStatusChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="変更しない" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no_change">変更しない</SelectItem>
                                        {STATUS_OPTIONS.filter(s => s.id !== incident.status).map(opt => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Note */}
                            <div className="grid gap-2">
                                <Label htmlFor="update-note">メモ</Label>
                                <Textarea
                                    id="update-note"
                                    placeholder="経過や変化を記録..."
                                    value={updateNote}
                                    onChange={(e) => setUpdateNote(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>

                            {/* Photos - DISABLED FOR DEBUGGING */}
                            {/* <div className="grid gap-2">
                                <Label>写真（任意）</Label>
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
                            </div> */}

                            <Button onClick={handleAddUpdate} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                更新を記録
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
