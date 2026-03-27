import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Camera, ChevronRight,
    Loader2, Sparkles, Check,
    Plus, Image as ImageIcon,
    ArrowRight
} from "lucide-react";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { uploadCatImage } from "@/lib/storage";
import { createPortal } from 'react-dom';
import { resizeImage } from "@/lib/image-processing";

type Step = 'select' | 'uploading' | 'summary';

interface AnalysisResult {
    file: File;
    previewUrl: string;
    storagePath?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    width?: number;
    height?: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
    onImported?: (count: number) => void;
}

export function PhotoImportWizard({ isOpen, onClose, onComplete, onImported }: Props) {
    const { householdId, isDemo } = useCoreContext();
    const { cats } = useCatContext();
    const { session } = useAuth();

    const [step, setStep] = useState<Step>('select');
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup URLs
    useEffect(() => {
        return () => {
            results.forEach(r => {
                if (r.previewUrl.startsWith('blob:')) URL.revokeObjectURL(r.previewUrl);
            });
        };
    }, [results]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        const newResults: AnalysisResult[] = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'pending'
        }));

        setResults(prev => [...prev, ...newResults]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePhoto = (index: number) => {
        setResults(prev => {
            const item = prev[index];
            if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const startAsyncImport = async () => {
        if (results.length === 0) return;
        setStep('uploading');
        setIsProcessing(true);
        setProgress(0);

        const total = results.length;
        let completed = 0;
        const uploadedAssets: any[] = [];

        for (let i = 0; i < results.length; i++) {
            const current = results[i];
            setResults(prev => prev.map((item, idx) =>
                idx === i ? { ...item, status: 'processing' } : item
            ));

            try {
                // 1. Resize & get dimensions
                const optimizedFile = await resizeImage(current.file, { maxWidth: 1200, maxHeight: 1200 });
                // Note: ideally we read intrinsic width/height here. Fallback to 1200x1200 for now.

                // 2. Upload to Storage
                let storagePath = '';
                if (!isDemo) {
                    const { storagePath: path, error } = await uploadCatImage('incoming', optimizedFile);
                    if (error) throw new Error(error);
                    storagePath = path!;
                } else {
                    storagePath = `demo/import_${Date.now()}_${i}.jpg`;
                    await new Promise(r => setTimeout(r, 600)); // fake delay
                }

                uploadedAssets.push({
                    storage_path: storagePath,
                    taken_at: new Date(current.file.lastModified || Date.now()).toISOString(),
                    source: 'camera_roll',
                });

                setResults(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'done', storagePath } : item
                ));

            } catch (error) {
                console.error("Upload error for photo", i, error);
                setResults(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'error' } : item
                ));
            }

            completed++;
            setProgress(Math.round((completed / total) * 100));
        }

        // 3. Register & Queue AI Job via API
        if (uploadedAssets.length > 0) {
            try {
                // For MVP, just optionally attach primary cat_id if there's only 1 cat
                const defaultCatId = cats.length === 1 ? cats[0].id : undefined;

                if (!isDemo) {
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };
                    if (session?.access_token) {
                        headers.Authorization = `Bearer ${session.access_token}`;
                    }

                    const response = await fetch('/api/photos/import', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            household_id: householdId || '00000000-0000-0000-0000-000000000000',
                            cat_id: defaultCatId,
                            assets: uploadedAssets
                        })
                    });

                    if (!response.ok) {
                        console.error("Failed to queue AI jobs", await response.text());
                    }
                }
            } catch (e) {
                console.error("API call error:", e);
            }
        }

        onImported?.(uploadedAssets.length);
        setIsProcessing(false);
        setStep('summary');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[11000] flex flex-col bg-bg-primary dark:bg-[#121214]">
            {/* Header */}
            <header className="sticky top-0 z-10 h-16 items-center justify-between border-b border-border-subtle bg-bg-primary/80 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/5 dark:bg-[#121214]/80">
                <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-text-tertiary hover:bg-black/5"
                >
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold text-text-primary dark:text-[#E8E6E1]">
                    {step === 'select' && '写真を選ぶ'}
                    {step === 'uploading' && 'バックアップ中'}
                    {step === 'summary' && 'インポート受付完了'}
                </h2>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-5 py-6">
                {step === 'select' && (
                    <div className="max-w-md mx-auto space-y-8">
                        <div className="hidden">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft">
                                <ImageIcon className="h-10 w-10 text-accent-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary dark:text-[#E8E6E1]">思い出をコレクションに</h3>
                            <p className="text-sm leading-relaxed text-text-tertiary">
                                猫の写真を見つけてコレクションを作ります。<br />
                                選択した写真を、裏側でそっと整理します。
                            </p>
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-2xl font-bold text-text-primary dark:text-[#E8E6E1]">写真を追加しました</h3>
                            <p className="text-[15px] font-medium leading-relaxed text-text-tertiary">
                                {results.filter(r => r.status === 'done').length}枚の写真を追加しました。<br />
                                このあとは、写真ごとの発見がそっと整理されていきます。
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {results.map((r, i) => (
                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                                    <img src={r.previewUrl} className="w-full h-full object-cover" alt="" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border dark:border-white/10 text-text-tertiary transition-colors hover:bg-black/5"
                            >
                                <Plus className="w-6 h-6" />
                                <span className="text-[11px] font-bold">追加</span>
                            </button>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>
                )}

                {step === 'uploading' && (
                    <div className="max-w-md mx-auto h-full flex flex-col items-center justify-center space-y-8 py-20">
                        <div className="relative">
                            <div className="h-32 w-32 animate-spin rounded-full border-4 border-bg-secondary border-t-accent-primary dark:border-white/5 dark:border-t-accent-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-accent-primary" />
                            </div>
                        </div>
                        <div className="text-center space-y-4">
                            <h3 className="hidden">
                                {progress === 100 ? 'アップロード完了！' : '写真を安全に保存しています...'}
                            </h3>
                            <h3 className="text-xl font-bold text-text-primary dark:text-[#E8E6E1]">
                                {progress === 100 ? '写真の追加を受け付けました' : '写真を追加しています...'}
                            </h3>
                            <div className="mx-auto h-3 w-64 overflow-hidden rounded-full bg-bg-secondary dark:bg-white/5">
                                <motion.div
                                    className="h-full bg-accent-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="hidden">
                                {results.filter(r => r.status === 'done').length} / {results.length} 枚完了
                            </p>
                            <p className="text-sm font-bold text-text-tertiary">
                                {results.filter(r => r.status === 'done').length} / {results.length} 枚完了
                            </p>
                        </div>
                    </div>
                )}

                {step === 'summary' && (
                    <div className="max-w-md mx-auto h-full flex flex-col items-center justify-center space-y-10 py-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-discover/20"
                        >
                            <Check className="w-12 h-12 text-accent-discover" />
                        </motion.div>

                        <div className="text-center space-y-3">
                            <h3 className="text-2xl font-bold text-text-primary dark:text-[#E8E6E1]">受け付けました！</h3>
                            <p className="text-[15px] font-medium leading-relaxed text-text-tertiary">
                                {results.filter(r => r.status === 'done').length}枚の写真をアップロードしました。<br />
                                このあと裏側で猫を見つけて、コレクションへ自然につなげます。
                            </p>
                        </div>

                        <div className="hidden">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-accent-primary" />
                                <span className="text-[13px] font-bold text-text-primary dark:text-[#E8E6E1]">ホーム画面でお知らせします</span>
                            </div>
                            <p className="text-[12px] text-text-tertiary">
                                新しい発見があれば、ホーム画面の「今日の発見」に届きます。アプリを閉じて待っていても大丈夫です！
                            </p>
                        </div>
                        <div className="w-full space-y-4 rounded-3xl border border-border-subtle bg-bg-elevated p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-accent-primary" />
                                <span className="text-[13px] font-bold text-text-primary dark:text-[#E8E6E1]">ホームで見つけやすくなります</span>
                            </div>
                            <p className="text-[12px] text-text-tertiary">
                                新しい発見があれば、ホーム画面の「最近の発見」に届きます。アプリを閉じていても大丈夫です。
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                onComplete?.();
                                onClose();
                            }}
                            className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-accent-primary font-bold text-white shadow-sm dark:bg-white dark:text-black"
                        >
                            <span>ホームに戻る</span>
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            {step === 'select' && (
                <footer className="border-t border-border-subtle bg-bg-primary p-8 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] dark:border-white/5 dark:bg-[#121214]">
                    <button
                        onClick={startAsyncImport}
                        disabled={results.length === 0}
                        className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-accent-primary font-bold text-white shadow-sm disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        <span>インポートを開始({results.length}枚)</span>
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </footer>
            )}
        </div>,
        document.body
    );
}
