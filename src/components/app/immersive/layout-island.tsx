"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Camera, Grid3X3, ChevronDown } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useAppState } from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";

interface LayoutIslandProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
}

/**
 * ダイナミックアイランド型レイアウト
 * - 上部中央: 統合ステータスピル
 *   - 進捗部分タップ → MagicBubble風のお世話一覧展開
 *   - 足あと部分タップ → 交換所
 * - 下部中央: フローティングDock（全て同程度の目立ち方）
 */
export function LayoutIsland({
    progress,
    onOpenPickup,
    onOpenGallery,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
}: LayoutIslandProps) {
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
        settings
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
            alerts = all
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
        }

        return { careItems: tasks, alertItems: alerts };
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, ENABLE_INTEGRATED_PICKUP]);

    const handleAction = async (item: any) => {
        if (item.type === 'task') {
            if (addCareLog) {
                const targetId = item.actionId || item.id;
                await addCareLog(targetId, item.perCat ? activeCatId : undefined);
                awardForCare(item.perCat ? activeCatId : undefined);
            }
        } else if (item.type === 'inventory') {
            // Redirect to inventory or quick fix? For now quick fix like bubble list
            // Assuming updateInventoryItem is available via useAppState but it wasn't destructured
            // For safety, we'll just open the pickup modal for alerts for now to ensure complex logic is handled
            onOpenPickup();
        } else {
            onOpenPickup();
        }
    };

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    const expandedListStyle = {
        background: 'rgba(0, 0, 0, 0.5)', // Slightly darker for better contrast with alerts
        backdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
    };

    return (
        <>
            {/* Top Center: Status Pill */}
            <motion.div
                className="absolute top-[2.5rem] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div
                    className="flex items-center gap-0 rounded-full overflow-hidden relative z-50"
                    style={glassStyle}
                >
                    {/* Footprint Points - Tap to open exchange */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenExchange}
                        className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-white/30 transition-colors"
                    >
                        <span className="text-lg">🐾</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--peach)' }}>
                            {stats.householdTotal}
                        </span>
                    </motion.button>

                    {/* Separator */}
                    <div className="w-px h-6 bg-slate-300/50" />

                    {/* Progress - Tap to toggle inline care list */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/30 transition-colors relative"
                    >
                        {/* Alert Badge */}
                        {ENABLE_INTEGRATED_PICKUP && alertItems.length > 0 && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white/50 animate-pulse" />
                        )}

                        <Heart className="w-4 h-4" style={{ color: 'var(--peach)' }} />
                        <span className="text-sm font-bold text-slate-600 tabular-nums">
                            {Math.round(progress * 100)}%
                        </span>
                        <div className="h-2 w-12 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'var(--peach)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </motion.div>
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
                                        onClick={onOpenPickup}
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

            {/* Bottom Center: Floating Dock */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-full"
                    style={glassStyle}
                >
                    {/* Pickup Button (Heart) - Only show if integration is DISABLED */}
                    {!ENABLE_INTEGRATED_PICKUP && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPickup}
                            className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                        >
                            <Heart className="w-5 h-5" style={{ color: 'var(--peach)' }} />
                        </motion.button>
                    )}

                    {/* Today's Photo Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenPhoto}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Camera className="w-5 h-5 text-slate-600" />
                    </motion.button>

                    {/* Menu Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenMenu}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Grid3X3 className="w-5 h-5 text-slate-600" />
                    </motion.button>
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
