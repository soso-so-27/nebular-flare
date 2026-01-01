"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Sparkles, User, Info, Cat, LogOut, X } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { CatSettingsModal } from "./cat-settings-modal";
import { FamilyMemberModal } from "./family-member-modal";
import { ProfileSettingsModal } from "./profile-settings-modal";
import { toast } from "sonner";

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
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">
                                    {isDemo ? "デモユーザー" : (user?.email || "未ログイン")}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {isDemo ? "ログインするとデータが保存されます" : "ログイン中"}
                                </span>
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
                </Card>

                <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-slate-500" />
                            設定
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 p-0">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">プラン <span className="text-[10px] text-amber-500 font-normal ml-1">(準備中)</span></span>
                                <span className="text-[10px] text-muted-foreground">{isPro ? 'Proを利用中' : 'Freeプラン'}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-50 pointer-events-none">
                                <Badge variant={isPro ? "secondary" : "outline"} className="text-[10px]">{isPro ? 'Pro' : 'Free'}</Badge>
                                <Switch checked={isPro} onCheckedChange={setIsPro} />
                            </div>
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">AIアシスト</span>
                                <span className="text-[10px] text-muted-foreground">要約やタグ提案を有効にする</span>
                            </div>
                            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">週1まとめ通知 <span className="text-[10px] text-amber-500 font-normal ml-1">(準備中)</span></span>
                                <span className="text-[10px] text-muted-foreground">日曜 18:00に配信</span>
                            </div>
                            <Switch
                                disabled
                                checked={settings.weeklySummaryEnabled}
                                onCheckedChange={(v) => setSettings(s => ({ ...s, weeklySummaryEnabled: v }))}
                            />
                        </div>

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
                                <span className="text-xs font-bold">猫の切り替え</span>
                                <span className="text-[10px] text-muted-foreground">ホーム画面の表示スタイル</span>
                            </div>
                            <select
                                value={settings.homeDisplayMode}
                                onChange={(e) => setSettings(s => ({ ...s, homeDisplayMode: e.target.value as any }))}
                                className="text-xs border rounded p-1 bg-slate-50"
                            >
                                <option value="story">ストーリー</option>
                                <option value="parallax">パララックス</option>
                                <option value="avatars">アイコン</option>
                            </select>
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">操作メニュー</span>
                                <span className="text-[10px] text-muted-foreground">ボタン配置と操作感</span>
                            </div>
                            <select
                                value={settings.homeInterfaceMode || 'bubble'}
                                onChange={(e) => setSettings(s => ({ ...s, homeInterfaceMode: e.target.value as any }))}
                                className="text-xs border rounded p-1 bg-slate-50"
                            >
                                <option value="bubble">Magic Bubble (推奨)</option>
                                <option value="editorial">Editorial Corners</option>
                                <option value="classic">クラシック</option>
                            </select>
                        </div>

                        <p className="px-4 py-2 text-[10px] text-slate-400">
                            ※ お世話・猫の様子・在庫の設定は各カードの⚙️から
                        </p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsFamilyModalOpen(true)}
                        className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg font-bold text-xs text-slate-700 dark:text-slate-200"
                    >
                        <User className="h-4 w-4 text-slate-400" />
                        家族を招待
                    </Button>
                    <Button variant="outline" disabled className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg font-bold text-xs text-slate-700 dark:text-slate-200 opacity-50">
                        <Sparkles className="h-4 w-4 text-slate-400" />
                        スキン (準備中)
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg font-bold text-xs text-slate-700 dark:text-slate-200">
                        <Info className="h-4 w-4 text-slate-400" />
                        使い方
                    </Button>
                </div>

                {/* System Section */}
                {!isDemo && (
                    <div className="space-y-4">
                        <h3 className="text-[10px] text-muted-foreground px-4 uppercase font-bold tracking-widest">システム</h3>
                        <Card className="rounded-3xl shadow-lg border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                            <button
                                type="button"
                                onClick={async () => {
                                    console.log("Button clicked, calling initializeDefaults...", initializeDefaults);
                                    if (!initializeDefaults) {
                                        toast.error("初期化機能が見つかりません。リロードしてください。");
                                        return;
                                    }
                                    // Remove native confirm which might be blocked
                                    // if (confirm("初期データをロードしますか？（既存のデータがあればスキップされます）")) {
                                    try {
                                        console.log("Starting initialization...");
                                        toast.info("初期化を開始しました...");
                                        await initializeDefaults();
                                        console.log("Initialization done.");
                                        toast.success("データを初期化しました（必要に応じてリロードされます）");
                                    } catch (e) {
                                        console.error("Initialization failed", e);
                                        toast.error("初期化に失敗しました");
                                    }
                                    // }
                                }}
                                className="w-full px-4 py-3 flex items-center justify-between active:bg-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                            >
                                <span className="text-xs font-medium text-slate-900">基本データの登録</span>
                                <SettingsIcon className="h-4 w-4 text-slate-300" />
                            </button>
                        </Card>
                    </div>
                )}

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
                    <p className="text-[10px] text-muted-foreground opacity-50">CatUp v1.0.0</p>
                </div>

                {/* Cat Settings Modal */}
                <CatSettingsModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />

                {/* Family Member Modal */}
                <FamilyMemberModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />

                {/* Profile Settings Modal */}
                <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

            </div>
        </div>
    );
}
