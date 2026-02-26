import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Bell, Settings, ChevronRight,
    Cat, LogOut, User, Edit2, Check, Loader2
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
    useCatContext,
    useCareContext,
    useSettingsContext,
    useCoreContext
} from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { NotificationSettings } from "./notification-settings";
import { CatSettingsModal } from "../modals/cat-settings-modal";
import { CareSettingsModal } from "../modals/care-settings-modal";
import { FamilyMemberModal } from "../modals/family-member-modal";

interface SidebarMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (section: string, item?: string) => void;
    defaultSection?: 'care' | 'observation' | 'inventory' | 'activity';
}

type MenuLevel = 'root' | 'care' | 'observation' | 'inventory' | 'activity' | 'settings' | 'notifications';

export function SidebarMenu({ isOpen, onClose, onNavigate, defaultSection }: SidebarMenuProps) {
    const { user, signOut, updateProfile } = useAuth();
    const userName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー';
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Profile Name Edit States
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(userName);
    const [isSavingName, setIsSavingName] = useState(false);

    // State Hooks
    const { activeCatId } = useCatContext();
    const { settings, aiEnabled, setAiEnabled, setSettings, isPro, setIsPro } = useSettingsContext();
    const { isDemo } = useCoreContext();

    // Modal states
    const [isCareModalOpen, setIsCareModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

    const { dayStartHour } = settings;

    // Animation Variants
    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 300 } }
    };

    // Logout Handler
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
        } catch (error) {
            toast.error("ログアウトに失敗しました");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleUpdateName = async () => {
        if (isDemo) {
            toast.error("デモモードでは名前を変更できません");
            setIsEditingName(false);
            return;
        }

        if (!newName.trim()) {
            toast.error("名前を入力してください");
            return;
        }

        setIsSavingName(true);
        try {
            const { error } = await updateProfile(newName.trim());
            if (error) throw error;
            toast.success("名前を更新しました");
            setIsEditingName(false);
        } catch (error) {
            console.error(error);
            toast.error("更新に失敗しました");
        } finally {
            setIsSavingName(false);
        }
    };

    // Reusable Main View Component
    const MainSettingsView = () => {

        return (
            <div className="px-1 space-y-4">

                {/* Account Section */}
                <div className="p-4 rounded-3xl bg-white/50 border border-white/60 shadow-sm backdrop-blur-md group/account hover:bg-white/70 transition-colors duration-300">
                    <div className="text-[11px] font-bold text-slate-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
                        <User className="w-[18px] h-[18px] text-peach-500/80" />
                        アカウント
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-slate-300" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            autoFocus
                                            disabled={isSavingName}
                                            className="text-sm font-bold text-slate-700 bg-white/50 border border-slate-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-peach-400/50"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdateName();
                                                if (e.key === 'Escape') setIsEditingName(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleUpdateName}
                                            disabled={isSavingName}
                                            className="p-1 hover:bg-peach-50 text-peach-500 rounded-md transition-colors"
                                        >
                                            {isSavingName ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>
                                        {!isSavingName && (
                                            <button
                                                onClick={() => setIsEditingName(false)}
                                                className="p-1 hover:bg-slate-50 text-slate-400 rounded-md transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 cursor-pointer group/name" onClick={() => !isDemo && setIsEditingName(true)}>
                                        <span className="text-sm font-bold text-slate-700 truncate group-hover/name:text-slate-900 transition-colors">
                                            {isDemo ? "デモユーザー" : (user?.user_metadata?.display_name || "名無しさん")}
                                        </span>
                                        {!isDemo && (
                                            <Edit2 className="w-4 h-4 text-peach-500/60 group-hover/name:text-peach-500 transition-colors" />
                                        )}
                                    </div>
                                )}
                                <span className="text-[10px] text-slate-400 truncate">
                                    {isDemo ? "保存されません" : user?.email}
                                </span>
                            </div>
                        </div>
                        {!isDemo && (
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* App Settings / Notifications */}
                <div className="p-4 rounded-3xl bg-white/50 border border-white/60 shadow-sm backdrop-blur-md space-y-4">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-2 tracking-wider uppercase">
                        <Bell className="w-[18px] h-[18px] text-peach-500/80" />
                        通知設定
                    </div>
                    <div className="bg-slate-50/40 rounded-2xl p-2 border border-slate-100/50">
                        <NotificationSettings />
                    </div>
                </div>

                {/* Data Management Links */}
                <div className="p-4 rounded-3xl bg-white/50 border border-white/60 shadow-sm backdrop-blur-md space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
                        <Cat className="w-[18px] h-[18px] text-peach-500/80" />
                        データ管理
                    </div>

                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 px-2 rounded-xl text-left group hover:bg-slate-50/50 transition-colors"
                    >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">猫の登録・編集</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-peach-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <div className="h-px bg-slate-200/50" />

                    <button
                        onClick={() => setIsCareModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 px-2 rounded-xl text-left group hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">ONEGAIの設定</span>
                            <span className="text-[10px] text-slate-500 group-hover:text-slate-600">ご飯、トイレ、定期タスク</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-peach-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <button
                        onClick={() => setIsFamilyModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 px-2 rounded-xl text-left group hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">家族メンバーの管理</span>
                            <span className="text-[10px] text-slate-500 group-hover:text-slate-600">家族の招待・編集</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-peach-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                </div>

                <div className="text-center pt-4 pb-8">
                    <p className="text-[10px] text-slate-400">NyaruHD v1.0.0</p>
                </div>

                {/* Modals */}
                <CatSettingsModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />
                <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
                <FamilyMemberModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />
            </div >
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[10000] bg-[#4E342E]/10 backdrop-blur-sm cursor-pointer"
                    />

                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 z-[100000]"
                    >
                        <div className="bg-background overflow-hidden shadow-2xl flex flex-col w-full h-screen relative group">
                            {/* Specular Elements */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-20" />
                            <div className="absolute inset-0 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.1)] pointer-events-none z-20" />

                            {/* Gradient Overlay for extra glass depth */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                            {/* Navigation Header */}
                            <div className="px-6 py-2 flex items-center justify-between shrink-0 h-14 relative z-10">
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                                    アカウント・設定
                                </h1>

                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center hover:bg-white/60 transition-colors shadow-sm"
                                    aria-label="メニューを閉じる"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="relative z-10 w-full px-6 pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                <MainSettingsView />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
