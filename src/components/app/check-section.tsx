"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, Cat, ShoppingCart, Zap, Droplet, Scissors, UtensilsCrossed, Pill, Bath, Wind, Stethoscope, Search, AlertCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getToday } from "@/lib/date-utils";
import { getIcon } from "@/lib/icon-utils";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";

interface CheckItem {
    id: string;
    type: 'care' | 'observation' | 'inventory';
    label: string;
    catId?: string;
    catName?: string;
    urgency?: 'danger' | 'warn' | 'soon';
    daysLeft?: number;
    stockLevel?: string; // For inventory items
    icon?: string; // Icon name from settings
    onAction: () => void;
    onSecondaryAction?: () => void;
}

export function CheckSection() {
    const {
        tasks, setTasks,
        noticeDefs, noticeLogs, setNoticeLogs,
        inventory, setInventory,
        cats, activeCatId,
        settings,
        careLogs, addCareLog,
        observations, addObservation,
        isDemo,
        careTaskDefs
    } = useAppState();

    const { awardForCare, awardForObservation } = useFootprintContext();

    const today = useMemo(() => getToday(settings.dayStartHour), [settings.dayStartHour]);

    // Client-side current hour to avoid hydration mismatch
    const [currentHour, setCurrentHour] = useState<number | null>(null);
    useEffect(() => {
        setCurrentHour(new Date().getHours());
    }, []);

    // File input for care photos
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingItemId, setUploadingItemId] = React.useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && uploadingItemId) {
            const file = e.target.files[0];
            const item = pendingCareItems.find(i => i.id === uploadingItemId);

            // Reconstruct logic to find def and call addCareLog
            // uploadingItemId is def.id (for simple) or def.id_slot (for slotted)
            // But UUID has no underscores, slots do.
            // Actually, safe way is to find def by matching ID prefix? 
            // Or just split by _ if we rely on format.
            // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (hyphens)
            // So splitting by _ is safe if ID uses hyphens.

            let defId = uploadingItemId;
            let slot: string | undefined = undefined;

            const parts = uploadingItemId.split('_');
            if (parts.length > 1) {
                // Check if last part is a valid slot
                const potentialSlot = parts[parts.length - 1];
                if (['morning', 'noon', 'evening', 'night'].includes(potentialSlot)) {
                    slot = potentialSlot;
                    defId = parts.slice(0, parts.length - 1).join('_');
                }
            }

            const def = careTaskDefs.find(d => d.id === defId);
            if (def) {
                const type = slot ? `${defId}:${slot}` : defId;
                const catId = def.perCat ? activeCatId : undefined;

                toast.info("写真をアップロード中...");
                const result = await addCareLog(type, catId, undefined, [file]);
                if (result?.error) {
                    toast.error("完了しましたが写真のアップロードに失敗しました");
                } else {
                    awardForCare(catId);
                    toast.success("写真付きで完了しました！");
                }
            } else {
                toast.error("タスクが見つかりません");
            }
            // Reset
            setUploadingItemId(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Random background image from active cat's gallery
    const [bgImage, setBgImage] = useState<string | null>(null);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const activeCat = cats.find(c => c.id === activeCatId);
            if (activeCat?.images && activeCat.images.length > 0) {
                const randomImg = activeCat.images[Math.floor(Math.random() * activeCat.images.length)];
                setBgImage(randomImg.storagePath);
            } else {
                setBgImage(null);
            }
        }
    }, [activeCatId, cats]);

    // Helper to get public URL
    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    // Meal slot utilities
    const getCurrentMealSlot = (hour: number): 'morning' | 'noon' | 'evening' | 'night' => {
        if (hour >= 5 && hour < 11) return 'morning';
        if (hour >= 11 && hour < 15) return 'noon';
        if (hour >= 15 && hour < 20) return 'evening';
        return 'night';
    };

    const getDefaultMealSlots = (freq: string): ('morning' | 'noon' | 'evening' | 'night')[] => {
        return ['morning'];
    };

    const getMealSlotLabel = (slot: string): string => {
        switch (slot) {
            case 'morning': return '朝';
            case 'noon': return '昼';
            case 'evening': return '夕';
            case 'night': return '夜';
            default: return '';
        }
    };

    // Get pending care items - hybrid approach:
    // Show current slot tasks + any pending past slots with time labels
    const pendingCareItems: CheckItem[] = useMemo(() => {
        // Get current hour (client-side only)
        const hour = currentHour ?? new Date().getHours();
        const currentSlot = getCurrentMealSlot(hour);
        const slotOrder: ('morning' | 'noon' | 'evening' | 'night')[] = ['morning', 'noon', 'evening', 'night'];
        const currentSlotIndex = slotOrder.indexOf(currentSlot);

        const enabledTasks = careTaskDefs
            .filter(def => def.enabled !== false)
            .filter(def => {
                // Filter by targetCatIds if set
                if (def.perCat && def.targetCatIds && def.targetCatIds.length > 0) {
                    return def.targetCatIds.includes(activeCatId);
                }
                return true;
            });

        const items: CheckItem[] = [];

        enabledTasks.forEach(def => {
            const slots = (def.mealSlots && def.mealSlots.length > 0) ? def.mealSlots : [];

            // For 'as-needed' or tasks without specific slots, check if done today
            if (def.frequency === 'as-needed' || slots.length === 0) {
                // Both modes now use careLogs (demo mode has converted demoCareLogsDone)
                const matchingLog = careLogs.find(log => {
                    const typeMatch = log.type === def.id;
                    if (!typeMatch) return false;
                    if (def.perCat) return log.cat_id === activeCatId;
                    return true;
                });

                if (!matchingLog) {
                    items.push({
                        id: def.id,
                        type: 'care' as const,
                        label: def.title,
                        icon: def.icon,
                        onAction: async () => {
                            const result = await addCareLog(def.id, def.perCat ? activeCatId : undefined);
                            if (result?.error) {
                                toast.error("記録に失敗しました");
                            } else {
                                awardForCare(def.perCat ? activeCatId : undefined);
                                toast.success(`${def.title} 完了！`);
                            }
                        }
                    });
                }
                return;
            }

            // For slot-based tasks: show current slot + any pending past slots
            for (const slot of slots) {
                const slotIndex = slotOrder.indexOf(slot);

                // Only show slots up to and including current slot (not future)
                if (slotIndex > currentSlotIndex) continue;

                // Check if this task is done today (exact match with slot type)
                const type = `${def.id}:${slot}`;
                const slotDone = careLogs.find(log => {
                    const typeMatch = log.type === type;
                    if (!typeMatch) return false;
                    if (def.perCat) return log.cat_id === activeCatId;
                    return true;
                });

                if (!slotDone) {
                    const slotLabel = getMealSlotLabel(slot);
                    items.push({
                        id: `${def.id}_${slot}`,
                        type: 'care' as const,
                        label: `${def.title}（${slotLabel}）`,
                        icon: def.icon,
                        onAction: async () => {
                            const result = await addCareLog(type, def.perCat ? activeCatId : undefined);
                            if (result?.error) {
                                toast.error("記録に失敗しました");
                            } else {
                                awardForCare(def.perCat ? activeCatId : undefined);
                                toast.success(`${def.title}（${slotLabel}）完了！`);
                            }
                        }
                    });
                    // Only show the earliest pending slot for this task
                    break;
                }
            }
        });

        return items;
    }, [careTaskDefs, careLogs, addCareLog, currentHour, activeCatId]);

    // Get ABNORMAL observation items for active cat (items marked as "注意" today)
    const pendingObservationItems: CheckItem[] = useMemo(() => {
        const activeCat = cats.find(c => c.id === activeCatId);
        if (!activeCat) return [];

        const catLogs = noticeLogs[activeCatId] || {};

        return noticeDefs
            .filter(n => n.enabled !== false && n.kind === 'notice')
            .filter(notice => {
                if (isDemo) {
                    const log = catLogs[notice.id];
                    const isToday = log?.at?.startsWith(today);
                    // Show only if recorded as abnormal today (includes memo-appended values)
                    return isToday && log?.done && (log?.value?.startsWith('ちょっと違う') || log?.value === '注意');
                } else {
                    // Filter observations for active cat and matching notice ID (UUID)
                    const obs = observations.find(o => o.cat_id === activeCatId && o.type === notice.id);
                    return obs && (obs.value?.startsWith('ちょっと違う') || obs.value === '注意');
                }
            })
            .map(notice => ({
                id: notice.id,
                type: 'observation' as const,
                label: notice.alertLabel || notice.title,
                catId: activeCatId,
                catName: activeCat?.name,
                // Action: Mark as resolved/OK
                onAction: async () => {
                    if (isDemo) {
                        setNoticeLogs(prev => ({
                            ...prev,
                            [activeCatId]: {
                                ...prev[activeCatId],
                                [notice.id]: {
                                    id: `${activeCatId}_${notice.id}_${Date.now()}`,
                                    catId: activeCatId,
                                    noticeId: notice.id,
                                    value: 'いつも通り',
                                    at: new Date().toISOString(),
                                    done: true,
                                    later: false
                                }
                            }
                        }));
                        toast.success(`${notice.title}: 状態を確認しました`);
                    } else {
                        // Supabase - use UUID directly
                        const result = await addObservation(activeCatId, notice.id, 'いつも通り');

                        if (result?.error) {
                            toast.error("記録に失敗しました");
                        } else {
                            toast.success(`${notice.title} 完了！`);
                        }
                    }
                }
            }));
    }, [cats, activeCatId, noticeDefs, noticeLogs, observations, today, isDemo, setNoticeLogs, addObservation]);

    // Get urgent inventory items based on stockLevel (low or empty)
    const urgentInventoryItems: CheckItem[] = useMemo(() => {
        return inventory
            .filter(it => {
                // Skip if item is disabled
                if (it.enabled === false) return false;
                // Skip if alerts are disabled for this item
                if (it.alertEnabled === false) return false;
                // Show items with low or empty stock
                return it.stockLevel === 'low' || it.stockLevel === 'empty';
            })
            .map(it => {
                const urgency = it.stockLevel === 'empty' ? 'danger' : 'warn';
                return {
                    id: it.id,
                    type: 'inventory' as const,
                    label: it.label,
                    urgency: urgency as 'danger' | 'warn' | 'soon',
                    stockLevel: it.stockLevel,
                    onAction: () => {
                        setInventory(prev => prev.map(item => {
                            if (item.id === it.id) {
                                return {
                                    ...item,
                                    stockLevel: 'full',
                                    lastRefillDate: new Date().toISOString()
                                };
                            }
                            return item;
                        }));
                        toast.success("補充完了！在庫を「たっぷり」にリセットしました");
                    }
                };
            });
    }, [inventory, setInventory]);

    const allItems = [...pendingCareItems, ...pendingObservationItems, ...urgentInventoryItems];
    const totalCount = allItems.length;

    // if (totalCount === 0) return null; // Always show

    return (
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">


            <div className="relative z-10">
                {/* Header Row - Compact */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        ピックアップ
                    </h3>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {totalCount}
                    </span>
                </div>

                {/* Items List - Compact */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {totalCount === 0 && (
                        <div className="px-4 py-8 text-center">
                            <span className="text-sm text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                                全て完了しています
                            </span>
                        </div>
                    )}
                    {/* Care Items */}
                    {pendingCareItems.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-2.5 group"
                        >
                            <div className="flex items-center gap-2">
                                {item.icon ? (
                                    React.createElement(getIcon(item.icon), { className: "h-3.5 w-3.5 text-primary" })
                                ) : (
                                    <Heart className="h-3.5 w-3.5 text-primary" />
                                )}
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                    {item.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {uploadingItemId === item.id ? (
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setUploadingItemId(item.id);
                                            fileInputRef.current?.click();
                                        }}
                                        className="p-1.5 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="写真を撮って記録"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={item.onAction}
                                    className="text-xs font-bold px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 active:scale-95 transition-all"
                                >
                                    完了
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Observation Items */}
                    {pendingObservationItems.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-2.5"
                        >
                            <div className="flex items-center gap-2">
                                <Cat className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                    {item.label}
                                </span>
                                <span className="text-xs text-slate-400">({item.catName})</span>
                            </div>
                            <button
                                onClick={item.onAction}
                                className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#E5F0EA] text-[#5A8C6E] hover:bg-[#Cce3d6] active:bg-[#a3cbb5] active:scale-95 transition-all"
                            >
                                確認済
                            </button>
                        </div>
                    ))}

                    {/* Inventory Items */}
                    {urgentInventoryItems.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-2.5"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                    {item.label}
                                </span>
                                <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                                    item.stockLevel === 'empty' ? "bg-[#B8A6D9]/10 text-[#B8A6D9]" : "bg-[#E8B4A0]/10 text-[#C08A70]"
                                )}>
                                    {item.stockLevel === 'empty' ? 'なし' : '少ない'}
                                </span>
                            </div>
                            <button
                                onClick={item.onAction}
                                className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#E8B4A0]/10 text-[#C08A70] hover:bg-[#E8B4A0]/20 active:bg-[#E8B4A0]/30 active:scale-95 transition-all"
                            >
                                補充済み
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
        </div>
    );
}
