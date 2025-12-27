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
import { CareSettingsModal } from "./care-settings-modal";
import { NoticeSettingsModal } from "./notice-settings-modal";
import { toast } from "sonner";

export function MoreScreen() {
    const { isPro, setIsPro, aiEnabled, setAiEnabled, settings, setSettings, cats, isDemo } = useAppState();
    const { user, signOut } = useAuth();
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isCareModalOpen, setIsCareModalOpen] = useState(false);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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

                    <div
                        className="px-4 py-3 flex items-center justify-between border-b border-slate-50 cursor-pointer active:bg-slate-50"
                        onClick={() => setIsCareModalOpen(true)}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">お世話設定</span>
                            <span className="text-[10px] text-muted-foreground">ごはんやトイレの頻度・時間</span>
                        </div>
                        <SettingsIcon className="h-4 w-4 text-slate-300" />
                    </div>

                    <div
                        className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-slate-50"
                        onClick={() => setIsNoticeModalOpen(true)}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">記録設定</span>
                            <span className="text-[10px] text-muted-foreground">体調・様子チェックの項目</span>
                        </div>
                        <SettingsIcon className="h-4 w-4 text-slate-300" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    onClick={() => setIsCatModalOpen(true)}
                    className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700"
                >
                    <Cat className="h-4 w-4 text-primary" />
                    猫を管理
                    <span className="text-[10px] text-muted-foreground font-normal">{cats.length}匹登録中</span>
                </Button>
                <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    家族を招待
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700">
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    スキン
                </Button>
                <Button variant="outline" className="rounded-2xl h-16 flex flex-col items-center justify-center gap-1 border-none bg-white shadow-sm font-bold text-xs text-slate-700">
                    <Info className="h-4 w-4 text-slate-400" />
                    使い方
                </Button>
            </div>

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

            {/* New Settings Modals */}
            <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
            <NoticeSettingsModal isOpen={isNoticeModalOpen} onClose={() => setIsNoticeModalOpen(false)} />
        </div>
    );
}

