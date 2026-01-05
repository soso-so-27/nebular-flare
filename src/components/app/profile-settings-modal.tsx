"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Save, User, Camera } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
    const { user, updateProfile } = useAuth();
    const { uploadUserImage } = useAppState();
    const [displayName, setDisplayName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            const toastId = toast.loading("画像をアップロード中...");
            const { publicUrl, error } = await uploadUserImage(user.id, file);

            if (error) {
                toast.error("アップロード失敗: " + error, { id: toastId });
                return;
            }

            if (publicUrl) {
                setAvatarUrl(publicUrl);
                toast.success("完了しました", { id: toastId });
            }
        } catch (e) {
            toast.error("エラーが発生しました");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.user_metadata?.display_name || "");
            setAvatarUrl(user.user_metadata?.avatar_url);
        }
    }, [isOpen, user]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await updateProfile(displayName, avatarUrl);
            if (error) throw error;

            toast.success("プロフィールを更新しました");
            onClose();
        } catch (e: unknown) {
            console.error(e);
            toast.error("更新に失敗しました: " + (e instanceof Error ? e.message : "Undefined Error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10002] flex items-end justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={onClose}
                    />
                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                プロフィール編集
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                                        {avatarUrl ? (
                                            <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="h-10 w-10 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-xs text-slate-400">
                                    タップして写真を変更
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="displayName" className="text-xs font-bold text-slate-700">表示名</Label>
                                <Input
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="ニックネームを入力"
                                    className="bg-slate-50 border-slate-200 h-12"
                                    required
                                />
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1 h-12 rounded-xl text-slate-500 font-bold"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={() => handleSubmit()}
                                disabled={isSubmitting}
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-orange-200"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                保存する
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
