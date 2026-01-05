"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Loader2, Save, User, Camera } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import Image from "next/image";
import { cn } from "@/lib/utils";

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            // Show loading state or optimized feeling?
            // Just upload immediately
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

    // Derived from householdUsers for latest data if possible, or fallback to user metadata
    // Ideally we rely on `user` object from auth, but `householdUsers` might have the synced public URL.

    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.user_metadata?.display_name || "");
            setAvatarUrl(user.user_metadata?.avatar_url);
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

    // Predefined avatar choices (Cat themed?) or generic colors
    // For now, let's just allow text input for URL or simple color selection if we want to get fancy later.
    // Or maybe just a random avatar generator button?
    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        setAvatarUrl(`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e5e7eb`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="z-[10002] sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-white/20 shadow-2xl">
                <DialogHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                        プロフィール編集
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 -mr-2"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

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
                            {/* Hidden file input */}
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

                <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl text-slate-500 font-bold"
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSubmit}
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}
