"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    X, Settings, User, Cat, Heart, ShoppingBag, Users,
    ChevronRight, LogOut, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSettingsContext, useCoreContext } from "@/store/app-store";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CatSettingsModal } from "../modals/cat-settings-modal";
import { CareSettingsModal } from "../modals/care-settings-modal";
import { InventorySettingsModal } from "../modals/inventory-settings-modal";
import { FamilyMemberModal } from "../modals/family-member-modal";

interface SettingsScreenProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsScreen({ isOpen, onClose }: SettingsScreenProps) {
    const { user, signOut } = useAuth();
    const { settings, setSettings, aiEnabled, setAiEnabled } = useSettingsContext();
    const { isDemo } = useCoreContext();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isCareModalOpen, setIsCareModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

    const handleLogout = async () => {
        if (isDemo) {
            toast.info("デモモードではログアウトできません");
            return;
        }
        setIsLoggingOut(true);
        try {
            await signOut();
            toast.success("ログアウトしました");
            window.location.href = "/";
        } catch {
            toast.error("ログアウトに失敗しました");
        } finally {
            setIsLoggingOut(false);
        }
    };

    if (!isOpen) return null;

    const SettingsItem = ({ icon: Icon, title, subtitle, onClick, danger }: {
        icon: any; title: string; subtitle?: string; onClick: () => void; danger?: boolean;
    }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/10 shadow-sm active:scale-[0.98] transition-all text-left"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                danger ? "bg-red-50 dark:bg-red-500/10" : "bg-[#F2EFEA] dark:bg-white/5"
            )}>
                <Icon className={cn("w-5 h-5", danger ? "text-red-500" : "text-[#787570] dark:text-[#A6A29A]")} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-[15px] font-bold",
                    danger ? "text-red-500" : "text-[#4E342E] dark:text-[#E8E6E1]"
                )}>{title}</p>
                {subtitle && <p className="text-[11px] text-[#787570] dark:text-[#A6A29A] mt-0.5">{subtitle}</p>}
            </div>
            {!danger && <ChevronRight className="w-5 h-5 text-[#D4CFC9] shrink-0" />}
        </button>
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            className="fixed inset-0 bg-[#FDF8F1] dark:bg-[#121214] z-[10005] flex flex-col"
        >
            {/* Header */}
            <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-4 flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/10 flex items-center justify-center shadow-sm"
                >
                    <X className="w-5 h-5 text-[#787570]" />
                </button>
                <h1 className="text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">設定</h1>
                <div className="w-10" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]">
                {/* Account Card */}
                <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#F2EFEA] dark:bg-white/5 overflow-hidden border-2 border-[#F2EFEA] dark:border-white/10 shrink-0">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-7 h-7 text-[#D4CFC9]" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[16px] font-bold text-[#4E342E] dark:text-[#E8E6E1] truncate">
                                {isDemo ? "デモユーザー" : (user?.user_metadata?.display_name || user?.user_metadata?.full_name || "名無しさん")}
                            </p>
                            <p className="text-[12px] text-[#787570] dark:text-[#A6A29A] truncate">
                                {isDemo ? "データは保存されません" : user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* App Settings Section */}
                <div className="mb-6">
                    <p className="text-[11px] font-bold text-[#787570] dark:text-[#A6A29A] uppercase tracking-wider mb-3 px-1">アプリ設定</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-brand-peach" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">AIアシスト</p>
                                    <p className="text-[11px] text-[#787570] dark:text-[#A6A29A]">要約やタグ提案を有効にする</p>
                                </div>
                            </div>
                            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-[#787570]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">一日の始まり</p>
                                    <p className="text-[11px] text-[#787570] dark:text-[#A6A29A]">日付が変わる時間</p>
                                </div>
                            </div>
                            <select
                                value={settings.dayStartHour}
                                onChange={(e) => setSettings((s: any) => ({ ...s, dayStartHour: parseInt(e.target.value) }))}
                                className="text-[13px] font-bold text-[#4E342E] dark:text-[#E8E6E1] border border-[#F2EFEA] dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#1c1c1e]"
                            >
                                {[...Array(24)].map((_, i) => (
                                    <option key={i} value={i}>{i}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Data Management Section */}
                <div className="mb-6">
                    <p className="text-[11px] font-bold text-[#787570] dark:text-[#A6A29A] uppercase tracking-wider mb-3 px-1">データ管理</p>
                    <div className="space-y-3">
                        <SettingsItem
                            icon={Cat}
                            title="猫の登録・編集"
                            subtitle="猫ちゃんのプロフィール管理"
                            onClick={() => setIsCatModalOpen(true)}
                        />
                        <SettingsItem
                            icon={Heart}
                            title="ONEGAIの設定"
                            subtitle="ご飯、トイレ、定期タスク"
                            onClick={() => setIsCareModalOpen(true)}
                        />
                        <SettingsItem
                            icon={ShoppingBag}
                            title="在庫・記録項目の管理"
                            subtitle="消耗品の管理・通知"
                            onClick={() => setIsInventoryModalOpen(true)}
                        />
                        <SettingsItem
                            icon={Users}
                            title="家族メンバーの管理"
                            subtitle="家族の招待・編集"
                            onClick={() => setIsFamilyModalOpen(true)}
                        />
                    </div>
                </div>

                {/* Logout */}
                {!isDemo && (
                    <div className="mb-6">
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-red-100 dark:border-red-500/20 shadow-sm active:scale-[0.98] transition-all text-left"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                <LogOut className="w-5 h-5 text-red-500" />
                            </div>
                            <p className="text-[15px] font-bold text-red-500">ログアウト</p>
                        </button>
                    </div>
                )}

                {/* Version */}
                <p className="text-center text-[11px] text-[#D4CFC9] dark:text-[#A6A29A]/50 font-medium pb-4">NyaruHD v1.0.0</p>
            </div>

            {/* Modals */}
            <CatSettingsModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />
            <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
            <InventorySettingsModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
            <FamilyMemberModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />
        </motion.div>
    );
}
