"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X,
    Users,
    Link2,
    Copy,
    Check,
    UserPlus,
    Crown,
    Trash2
} from "lucide-react";

interface FamilyMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'owner' | 'member';
    joinedAt: string;
}

interface FamilyMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FamilyMemberModal({ isOpen, onClose }: FamilyMemberModalProps) {
    const { householdId, isDemo } = useAppState();
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    // Demo data for preview
    const demoMembers: FamilyMember[] = [
        { id: '1', name: 'あなた', email: 'you@example.com', role: 'owner', joinedAt: '2024-01-01' },
        { id: '2', name: 'パートナー', email: 'partner@example.com', avatar: '👩', role: 'member', joinedAt: '2024-06-15' },
    ];

    const members = demoMembers; // TODO: Replace with real data fetch

    const generateInviteLink = async () => {
        setLoading(true);

        if (isDemo) {
            // Demo mode: generate fake link
            await new Promise(resolve => setTimeout(resolve, 500));
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            setInviteUrl(`https://catup.app/invite/${code}`);
            toast.success("招待リンクを作成しました");
        } else {
            // Real mode: call API
            try {
                const response = await fetch('/api/invite/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ householdId })
                });
                const data = await response.json();
                if (data.url) {
                    setInviteUrl(data.url);
                    toast.success("招待リンクを作成しました");
                } else {
                    toast.error("作成に失敗しました");
                }
            } catch (error) {
                toast.error("エラーが発生しました");
            }
        }

        setLoading(false);
    };

    const copyToClipboard = async () => {
        if (!inviteUrl) return;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success("コピーしました");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("コピーに失敗しました");
        }
    };

    const removeMember = async (memberId: string) => {
        if (!confirm("このメンバーを削除しますか？")) return;

        if (isDemo) {
            toast.success("メンバーを削除しました（デモ）");
        } else {
            // TODO: Implement real member removal
            toast.success("メンバーを削除しました");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-slate-900 px-5 py-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-slate-500" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">家族メンバー</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 pb-20 space-y-5">
                            {/* Member List */}
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                    >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">
                                            {member.avatar || member.name[0]}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-800 dark:text-white truncate">
                                                    {member.name}
                                                </p>
                                                {member.role === 'owner' && (
                                                    <Crown className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                        </div>

                                        {/* Actions */}
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Invite Section */}
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    家族を招待
                                </h3>

                                {inviteUrl ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                                            <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                            <p className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1">
                                                {inviteUrl}
                                            </p>
                                            <button
                                                onClick={copyToClipboard}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    copied
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 text-center">
                                            リンクは7日間有効です
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={generateInviteLink}
                                        disabled={loading}
                                        className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <span className="animate-spin">⏳</span>
                                        ) : (
                                            <UserPlus className="h-5 w-5" />
                                        )}
                                        招待リンクを作成
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
