"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Camera, Grid3X3 } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useAppState } from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";

interface LayoutBottomNavProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
}

/**
 * ボトムナビゲーション型レイアウト
 * - 左上: お世話進捗ボタン（→MagicBubble風のお世話一覧展開）
 * - 下部: ナビゲーションバー（全て同程度の目立ち方）
 */
export function LayoutBottomNav({
    progress,
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
}: LayoutBottomNavProps) {
    const { stats } = useFootprintContext();
    const [isExpanded, setIsExpanded] = React.useState(false);

    // App State for Care Items
    const {
        careLogs, addCareLog,
        careTaskDefs,
        noticeDefs, noticeLogs,
        observations,
        inventory,
        activeCatId, cats,
        settings,
        incidents, // Added incidents
    } = useAppState();
    const { awardForCare } = useFootprintContext();

    // FEATURE FLAG: Set to false to revert to separate pickup button
    const ENABLE_INTEGRATED_PICKUP = true;

    // Calculate Care Items (Task + Notifications if integrated)
    const { careItems, alertItems } = React.useMemo(() => {
        const now = new Date();
        const businessDate = new Date(now);
        if (now.getHours() < settings.dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }
        const todayStr = businessDate.toISOString().split('T')[0];

        const catchUpData = getCatchUpItems({
            tasks: [],
            noticeLogs: noticeLogs || {},
            inventory: inventory || [],
            lastSeenAt: "1970-01-01",
            settings,
            cats,
            careTaskDefs,
            careLogs,
            noticeDefs,
            today: todayStr,
            observations
        });

        const all = catchUpData.allItems;

        // Filter tasks
        const tasks = all
            .filter(item => item.type === 'task')
            .map(item => ({
                id: item.id,
                actionId: item.actionId,
                label: item.title,
                subLabel: item.body,
                perCat: item.payload?.perCat,
                done: false,
                catId: item.catId,
                type: 'task',
                severity: item.severity,
                payload: item.payload
            }));

        // Filter alerts (inv, notices) only if integrated
        let alerts: any[] = [];
        if (ENABLE_INTEGRATED_PICKUP) {
            // 1. Incidents (Direct from Supabase)
            const activeIncidents = incidents ? incidents.filter(inc => inc.status !== 'resolved') : [];
            const incidentAlerts = activeIncidents.map(inc => {
                const cat = cats.find(c => c.id === inc.cat_id);
                const typeLabel = {
                    'vomit': '嘔吐',
                    'diarrhea': '下痢',
                    'injury': '怪我',
                    'appetite': '食欲不振',
                    'energy': '元気がない',
                    'toilet': 'トイレ失敗',
                    'other': 'その他'
                }[inc.type as string] || inc.type;

                return {
                    id: inc.id,
                    actionId: inc.id,
                    label: `${cat?.name || '猫ちゃん'} : ${typeLabel}`,
                    subLabel: new Date(inc.created_at).toLocaleDateString(),
                    type: 'incident',
                    severity: 100, // Highest priority
                    catId: inc.cat_id,
                    payload: inc
                };
            });

            // 2. CatchUp Alerts (Notices, Inventory)
            const catchUpAlerts = all
                .filter(item => item.type !== 'task' && item.severity >= 60) // Critical/Urgent items
                .map(item => ({
                    id: item.id,
                    actionId: item.actionId,
                    label: item.title,
                    subLabel: item.body,
                    type: item.type,
                    severity: item.severity,
                    catId: item.catId,
                    payload: item.payload
                }));

            // Merge and sort
            alerts = [...incidentAlerts, ...catchUpAlerts].sort((a, b) => b.severity - a.severity);
        }

        return { careItems: tasks, alertItems: alerts };
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, incidents, ENABLE_INTEGRATED_PICKUP]);

    const handleAction = async (item: any) => {
        if (item.type === 'task') {
            if (addCareLog) {
                const targetId = item.actionId || item.id;
                await addCareLog(targetId, item.perCat ? activeCatId : undefined);
                awardForCare(item.perCat ? activeCatId : undefined);
            }
        } else if (item.type === 'inventory') {
            onOpenPickup();
        } else {
            onOpenPickup();
        }
    };

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: '0 -4px 32px -4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
    };

    const pillStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    const expandedListStyle = {
        background: 'rgba(0, 0, 0, 0.5)', // Darker background
        backdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
    };

    return (
        <>
            {/* Top Left: Care Progress Button - Toggles inline care list */}
            <motion.div
                className="absolute top-[2.5rem] left-6 z-50 pointer-events-auto flex flex-col items-start"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="relative z-50">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full relative z-50"
                        style={pillStyle}
                    >
                        {/* Alert Badge */}
                        {ENABLE_INTEGRATED_PICKUP && alertItems.length > 0 && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                        )}

                        <Heart className="w-5 h-5" style={{ color: 'var(--peach)' }} />
                        <span className="text-sm font-bold text-slate-600 tabular-nums">
                            {Math.round(progress * 100)}%
                        </span>
                        <div className="h-2 w-16 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'var(--peach)' }}
                                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                            />
                        </div>
                    </motion.button>
                </div>

                {/* Inline Expanded Care List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 10 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-72 overflow-hidden rounded-2xl relative mt-2"
                            style={expandedListStyle}
                        >
                            <div className="p-4 space-y-4">

                                {/* 1. Alerts Section (If enabled and exists) */}
                                {ENABLE_INTEGRATED_PICKUP && alertItems.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-rose-300 text-xs font-bold pl-1">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                                            <span>要確認</span>
                                        </div>
                                        <div className="space-y-2">
                                            {alertItems.map(item => (
                                                <motion.button
                                                    key={item.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAction(item)}
                                                    className="w-full text-left p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-900/40 border border-rose-500/30 flex items-start gap-3"
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                                        <span className="text-rose-200 text-xs">!</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-rose-100 leading-tight mb-1">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[10px] text-rose-200/70 leading-tight">
                                                            {item.subLabel}
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                        <div className="h-px bg-white/10 w-full mt-2" />
                                    </div>
                                )}

                                {/* 2. Care Header */}
                                <div className="flex items-center gap-2 text-white/90 text-xs font-bold pl-1">
                                    <Heart className="w-3.5 h-3.5" />
                                    <span>お世話</span>
                                </div>

                                {/* List Items */}
                                <div className="space-y-2">
                                    {careItems.length === 0 ? (
                                        <div className="text-center py-4 text-white/60 text-xs">
                                            すべて完了！✨
                                        </div>
                                    ) : (
                                        careItems.map(item => (
                                            <motion.button
                                                key={item.id}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleAction(item)}
                                                className="flex items-center gap-3 w-full text-left group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                                                    {/* Radio-like circle */}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-white leading-none mb-1 truncate">
                                                        {item.label}
                                                    </span>
                                                    {item.subLabel && (
                                                        <span className="text-[10px] text-white/60 truncate">
                                                            {item.subLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.button>
                                        ))
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-white/10 w-full" />

                                {/* Action Buttons */}
                                <div className="space-y-2">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onOpenPickup} // Using pickup modal for "Notice/Incident" creation for now
                                        className="w-full flex items-center gap-3 p-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-[#E8B4A0] flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">!</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">気付きを記録</span>
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onOpenPhoto}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-[#E8B4A0] flex items-center justify-center">
                                            <Camera className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-white">今日の一枚</span>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Bottom Navigation Bar - All buttons equally styled */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto pb-safe"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="mx-4 mb-4 rounded-2xl px-4 py-3"
                    style={glassStyle}
                >
                    <div className="flex items-center justify-around">
                        {/* Pickup (Heart) - Only show if integration is DISABLED */}
                        {!ENABLE_INTEGRATED_PICKUP && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onOpenPickup}
                                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                            >
                                <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                                <span className="text-[10px] text-slate-500">ピックアップ</span>
                            </motion.button>
                        )}

                        {/* Photo Button (Camera - same level as others) */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPhoto}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Camera className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">今日の一枚</span>
                        </motion.button>

                        {/* Menu */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenMenu}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Grid3X3 className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">メニュー</span>
                        </motion.button>

                        {/* Footprints / Exchange - Label changed to 足あと */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenExchange}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <div className="relative">
                                <span className="text-xl">🐾</span>
                                <div className="absolute -top-1 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--peach)' }}>
                                    {stats.householdTotal}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500">足あと</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Backdrop for outside click to close */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </>
    );
}
