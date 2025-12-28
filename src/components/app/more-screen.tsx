"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Sparkles, User, Info, Cat, LogOut } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { CatSettingsModal } from "./cat-settings-modal";
import { FamilyMemberModal } from "./family-member-modal";
import { toast } from "sonner";

export function MoreScreen() {
    const { isPro, setIsPro, aiEnabled, setAiEnabled, settings, setSettings, cats, isDemo, initializeDefaults } = useAppState();
    const { user, signOut } = useAuth();
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
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
        } catch (error) {
            toast.error("ログアウトに失敗しました");
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Account Section */}
            <Card className="rounded-3xl shadow-sm border-none bg-white overflow-hidden">
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-4 w-4 mr-1" />
                                ログアウト
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-none bg-white overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4 text-slate-500" />
                        設定
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-0">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">プラン</span>
                            <span className="text-[10px] text-muted-foreground">{isPro ? 'Proを利用中' : 'Freeプラン'}</span>
                        </div>
                        <div className="flex items-center gap-2">
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
                            <span className="text-xs font-bold">週1まとめ通知</span>
                            <span className="text-[10px] text-muted-foreground">日曜 18:00に配信</span>
                        </div>
                        <Switch
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

                    <p className="px-4 py-2 text-[10px] text-slate-400">
                        ※ お世話・猫の様子・在庫の設定は各カードの⚙️から
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    onClick={() => setIsFamilyModalOpen(true)}
                    className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700"
                >
                    <User className="h-4 w-4 text-slate-400" />
                    家族を招待
                </Button>
                <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700">
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    スキン
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700">
                    <Info className="h-4 w-4 text-slate-400" />
                    使い方
                </Button>
            </div>

            {/* System Section */}
            {!isDemo && (
                <div className="space-y-4">
                    <h3 className="text-[10px] text-muted-foreground px-4 uppercase font-bold tracking-widest">システム</h3>
                    <Card className="rounded-3xl shadow-sm border-none bg-white overflow-hidden">
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
                <Card className="rounded-3xl shadow-sm border-none bg-white overflow-hidden">
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

        </div>
    );
}

