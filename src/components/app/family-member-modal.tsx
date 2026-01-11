"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { FootprintStatsCard } from "./footprint-stats-card";
import { useFootprints } from "@/hooks/use-footprints";

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
    const { householdId, isDemo, householdUsers } = useAppState();
    const { user } = useAuth();
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    // Footprint stats
    const { stats, loading: statsLoading } = useFootprints({
        userId: user?.id,
        householdId: householdId || undefined,
    });

    // Set portal target after mount (client-side only)
    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Demo data for preview
    const demoMembers: FamilyMember[] = [
        { id: '1', name: 'あなた', email: 'you@example.com', role: 'owner', joinedAt: '2024-01-01' },
        { id: '2', name: 'パートナー', email: 'partner@example.com', avatar: '👩', role: 'member', joinedAt: '2024-06-15' },
    ];

    // Demo footprint data
    const demoStats = isDemo ? {
        userTotal: 47,
        householdTotal: 98,
        breakdown: [
            { user_id: '1', display_name: 'あなた', total_points: 47 },
            { user_id: '2', display_name: 'パートナー', total_points: 51 },
        ],
    } : stats;

    // Fetch members from global state (which already uses a direct query workaround)
    useEffect(() => {
        if (isDemo || !householdId) {
            setMembers(demoMembers);
            return;
        }

        // Use householdUsers from global state instead of RPC
        if (householdUsers && householdUsers.length > 0) {
            setMembers(householdUsers.map((u: any) => ({
                id: u.id,
                name: u.display_name || 'メンバー',
                email: '',
                avatar: u.avatar_url,
                role: u.role || 'member',
                joinedAt: u.joined_at || '',
            })));
        }
    }, [householdId, isDemo, householdUsers]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const generateInviteLink = async () => {
        setLoading(true);

        const supabase = createClient();

        if (isDemo) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            setInviteUrl(`https://catup.app/invite/${code}`);
            toast.success("招待リンクを作成しました");
        } else {
            try {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                const { error } = await (supabase
                    .from('household_invites' as any) as any)
                    .insert({
                        household_id: householdId,
                        code: code,
                        created_by: user?.id,
                    });

                if (error) throw error;
                setInviteUrl(`${window.location.origin}/join?code=${code}`);
                toast.success("招待リンクを作成しました");
            } catch (error) {
                console.error(error);
                toast.error("作成に失敗しました");
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
        const isSelf = memberId === user?.id;
        const confirmMsg = isSelf
            ? "本当にこの家から退出しますか？"
            : "このメンバーを削除しますか？";

        if (!confirm(confirmMsg)) return;

        if (isDemo) {
            toast.success("メンバーを削除しました（デモ）");
            setMembers(members.filter(m => m.id !== memberId));
            if (isSelf) {
                setTimeout(() => onClose(), 500);
            }
            return;
        }

        try {
            const supabase = createClient();
            const { error } = await (supabase.rpc as any)('remove_household_member', {
                target_user_id: memberId
            });

            if (error) throw error;

            toast.success(isSelf ? "家族から退会しました" : "メンバーを削除しました");
            setMembers(members.filter(m => m.id !== memberId));

            if (isSelf) {
                onClose();
                window.location.reload();
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "削除に失敗しました");
        }
    };

    // Modal content
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        style={{
                            backgroundColor: 'white',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            width: '100%',
                            maxWidth: '28rem',
                            maxHeight: '85dvh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-900 px-5 py-4 border-b flex items-center justify-between shrink-0">
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
                        <div className="p-5 overflow-y-auto flex-1 pb-10">
                            {/* Footprint Stats Card */}
                            <div className="mb-5">
                                <FootprintStatsCard
                                    userTotal={demoStats.userTotal}
                                    householdTotal={demoStats.householdTotal}
                                    breakdown={demoStats.breakdown}
                                    currentUserId={user?.id || '1'}
                                    loading={!isDemo && statsLoading}
                                />
                            </div>

                            {/* Member List */}
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">
                                            {member.avatar || member.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-800 dark:text-white truncate">
                                                    {member.name}
                                                </p>
                                                {member.role === 'owner' && (
                                                    <Crown className="h-4 w-4 text-[#E8B4A0]" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                        </div>
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Invite Section */}
                            <div className="pt-4 border-t mt-4">
                                <h3 className="text-sm font-medium text-slate-700 mb-3">
                                    家族を招待
                                </h3>

                                {inviteUrl ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100">
                                            <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                            <p className="text-sm text-slate-600 truncate flex-1">
                                                {inviteUrl}
                                            </p>
                                            <button
                                                onClick={copyToClipboard}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    copied
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-white text-slate-500 hover:text-slate-700"
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
                                        className="w-full py-3 rounded-xl bg-[#7CAA8E] text-white font-bold hover:bg-[#6B9B7A] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

    // Render via portal to document.body
    if (!portalTarget) return null;
    return createPortal(modalContent, portalTarget);
}
