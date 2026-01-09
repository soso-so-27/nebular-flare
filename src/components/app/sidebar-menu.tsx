import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    X, Bell, Settings, ChevronRight, Check,
    Heart, Cat, ShoppingCart, Calendar, Activity, Image as ImageIcon,
    ChevronLeft, Package, Sparkles, ClipboardList, ShoppingBag, Grid, LogOut, User, ArrowUpRight
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useAppState } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from '@/lib/supabase';
import { Switch } from "@/components/ui/switch";
import { NotificationSettings } from "./notification-settings";
import { ActivityFeed } from "./activity-feed";
import { CatSettingsModal } from "./cat-settings-modal";
import { CareSettingsModal } from "./care-settings-modal";
import { NoticeSettingsModal } from "./notice-settings-modal";
import { InventorySettingsModal } from "./inventory-settings-modal";
import { FamilyMemberModal } from "./family-member-modal";

interface SidebarMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (section: string, item?: string) => void;
    defaultSection?: 'care' | 'observation' | 'inventory' | 'activity';
}

type MenuLevel = 'root' | 'care' | 'observation' | 'inventory' | 'activity' | 'settings' | 'notifications';

export function SidebarMenu({ isOpen, onClose, onNavigate, defaultSection }: SidebarMenuProps) {
    const { user } = useAuth();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー';

    // Navigation Stack
    const [viewStack, setViewStack] = useState<MenuLevel[]>(['root']);
    const [direction, setDirection] = useState(0); // 1 for push (right), -1 for pop (left)

    // Initial Deep Link
    useEffect(() => {
        if (isOpen) {
            if (defaultSection) {
                setViewStack(['root', defaultSection]);
            } else {
                setViewStack(['root']);
            }
        }
    }, [isOpen, defaultSection]);

    const activeView = viewStack[viewStack.length - 1];

    const pushView = (view: MenuLevel) => {
        setDirection(1);
        setViewStack(prev => [...prev, view]);
    };

    const popView = () => {
        if (viewStack.length > 1) {
            setDirection(-1);
            setViewStack(prev => prev.slice(0, -1));
        } else {
            onClose();
        }
    };

    // State Hooks
    const {
        activeCatId,
        careTaskDefs,
        careLogs,
        noticeDefs,
        noticeLogs,
        inventory,
        setInventory,
        addCareLog,
        addObservation,
        settings,
        isDemo
    } = useAppState();

    const { dayStartHour } = settings;

    // --- Logic Reuse (Calculations) ---
    // Calculate "today"
    const today = useMemo(() => {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < dayStartHour) {
            now.setDate(now.getDate() - 1);
        }
        return now.toISOString().split('T')[0];
    }, [dayStartHour]);

    const getSlotLabel = (slot: string) => {
        switch (slot) {
            case 'morning': return '朝';
            case 'noon': return '昼';
            case 'evening': return '夕';
            case 'night': return '夜';
            default: return '';
        }
    };

    // Care Items Calculation
    const careItems = useMemo(() => {
        if (!careTaskDefs) return [];
        return careTaskDefs
            .filter(def => def.enabled !== false)
            .flatMap(def => {
                const shouldSplit = def.mealSlots && def.mealSlots.length > 0 &&
                    (def.frequency === 'twice-daily' || def.frequency === 'three-times-daily' || def.frequency === 'four-times-daily');
                const slots = shouldSplit ? (def.mealSlots || []) : [null];

                return slots.map(slot => {
                    const type = slot ? `${def.id}:${slot}` : def.id;
                    const label = slot ? `${def.title}（${getSlotLabel(slot)}）` : def.title;
                    const taskLogs = careLogs.filter(log => log.type === type);
                    let isDone = false;
                    if (taskLogs.length > 0) {
                        const sortedLogs = [...taskLogs].sort((a, b) =>
                            new Date(b.done_at).getTime() - new Date(a.done_at).getTime()
                        );
                        const lastLog = sortedLogs[0];
                        const adjustedLogDate = new Date(lastLog.done_at);
                        adjustedLogDate.setHours(adjustedLogDate.getHours() - dayStartHour);
                        const logDateStr = adjustedLogDate.toISOString().split('T')[0];
                        isDone = logDateStr === today;
                    }
                    return { id: type, label, icon: def.icon, type, done: isDone };
                });
            });
    }, [careTaskDefs, careLogs, today, dayStartHour]);

    // Animation Variants
    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 300 } }
    };

    const contentVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? "100%" : "-30%",
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 }
        },
        exit: (dir: number) => ({
            x: dir > 0 ? "-30%" : "100%",
            opacity: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 }
        })
    };

    // --- Sub-Components for Views ---

    // Icon Helper
    const ActivityIcon = (props: any) => (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )

    const RootView = () => {
        const { inventory } = useAppState();

        // Inventory Items Calculation (moved here for local use)
        const inventoryItems = useMemo(() => {
            if (!inventory) return [];
            return inventory
                .filter(it => it.enabled !== false && it.deleted_at === null)
                .map(it => {
                    const rangeMax = it.range_max || 30;
                    let daysLeft = rangeMax;
                    if (it.last_bought) {
                        const lastDate = new Date(it.last_bought);
                        const todayDate = new Date();
                        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                        daysLeft = Math.max(0, rangeMax - diffDays);
                    }
                    let status: 'ok' | 'warn' | 'danger' = 'ok';
                    if (daysLeft <= 3) status = 'danger';
                    else if (daysLeft <= 7) status = 'warn';

                    return { ...it, daysLeft, status };
                })
                .sort((a, b) => a.daysLeft - b.daysLeft);
        }, [inventory]);

        const urgentCount = inventoryItems.filter(it => it.status !== 'ok').length;

        return (
            <div className="space-y-6 pt-2">

                {/* Main Menu Cards */}
                {/* Main Menu Cards */}
                <div className="grid grid-cols-2 gap-4 px-2">
                    {/* Calendar (Lavender - Time + Activity History Integrated) */}
                    <button
                        onClick={() => { onNavigate('calendar'); onClose(); }}
                        className="menu-card aspect-[1.5] relative flex flex-col items-center justify-center gap-3 rounded-[24px] 
                            bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl
                            border border-white/80
                            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_10px_30px_-4px_rgba(0,0,0,0.1)]
                            hover:scale-[1.02] active:scale-95 transition-all duration-300 group overflow-hidden col-span-2"
                    >
                        <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-[#9D8CC2]/60 z-20" />
                        <div className="absolute inset-0 bg-[#B8A6D9]/10" />
                        <div className="w-12 h-12 rounded-full bg-[#B8A6D9]/20 flex items-center justify-center relative z-10 shadow-sm ring-1 ring-white/50">
                            <Calendar className="w-6 h-6 text-[#9D8CC2]" />
                        </div>
                        <div className="flex flex-col items-center z-10">
                            <span className="font-bold text-slate-600 text-sm tracking-tight text-shadow-sm">カレンダー</span>
                            <span className="text-[10px] text-slate-400 font-medium">お世話の記録と予定</span>
                        </div>
                    </button>

                    {/* Inventory (Sage - Health/Life) */}
                    <button
                        onClick={() => pushView('inventory')}
                        className="menu-card aspect-[1.1] relative flex flex-col items-center justify-center gap-3 rounded-[24px] 
                            bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl
                            border border-white/80
                            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_10px_30px_-4px_rgba(0,0,0,0.1)]
                            hover:scale-[1.02] active:scale-95 transition-all duration-300 group overflow-hidden"
                    >
                        {urgentCount > 0 && (
                            <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#EF5350] shadow-sm animate-pulse border-2 border-white z-20" />
                        )}
                        <div className="absolute inset-0 bg-[#7CAA8E]/10" />
                        <div className="w-12 h-12 rounded-full bg-[#7CAA8E]/20 flex items-center justify-center relative z-10 shadow-sm ring-1 ring-white/50">
                            <ShoppingBag className="w-6 h-6 text-[#6B997D]" />
                        </div>
                        <span className="font-bold text-slate-600 text-sm tracking-tight relative z-10 text-shadow-sm">在庫チェック</span>
                    </button>

                    {/* Gallery (Peach - Memories - External) */}
                    <button
                        onClick={() => { onNavigate('gallery'); onClose(); }}
                        className="menu-card aspect-[1.1] relative flex flex-col items-center justify-center gap-3 rounded-[24px] 
                            bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl
                            border border-white/80
                            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_10px_30px_-4px_rgba(0,0,0,0.1)]
                            hover:scale-[1.02] active:scale-95 transition-all duration-300 group overflow-hidden"
                    >
                        <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-[#D69E8A]/60 z-20" />
                        <div className="absolute inset-0 bg-[#E8B4A0]/10" />
                        <div className="w-12 h-12 rounded-full bg-[#E8B4A0]/20 flex items-center justify-center relative z-10 shadow-sm ring-1 ring-white/50">
                            <Grid className="w-6 h-6 text-[#D69E8A]" />
                        </div>
                        <span className="font-bold text-slate-600 text-sm tracking-tight relative z-10 text-shadow-sm">ギャラリー</span>
                    </button>
                </div>

                {/* Footer Links */}
                <div className="border-t border-slate-200/50 pt-4 px-4 flex justify-around">
                    <button
                        onClick={() => pushView('notifications')}
                        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors group"
                    >
                        <div className="p-3 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                            <Bell className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold">通知</span>
                    </button>

                    <button
                        onClick={() => pushView('settings')}
                        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors group"
                    >
                        <div className="p-3 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                            <Settings className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold">設定</span>
                    </button>
                </div>
            </div>
        );
    }

    const InventoryView = () => {
        const { inventory, updateInventoryItem } = useAppState();

        // Use type casting to avoid lint errors if type definition is lagging
        const inventoryItemsFormatted = inventory.map((item: any) => {
            // Fallback for quantity if missing (though it should be there)
            const qty = item.quantity ?? 100;
            const threshold = item.threshold ?? 20;
            const isLow = qty <= threshold;

            return {
                id: item.id,
                label: item.name || item.label, // handle both naming conventions
                status: isLow ? '残りわずか' : '在庫あり',
                amount: `${qty}%`,
                isLow
            };
        });

        const handleInventoryRefill = async (id: string, name: string) => {
            await updateInventoryItem(id, { quantity: 100, last_bought: new Date().toISOString() } as any);
            toast.success(`${name}を補充しました`);
        };

        return (
            <div className="space-y-4 px-1">
                <div className="p-4 rounded-2xl bg-white/40 border border-white/40 shadow-sm backdrop-blur-md">
                    <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        ストック状況
                    </div>
                    <div className="space-y-3">
                        {inventoryItemsFormatted.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${item.isLow ? 'bg-red-400 animate-pulse' : 'bg-[#7CAA8E]'}`} />
                                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    {item.isLow && <span className="text-[10px] text-red-500 font-bold bg-red-100 px-1.5 py-0.5 rounded-md">補充！</span>}
                                </div>
                                <button
                                    onClick={() => handleInventoryRefill(item.id, item.label)}
                                    className="text-xs font-bold text-[#7CAA8E] hover:text-[#5A8C6E] bg-[#7CAA8E]/10 px-3 py-1.5 rounded-full hover:bg-[#7CAA8E]/20 transition-colors"
                                >
                                    完了
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => { onNavigate('inventory'); onClose(); }}
                    className="w-full py-4 text-center text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                    在庫アイテムを編集する
                </button>
            </div>
        );
    }

    // Level 2: Activity View
    const ActivityView = () => (
        <div className="h-full pb-20">
            <ActivityFeed embedded={true} limit={50} />
        </div>
    );

    // Level 2: Notifications View
    const NotificationsView = () => (
        <div className="space-y-4 px-1">
            <div className="p-4 rounded-2xl bg-white/40 border border-white/40 shadow-sm backdrop-blur-md">
                <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    通知設定
                </div>
                <p className="text-sm text-slate-500 mb-4">お世話の時間を忘れないように、通知を受け取ることができます。</p>
                <NotificationSettings />
            </div>
        </div>
    );

    // Level 2: Settings Menu
    const SettingsView = () => {
        const { isPro, setIsPro, aiEnabled, setAiEnabled, settings, setSettings, isDemo } = useAppState();
        const { user, signOut } = useAuth();
        const [isLoggingOut, setIsLoggingOut] = useState(false);
        const [isCatModalOpen, setIsCatModalOpen] = useState(false);
        const [isCareModalOpen, setIsCareModalOpen] = useState(false);
        const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
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
            } catch (error) {
                toast.error("ログアウトに失敗しました");
            } finally {
                setIsLoggingOut(false);
            }
        };

        return (
            <div className="h-full overflow-y-auto pb-32 px-1 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

                {/* Account Section */}
                <div className="p-4 rounded-2xl bg-white/40 border border-white/40 shadow-sm backdrop-blur-md">
                    <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
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
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">
                                    {isDemo ? "デモユーザー" : (user?.user_metadata?.display_name || "名無しさん")}
                                </span>
                                <span className="text-[10px] text-slate-400">
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

                {/* App Settings */}
                <div className="p-4 rounded-2xl bg-white/40 border border-white/40 shadow-sm backdrop-blur-md space-y-4">
                    <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        アプリ設定
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">AIアシスト</span>
                            <span className="text-[10px] text-slate-500">要約やタグ提案を有効にする</span>
                        </div>
                        <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">一日の始まり</span>
                            <span className="text-[10px] text-slate-500">日付が変わる時間を設定</span>
                        </div>
                        <select
                            value={settings.dayStartHour}
                            onChange={(e) => setSettings(s => ({ ...s, dayStartHour: parseInt(e.target.value) }))}
                            className="text-xs border rounded p-1 bg-white/50"
                        >
                            {[...Array(24)].map((_, i) => (
                                <option key={i} value={i}>{i}:00</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">表示モード</span>
                            <span className="text-[10px] text-slate-500">ホーム画面のスタイル</span>
                        </div>
                        <select
                            value={settings.homeViewMode}
                            onChange={(e) => setSettings(s => ({ ...s, homeViewMode: e.target.value as any }))}
                            className="text-xs border rounded p-1 bg-white/50"
                        >
                            <option value="story">ストーリー</option>
                            <option value="parallax">カード</option>
                            <option value="icon">アイコン</option>
                        </select>
                    </div>
                </div>

                {/* Data Management Links */}
                <div className="p-4 rounded-2xl bg-white/40 border border-white/40 shadow-sm backdrop-blur-md space-y-1">
                    <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                        <Cat className="w-4 h-4" />
                        データ管理
                    </div>

                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 text-left group"
                    >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">猫の登録・編集</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    <div className="h-px bg-slate-200/50" />

                    <button
                        onClick={() => setIsCareModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 text-left group"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">お世話の設定</span>
                            <span className="text-[10px] text-slate-500">ご飯、トイレ、定期タスク</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    <div className="h-px bg-slate-200/50" />

                    <button
                        onClick={() => setIsNoticeModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 text-left group"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">記録項目の設定</span>
                            <span className="text-[10px] text-slate-500">体調、様子見のチェック項目</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    <div className="h-px bg-slate-200/50" />

                    <button
                        onClick={() => setIsInventoryModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 text-left group"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">在庫・記録項目の管理</span>
                            <span className="text-[10px] text-slate-500">消耗品の管理・通知</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    <div className="h-px bg-slate-200/50" />

                    <button
                        onClick={() => setIsFamilyModalOpen(true)}
                        className="w-full flex items-center justify-between py-3 text-left group"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">家族メンバーの管理</span>
                            <span className="text-[10px] text-slate-500">家族の招待・編集</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                </div>

                <div className="text-center pt-4 pb-8">
                    <p className="text-[10px] text-slate-400">CatUp v1.0.0</p>
                </div>

                {/* Modals */}
                <CatSettingsModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />
                <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
                <NoticeSettingsModal isOpen={isNoticeModalOpen} onClose={() => setIsNoticeModalOpen(false)} />
                <InventorySettingsModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
                <FamilyMemberModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />
            </div>
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
                        className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Bottom Sheet Container */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-x-0 bottom-0 z-[10001]"
                        drag={viewStack.length === 1 ? "y" : false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                    >
                        <div className="bg-[#FAF9F7]/60 backdrop-blur-3xl rounded-t-[32px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-t border-white/60 h-[92vh] flex flex-col w-full max-w-lg mx-auto relative group">
                            {/* Specular Elements */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-90 z-20" />
                            <div className="absolute inset-0 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.5)] pointer-events-none rounded-t-[32px] z-20" />

                            {/* Gradient Overlay for extra glass depth */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 relative z-10" onClick={viewStack.length > 1 ? popView : onClose}>
                                <div className="w-12 h-1.5 rounded-full bg-slate-400/30" />
                            </div>

                            {/* Navigation Header */}
                            <div className="px-6 py-2 flex items-center justify-between shrink-0 h-14 relative z-10">
                                <div className="flex items-center gap-2">
                                    {activeView !== 'root' && (
                                        <button
                                            onClick={popView}
                                            className="p-1 -ml-2 rounded-full hover:bg-white/40 transition-colors"
                                        >
                                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                                        </button>
                                    )}
                                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                                        {activeView === 'root' ? 'Menu' :
                                            activeView === 'settings' ? '設定' :
                                                activeView === 'inventory' ? '在庫' :
                                                    activeView === 'activity' ? 'お世話履歴' :
                                                        activeView === 'notifications' ? '通知' : 'Menu'}
                                    </h1>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center hover:bg-white/60 transition-colors shadow-sm"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            {/* User Profile Summary (Root only) */}
                            {activeView === 'root' && user && (
                                <div className="px-6 pb-2 relative z-10">
                                    <div className="flex items-center gap-3 py-2">
                                        <motion.div
                                            animate={{ y: [0, -3, 0], scale: [1, 1.02, 1] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                            className="h-12 w-12 rounded-full bg-white/50 border border-white/60 shadow-inner flex items-center justify-center overflow-hidden"
                                        >
                                            {user.user_metadata?.avatar_url ? (
                                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className="h-6 w-6 text-slate-400" />
                                                </div>
                                            )}
                                        </motion.div>
                                        <div>
                                            <div className="font-bold text-slate-800 leading-tight">
                                                {user.user_metadata?.display_name || 'My Cat User'}
                                            </div>
                                            <div className="text-xs text-slate-500">My Home</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content Area */}
                            <div className="flex-1 relative z-10 overflow-hidden">
                                <AnimatePresence initial={false} custom={direction}>
                                    <motion.div
                                        key={activeView}
                                        custom={direction}
                                        variants={contentVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="absolute inset-0 overflow-y-auto px-6 pt-2 pb-10"
                                    >
                                        {activeView === 'root' && <RootView />}
                                        {activeView === 'inventory' && <InventoryView />}
                                        {activeView === 'settings' && <SettingsView />}
                                        {activeView === 'activity' && <ActivityView />}
                                        {activeView === 'notifications' && <NotificationsView />}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
