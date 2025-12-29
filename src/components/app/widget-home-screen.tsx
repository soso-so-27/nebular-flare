"use client";

import React from "react";
import { useAppState } from "@/store/app-store";
import { motion } from "framer-motion";
import { Heart, AlertTriangle, Calendar, Image, Smile, Battery, Droplet, ShoppingCart, ChevronRight, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact Hero Widget
function HeroWidget() {
    const { cats, activeCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const daysTogetherCount = React.useMemo(() => {
        if (!activeCat?.birthday) return null;
        const startDate = new Date(activeCat.birthday);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }, [activeCat?.birthday]);

    if (!activeCat) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 p-4 shadow-sm border border-amber-200/50"
        >
            <div className="flex items-center gap-4">
                {/* Cat Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                    {activeCat.avatar ? (
                        <img src={activeCat.avatar} alt={activeCat.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-100 flex items-center justify-center">
                            <span className="text-2xl">🐱</span>
                        </div>
                    )}
                </div>
                {/* Info */}
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-amber-900">{activeCat.name}</h2>
                    {daysTogetherCount && (
                        <p className="text-sm text-amber-700">一緒に {daysTogetherCount}日目 🧡</p>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400" />
            </div>
        </motion.div>
    );
}

// Today's Condition Widget
function ConditionWidget() {
    const { noticeLogs, activeCatId, settings } = useAppState();
    const { dayStartHour } = settings;

    const today = React.useMemo(() => {
        const now = new Date();
        if (now.getHours() < dayStartHour) {
            now.setDate(now.getDate() - 1);
        }
        return now.toISOString().split('T')[0];
    }, [dayStartHour]);

    const catLogs = noticeLogs[activeCatId] || {};

    const conditions = [
        { id: 'appetite', label: '食欲', icon: Utensils },
        { id: 'energy', label: '元気', icon: Smile },
        { id: 'toilet', label: 'トイレ', icon: Droplet },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                <Heart className="w-3 h-3" /> 今日の体調
            </h3>
            <div className="space-y-2">
                {conditions.map(cond => {
                    const log = catLogs[cond.id];
                    const isToday = log?.at?.startsWith(today);
                    const isDone = isToday && log?.done;
                    const Icon = cond.icon;

                    return (
                        <div key={cond.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{cond.label}</span>
                            </div>
                            {isDone ? (
                                <span className="text-sm">😊</span>
                            ) : (
                                <span className="text-xs text-gray-300">--</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

// Inventory Alert Widget
function InventoryAlertWidget() {
    const { inventory } = useAppState();

    const urgentItems = React.useMemo(() => {
        if (!inventory) return [];
        return inventory
            .filter(it => it.enabled !== false && it.deleted_at === null)
            .map(it => {
                const rangeMax = it.range_max || 30;
                let daysLeft = rangeMax;
                if (it.last_bought) {
                    const lastDate = new Date(it.last_bought);
                    const todayDate = new Date();
                    const diffTime = todayDate.getTime() - lastDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    daysLeft = Math.max(0, rangeMax - diffDays);
                }
                return { ...it, daysLeft };
            })
            .filter(it => it.daysLeft <= 7)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 2);
    }, [inventory]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className={cn(
                "rounded-2xl p-4 shadow-sm border",
                urgentItems.length > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
            )}
        >
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> 在庫アラート
            </h3>
            {urgentItems.length > 0 ? (
                <div className="space-y-2">
                    {urgentItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                item.daysLeft <= 3 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                            )}>
                                あと{item.daysLeft}日
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-2">
                    <span className="text-2xl">✨</span>
                    <p className="text-xs text-gray-400 mt-1">在庫は十分</p>
                </div>
            )}
        </motion.div>
    );
}

// Anniversary Widget
function AnniversaryWidget() {
    const { cats, activeCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const daysTogetherCount = React.useMemo(() => {
        if (!activeCat?.birthday) return null;
        const startDate = new Date(activeCat.birthday);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }, [activeCat?.birthday]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 shadow-sm border border-amber-100"
        >
            <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 記念日
            </h3>
            <div className="text-center py-1">
                <p className="text-3xl font-bold text-amber-600">
                    {daysTogetherCount || '--'}
                </p>
                <p className="text-xs text-amber-500 mt-1">日目 🧡</p>
            </div>
        </motion.div>
    );
}

// Recent Photos Widget
function RecentPhotosWidget() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                <Image className="w-3 h-3" /> 最近の写真
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
                    >
                        <span className="text-gray-300">📷</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// Action Buttons
function ActionButtons({ onOpenSection }: { onOpenSection: (section: 'care' | 'cat' | 'inventory') => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
        >
            <button
                onClick={() => onOpenSection('care')}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
            >
                <Heart className="w-5 h-5 text-amber-600" />
                <span>お世話</span>
            </button>
            <button
                onClick={() => onOpenSection('cat')}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
            >
                <Smile className="w-5 h-5 text-amber-600" />
                <span>観察</span>
            </button>
        </motion.div>
    );
}

// Main Widget Layout Component
export function WidgetHomeScreen({ onOpenSection }: { onOpenSection: (section: 'care' | 'cat' | 'inventory') => void }) {
    return (
        <div className="space-y-4 pb-20">
            {/* Compact Hero */}
            <HeroWidget />

            {/* Widget Grid */}
            <div className="grid grid-cols-2 gap-3">
                <ConditionWidget />
                <InventoryAlertWidget />
                <AnniversaryWidget />
                <RecentPhotosWidget />
            </div>

            {/* Action Buttons */}
            <ActionButtons onOpenSection={onOpenSection} />
        </div>
    );
}
