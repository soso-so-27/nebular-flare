"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Sparkles, User, Info, Cat, LogOut, X, Bell } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { CatSettingsModal } from "./cat-settings-modal";
import { FamilyMemberModal } from "./family-member-modal";
import { ProfileSettingsModal } from "./profile-settings-modal";
import { toast } from "sonner";
import { CareSettingsModal } from "./care-settings-modal";
import { NoticeSettingsModal } from "./notice-settings-modal";
import { InventorySettingsModal } from "./inventory-settings-modal";
import { NotificationSettingsModal } from "./notification-settings-modal";

// Unified Header Component
function ScreenHeader({ title, onClose }: { title: string; onClose?: () => void }) {
    return (
        <div className="sticky top-0 z-50 bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border-b border-white/20 px-4 h-14 flex items-center justify-between shadow-sm">
            <h2 className="text-base font-bold text-slate-800 dark:text-white drop-shadow-sm">{title}</h2>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-white/20"
            >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-200" />
            </Button>
        </div>
    );
}

interface MoreScreenProps {
    onClose?: () => void;
}

export function MoreScreen({ onClose }: MoreScreenProps) {
    const { isPro, setIsPro, aiEnabled, setAiEnabled, settings, setSettings, cats, isDemo, initializeDefaults } = useAppState();
    const { user, signOut } = useAuth();
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCareModalOpen, setIsCareModalOpen] = useState(false);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

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

    return (
        <div className="min-h-screen bg-transparent pb-20">
            <ScreenHeader title="設定" onClose={onClose} />
            <div className="p-4 space-y-6">
                {/* Account Section */}
                <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-500" />
                            アカウント
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                    {user?.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-slate-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {isDemo ? "デモユーザー" : (user?.user_metadata?.display_name || "名無しさん")}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {isDemo ? "ログインするとデータが保存されます" : user?.email}
                                    </span>
                                </div>
                            </div>
                            {!isDemo && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsProfileModalOpen(true)}
                                        className="h-8 text-[10px]"
                                    >
                                        編集
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-[10px]"
                                    >
                                        <LogOut className="h-4 w-4 mr-1" />
                                        ログアウト
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <div className="border-t border-slate-50 dark:border-slate-800">
                        <button
                            onClick={() => setIsFamilyModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-900 dark:text-white">家族メンバー</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mr-auto pl-2">招待・管理</span>
                            <SettingsIcon className="h-4 w-4 text-slate-300" />
                        </button>
                    </div>
                </Card>

                <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-slate-500" />
                            設定
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 p-0">
                        {/* 
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">プラン <span className="text-[10px] text-[#B8A6D9] font-normal ml-1">(準備中)</span></span>
                                <span className="text-[10px] text-muted-foreground">{isPro ? 'Proを利用中' : 'Freeプラン'}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-50 pointer-events-none">
                                <Badge variant={isPro ? "secondary" : "outline"} className="text-[10px]">{isPro ? 'Pro' : 'Free'}</Badge>
                                <Switch checked={isPro} onCheckedChange={setIsPro} />
                            </div>
                        </div> 
                        */}

                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">AIアシスト</span>
                                <span className="text-[10px] text-muted-foreground">要約やタグ提案を有効にする</span>
                            </div>
                            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                        </div>

                        {/* 
                        <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">週1まとめ通知 <span className="text-[10px] text-[#B8A6D9] font-normal ml-1">(準備中)</span></span>
                                <span className="text-[10px] text-muted-foreground">日曜 18:00に配信</span>
                            </div>
                            <Switch
                                disabled
                                checked={settings.weeklySummaryEnabled}
                                onCheckedChange={(v) => setSettings(s => ({ ...s, weeklySummaryEnabled: v }))}
                            />
                        </div> 
                        */}

                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">一日の始まり</span>
                                <span className="text-[10px] text-muted-foreground">日付が変わる時間を設定</span>
                            </div>
                            <select
                                value={settings.dayStartHour}
                                onChange={(e) => setSettings(s => ({ ...s, dayStartHour: parseInt(e.target.value) }))}
                                className="text-xs border rounded p-1 bg-slate-50"
                            >
                                {[...Array(24)].map((_, i) => (
                                    <option key={i} value={i}>{i}:00</option>
                                ))}
                            </select>
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">表示モード</span>
                                <span className="text-[10px] text-muted-foreground">猫の切り替え方式と画面スタイル</span>
                            </div>
                            <select
                                value={settings.homeViewMode}
                                onChange={(e) => setSettings(s => ({ ...s, homeViewMode: e.target.value as any }))}
                                className="text-xs border rounded p-1 bg-slate-50"
                            >
                                <option value="story">ストーリー</option>
                                <option value="parallax">カード</option>
                                <option value="icon">アイコン</option>
                            </select>
                        </div>

                    </CardContent>
                </Card>

                {/* Data Management Section */}
                <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Cat className="h-4 w-4 text-slate-500" />
                            データ管理
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 p-0">
                        <button
                            onClick={() => setIsCatModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <span className="text-xs font-medium text-slate-900 dark:text-white">猫の登録・編集</span>
                            <SettingsIcon className="h-4 w-4 text-slate-300" />
                        </button>
                        <button
                            onClick={() => setIsCareModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-900 dark:text-white">お世話の設定</span>
                                <span className="text-[10px] text-muted-foreground">ご飯、トイレ、定期タスク</span>
                            </div>
                            <SettingsIcon className="h-4 w-4 text-slate-300" />
                        </button>
                        <button
                            onClick={() => setIsNoticeModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-900 dark:text-white">記録項目の設定</span>
                                <span className="text-[10px] text-muted-foreground">体調、様子見のチェック項目</span>
                            </div>
                            <SettingsIcon className="h-4 w-4 text-slate-300" />
                        </button>
                        <button
                            onClick={() => setIsInventoryModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-50 active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-900 dark:text-white">在庫の管理</span>
                                <span className="text-[10px] text-muted-foreground">消耗品の管理・通知</span>
                            </div>
                            <SettingsIcon className="h-4 w-4 text-slate-300" />
                        </button>
                        <button
                            onClick={() => setIsNotificationModalOpen(true)}
                            className="w-full px-4 py-3 flex items-center justify-between active:bg-slate-50 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-900 dark:text-white">通知設定</span>
                                <span className="text-[10px] text-muted-foreground">リマインダーやアラートの管理</span>
                            </div>
                            <Bell className="h-4 w-4 text-slate-300" />
                        </button>
                    </CardContent>
                </Card>





                <div className="space-y-4">
                    <h3 className="text-[10px] text-muted-foreground px-4 uppercase font-bold tracking-widest">サポート</h3>
                    <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50 active:bg-slate-50 cursor-pointer">
                            <span className="text-xs font-medium">使い方ガイド</span>
                            <Info className="h-4 w-4 text-slate-300" />
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between active:bg-slate-50 cursor-pointer">
                            <span className="text-xs font-medium">お問い合わせ</span>
                            <Info className="h-4 w-4 text-slate-300" />
                        </div>
                    </Card>
                </div>

                <div className="text-center pt-4">
                    <p className="text-[10px] text-muted-foreground opacity-50">NyaruHD v1.0.0</p>
                </div>

                {/* Cat Settings Modal */}
                <CatSettingsModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />

                {/* Family Member Modal */}
                <FamilyMemberModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />

                {/* Profile Settings Modal */}
                <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

                {/* Data Settings Modals */}
                <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
                <NoticeSettingsModal isOpen={isNoticeModalOpen} onClose={() => setIsNoticeModalOpen(false)} />
                <InventorySettingsModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
                <NotificationSettingsModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} />
            </div>
        </div>
    );
}
