import React, { useState, useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, X, Plus, Heart, Menu, Check, MessageSquarePlus, Save, MessageCircle, Camera } from "lucide-react";
import { getCatchUpItems } from "@/lib/utils-catchup";
import { getToday } from "@/lib/date-utils";
import { getAdjustedDateString } from "@/lib/utils-date";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { ObservationEditor } from "./observation-editor";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
    contrastMode: 'light' | 'dark';
    placement?: 'fixed-bottom-right' | 'bottom-center';
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity, contrastMode, placement = 'fixed-bottom-right' }: MagicBubbleProps) {
    const [expandedSection, setExpandedSection] = useState<'care' | 'observation' | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    const [selectedValue, setSelectedValue] = useState("");
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, addCareLog, addObservation, inventory, noticeLogs } = useAppState();

    const isLight = contrastMode === 'light';

    // Helper for interactive feedback
    // Removed await to prevent UI blocking if audio fails
    const triggerFeedback = (type: 'light' | 'medium' | 'success' = 'light') => {
        try {
            if (type === 'light') {
                haptics.impactLight();
                sounds.click().catch(e => console.warn(e));
            } else if (type === 'medium') {
                haptics.impactMedium();
                sounds.pop().catch(e => console.warn(e));
            } else if (type === 'success') {
                haptics.success();
                sounds.success().catch(e => console.warn(e));
            }
        } catch (e) {
            console.warn('Feedback error:', e);
        }
    };


    // --- Use getCatchUpItems for consistent care task calculation ---
    const { dayStartHour } = settings;

    // Calculate business date (same as BubblePickupList)
    const catchUpData = useMemo(() => {
        const now = new Date();
        const businessDate = new Date(now);
        if (now.getHours() < dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }
        const todayStr = businessDate.toISOString().split('T')[0];

        return getCatchUpItems({
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
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, dayStartHour]);

    // Filter care tasks from catchUpData
    const careItems = useMemo(() => {
        return catchUpData.allItems
            .filter(item => item.type === 'task')
            .map(item => ({
                id: item.id,
                actionId: item.actionId,
                defId: item.payload?.id || item.id,
                label: item.title,
                perCat: item.payload?.perCat,
                done: false, // Items in catchUp are NOT done
                slot: item.payload?.slot,
                catId: item.catId
            }));
    }, [catchUpData]);

    // Calculate total care tasks (done + pending)
    // We need to count both completed and pending tasks
    const { totalCareTasks, completedCareTasks } = useMemo(() => {
        if (!careTaskDefs) return { totalCareTasks: 0, completedCareTasks: 0 };

        const now = new Date();
        const currentHour = now.getHours();
        const businessDate = new Date(now);
        if (currentHour < dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }
        const todayStr = businessDate.toISOString().split('T')[0];

        // Calculate current slot
        const getCurrentMealSlot = (hour: number) => {
            if (hour >= 5 && hour < 11) return 'morning';
            if (hour >= 11 && hour < 15) return 'noon';
            if (hour >= 15 && hour < 20) return 'evening';
            return 'night';
        };
        const currentSlot = getCurrentMealSlot(currentHour);
        const slotOrder = ['morning', 'noon', 'evening', 'night'];
        const currentSlotIndex = slotOrder.indexOf(currentSlot);

        let total = 0;
        let completed = 0;

        careTaskDefs.filter(def => def.enabled).forEach(def => {
            const slots = def.mealSlots || (def.frequency === 'as-needed' ? [] :
                def.frequency === 'twice-daily' ? ['morning', 'evening'] :
                    def.frequency === 'three-times-daily' ? ['morning', 'noon', 'evening'] :
                        def.frequency === 'four-times-daily' ? ['morning', 'noon', 'evening', 'night'] :
                            ['morning']);

            if (slots.length === 0) {
                // as-needed or no slots
                total += 1;
                const hasLog = careLogs?.find(log => log.type === def.id);
                if (hasLog) completed += 1;
                return;
            }

            // Only count slots up to current time
            for (const slot of slots) {
                const slotIndex = slotOrder.indexOf(slot as string);
                if (slotIndex <= currentSlotIndex) {
                    total += 1;
                    const typeToCheck = `${def.id}:${slot}`;
                    const hasLog = careLogs?.find(log => log.type === typeToCheck);
                    if (hasLog) completed += 1;
                }
            }
        });

        return { totalCareTasks: total, completedCareTasks: completed };
    }, [careTaskDefs, careLogs, dayStartHour]);

    const progress = totalCareTasks > 0 ? completedCareTasks / totalCareTasks : 1;

    // Calculate Observation Progress (for active cat) - Using persisted observations from Supabase
    const observationProgress = useMemo(() => {
        const enabledNotices = noticeDefs.filter(n => n.enabled !== false && n.kind === 'notice');
        if (enabledNotices.length === 0) return { done: 0, total: 0, progress: 1 };

        // Filter observations for today and active cat
        // observations already filtered by today in useTodayHouseholdObservations hook
        const catObservations = observations.filter(o => o.cat_id === activeCatId);

        let doneCount = 0;
        enabledNotices.forEach(notice => {
            // Check if there's an observation for this notice type
            const hasObservation = catObservations.some(o => o.type === notice.id);
            if (hasObservation) {
                doneCount++;
            }
        });

        const total = enabledNotices.length;
        return {
            done: doneCount,
            total,
            progress: total > 0 ? doneCount / total : 1
        };
    }, [noticeDefs, observations, activeCatId]);

    // Use catchUpData for pickup items (already calculated above)
    const activeCount = catsLoading ? 0 : catchUpData.items.length;

    // Progress Ring Logic
    const radius = 22; // Smaller for the side indicator
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress * circumference);

    // Get Active Cat for Avatar
    const activeCat = cats.find(c => c.id === activeCatId);

    // Dynamic Styles based on Contrast Mode
    // Enhanced styles with stronger shadows for visibility on any background
    const styles = {
        // Text always uses dual shadow (dark + light outline) for maximum readability
        text: 'text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] [text-shadow:0_0_4px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.8)]',
        textSub: 'text-white/80 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]',
        ringTrack: 'rgba(0,0,0,0.3)',
        careColor: progress >= 1 ? '#10b981' : '#fbbf24',
        obsColor: observationProgress.progress >= 1 ? '#10b981' : '#38bdf8',
        iconFill: 'fill-white',
        iconStroke: 'text-white',
        glassBg: 'bg-black/30 border-white/10 backdrop-blur-sm',
        glassHover: 'hover:bg-black/40',
        buttonBg: 'bg-black/30 backdrop-blur-sm',
        buttonText: 'text-white',
        // Strong icon shadow for visibility
        iconShadow: 'drop-shadow-[0_0_6px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
    };

    return (
        <>
            {/* 
              === BACKDROP for Expanded HUD === 
            */}
            <AnimatePresence>
                {expandedSection && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 pointer-events-auto"
                        onClick={() => {
                            triggerFeedback('light');
                            setExpandedSection(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* 
              === FLOATING HUD SATELLITES === 
              Card mode: Single consolidated icon (expands care list in-place)
              Other modes: Vertical stack with expandable rings
            */}
            {placement === 'bottom-center' ? (
                /* === CARD MODE: Consolidated Icon with Expandable List === */
                <div className="absolute top-8 left-6 z-40 pointer-events-auto flex flex-col items-start gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            setExpandedSection(expandedSection === 'care' ? null : 'care');
                        }}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-2xl backdrop-blur-md border shadow-sm transition-colors ${isLight
                            ? 'bg-white/40 border-black/5 hover:bg-white/60'
                            : 'bg-black/20 border-white/10 hover:bg-black/40'
                            }`}
                    >
                        {/* Combined Progress Ring */}
                        <div className="relative w-10 h-10">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                <motion.circle
                                    cx="30" cy="30" r={26} fill="none" stroke={styles.careColor} strokeWidth="4" strokeLinecap="round"
                                    initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 26) - (((progress + observationProgress.progress) / 2) * (2 * Math.PI * 26)) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                />
                            </svg>
                            <div className={`absolute inset-0 flex items-center justify-center ${styles.text}`}>
                                <Heart className="w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                            </div>
                        </div>
                        {/* Combined Progress Text */}
                        <div className="flex items-baseline gap-0.5">
                            <span className={`text-lg font-bold ${styles.text}`}>
                                {Math.round(((progress + observationProgress.progress) / 2) * 100)}
                            </span>
                            <span className={`text-xs font-medium ${styles.text}`}>%</span>
                        </div>
                    </motion.button>
                    {/* Expandable Consolidated List for Card Mode (Care + Observation) */}
                    <AnimatePresence>
                        {expandedSection === 'care' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className={`ml-2 pl-4 border-l-2 ${isLight ? 'border-black/20' : 'border-white/20'} overflow-hidden`}
                            >
                                <div
                                    className="py-2 space-y-4 w-[240px] max-h-[75vh] overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                                >
                                    {/* Care Section - Same as other modes */}
                                    {careItems.length > 0 && (
                                        <div className="space-y-2">
                                            <div className={`flex items-center gap-2 text-xs font-bold ${styles.text}`}>
                                                <Heart className="w-3 h-3" />
                                                <span>お世話</span>
                                            </div>
                                            {careItems.map(item => (
                                                <motion.button
                                                    key={item.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        triggerFeedback('success');
                                                        if (!item.done && addCareLog) {
                                                            const targetId = (item as any).actionId || item.id;
                                                            const result = await addCareLog(targetId, item.perCat ? activeCatId : undefined);
                                                            if (result && result.error) {
                                                                toast.error(result.error.message || "記録できませんでした");
                                                            }
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 w-full text-left p-2 rounded-xl transition-all ${item.done ? 'opacity-50' : `hover:bg-white/10`}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500 border-emerald-500' : (isLight ? 'border-black/60' : 'border-white/60')}`}>
                                                        {item.done && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className={`text-sm font-medium truncate ${styles.text}`}>{item.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Observation Section - Same logic as other modes with ObservationEditor */}
                                    {noticeDefs.filter(n => n.enabled !== false && n.kind === 'notice').length > 0 && (
                                        <div className="space-y-3">
                                            <div className={`flex items-center gap-2 text-xs font-bold ${styles.text}`}>
                                                <Cat className="w-3 h-3" />
                                                <span>猫の様子</span>
                                            </div>
                                            {noticeDefs
                                                .filter(def => def.enabled !== false && def.kind === 'notice')
                                                .sort((a, b) => {
                                                    const isDoneA = !!observations.find(o => o.type === a.id && o.cat_id === activeCatId);
                                                    const isDoneB = !!observations.find(o => o.type === b.id && o.cat_id === activeCatId);
                                                    if (isDoneA === isDoneB) return 0;
                                                    return isDoneA ? 1 : -1;
                                                })
                                                .map(notice => {
                                                    const existingObs = observations.find(o => o.type === notice.id && o.cat_id === activeCatId);
                                                    const isDone = !!existingObs;
                                                    const choices = notice.choices || ['いつも通り', '気になる'];

                                                    if (editingNoteId === notice.id) {
                                                        return (
                                                            <ObservationEditor
                                                                key={notice.id}
                                                                notice={notice}
                                                                choices={choices}
                                                                existingObs={existingObs}
                                                                styles={styles}
                                                                onCancel={() => {
                                                                    triggerFeedback('light');
                                                                    setEditingNoteId(null);
                                                                    setNoteText("");
                                                                    setSelectedValue("");
                                                                }}
                                                                onSave={async (val, text, files) => {
                                                                    triggerFeedback('success');
                                                                    if (addObservation) {
                                                                        await addObservation(activeCatId, notice.id, val, text, files);
                                                                    }
                                                                    setEditingNoteId(null);
                                                                }}
                                                                triggerFeedback={triggerFeedback}
                                                            />
                                                        );
                                                    }

                                                    // Reuse variables for Card Mode
                                                    const inputType = notice.inputType || 'ok-notice';

                                                    // Use the rich UI structure like other modes
                                                    return (
                                                        <div key={notice.id} className="flex flex-col gap-1.5 group relative p-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-sm font-medium drop-shadow-md ${styles.text}`}>{notice.title}</span>
                                                                {/* Memo Trigger Button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        triggerFeedback('medium');
                                                                        setEditingNoteId(notice.id);
                                                                        // Default value logic
                                                                        if (existingObs) {
                                                                            setSelectedValue(existingObs.value);
                                                                            setNoteText(existingObs.notes || "");
                                                                        } else {
                                                                            setSelectedValue(choices[0] || '記録');
                                                                            setNoteText("");
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-white/40 hover:text-white transition-colors"
                                                                    title="詳細・メモを入力"
                                                                >
                                                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            {!isDone ? (
                                                                <div className="flex gap-1.5 flex-wrap">
                                                                    {inputType === 'photo' ? (
                                                                        <motion.button
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                triggerFeedback('medium');
                                                                                setEditingNoteId(notice.id);
                                                                                setSelectedValue(choices[0] || '撮影した');
                                                                            }}
                                                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border active:scale-95 transition-all ${styles.buttonBg} ${styles.buttonText} border-white/20 hover:bg-white/30`}
                                                                        >
                                                                            <Camera className="w-4 h-4" />
                                                                            <span>写真を撮る</span>
                                                                        </motion.button>
                                                                    ) : (
                                                                        (inputType === 'choice' || inputType === 'count' ? choices : choices.slice(0, 2)).map((choice, idx) => (
                                                                            <motion.button
                                                                                key={choice}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    triggerFeedback('success');
                                                                                    if (addObservation) {
                                                                                        await addObservation(activeCatId, notice.id, choice);
                                                                                    }
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border active:scale-95 transition-all ${idx === 0
                                                                                    ? `${styles.buttonBg} ${styles.buttonText} border-white/20 hover:bg-white/30`
                                                                                    : (isLight ? 'bg-black/5 border-black/10 text-black/70 hover:bg-black/10' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30')
                                                                                    }`}
                                                                            >
                                                                                {choice}
                                                                            </motion.button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                                                    <Check className="w-3 h-3" />
                                                                    <span>{existingObs?.value || '記録済み'}</span>
                                                                    {existingObs?.notes && <MessageCircle className="w-3 h-3 text-white/50 ml-1.5" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                /* === OTHER MODES: Vertical Stack with Expandable Rings === */
                <div className="absolute top-8 left-6 z-40 flex flex-col gap-6 items-start pointer-events-auto max-h-[85vh] overflow-y-auto no-scrollbar pb-20 pr-4">

                    {/* CARE RING */}
                    <div className="flex flex-col gap-2">
                        <motion.div
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerFeedback('medium');
                                setExpandedSection(expandedSection === 'care' ? null : 'care');
                            }}
                        >
                            {/* Ring Container */}
                            <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                                <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                    <motion.circle
                                        cx="30" cy="30" r={26} fill="none" stroke={styles.careColor} strokeWidth="4" strokeLinecap="round"
                                        initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                        animate={{ strokeDashoffset: (2 * Math.PI * 26) - (progress * (2 * Math.PI * 26)) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                    />
                                </svg>
                                <div className={`absolute inset-0 flex items-center justify-center ${styles.text}`}>
                                    <Heart className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'care' ? styles.iconFill : ''}`} />
                                </div>
                            </div>

                            {/* Text Data */}
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold tracking-wider ${styles.text}`}>
                                    お世話
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl font-light tracking-tight ${styles.text}`}>
                                        {Math.round(progress * 100)}
                                    </span>
                                    <span className={`text-xs font-medium ${styles.text}`}>%</span>
                                </div>
                            </div>
                        </motion.div>
                        {/* Expanded Care List - Flows Downwards (Natural Accordion) */}
                        <AnimatePresence>
                            {expandedSection === 'care' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`ml-2 pl-4 border-l-2 ${isLight ? 'border-black/20' : 'border-white/20'} overflow-hidden`}
                                >
                                    <div className="py-2 space-y-3 w-[200px]">
                                        {careItems.map(item => (
                                            <motion.button
                                                key={item.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    triggerFeedback('success'); // Good job for completing task

                                                    if (!item.done && addCareLog) {
                                                        const targetId = (item as any).actionId || item.id;
                                                        const result = await addCareLog(targetId, item.perCat ? activeCatId : undefined);
                                                        if (result && result.error) {
                                                            console.error("Care log error:", result.error);
                                                            toast.error(result.error.message || "記録できませんでした");
                                                        }
                                                    }
                                                }}
                                                className={`flex items-center gap-3 w-full text-left transition-all ${item.done ? 'opacity-50' : `hover:bg-white/10 rounded-lg p-1 -m-1`}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500 border-emerald-500' : (isLight ? 'border-black/60' : 'border-white/60')}`}>
                                                    {item.done && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={`text-sm font-medium truncate ${styles.text}`}>{item.label}</span>
                                            </motion.button>
                                        ))}

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* OBSERVATION RING - Explicitly hidden in Card Mode (bottom-center) */}
                    {(placement as string) !== 'bottom-center' && (
                        <div className="flex flex-col gap-2">
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={() => {
                                    triggerFeedback('medium');
                                    setExpandedSection(expandedSection === 'observation' ? null : 'observation')
                                }}
                            >
                                {/* Ring Container */}
                                <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                        <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                        <motion.circle
                                            cx="30" cy="30" r={26} fill="none" stroke={styles.obsColor} strokeWidth="4" strokeLinecap="round"
                                            initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                            animate={{ strokeDashoffset: (2 * Math.PI * 26) - (observationProgress.progress * (2 * Math.PI * 26)) }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                        />
                                    </svg>
                                    <div className={`absolute inset-0 flex items-center justify-center ${styles.text}`}>
                                        <Cat className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'observation' ? styles.iconFill : ''}`} />
                                    </div>
                                </div>

                                {/* Text Data */}
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold tracking-wider ${styles.text}`}>
                                        猫の様子
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-xl font-light tracking-tight ${styles.text}`}>
                                            {Math.round(observationProgress.progress * 100)}
                                        </span>
                                        <span className={`text-xs font-medium ${styles.text}`}>%</span>
                                    </div>
                                </div>
                            </motion.div>
                            {/* Expanded Obs List - Flows Downwards */}
                            <AnimatePresence>
                                {expandedSection === 'observation' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`ml-2 pl-4 border-l-2 ${isLight ? 'border-black/20' : 'border-white/20'} overflow-hidden`}
                                    >
                                        <div className="py-2 space-y-4 w-[220px]">
                                            {/* inputType-aware Observation List */}
                                            {noticeDefs
                                                .filter(def => def.enabled !== false && def.kind === 'notice')
                                                .sort((a, b) => {
                                                    const isDoneA = !!observations.find(o => o.type === a.id && o.cat_id === activeCatId);
                                                    const isDoneB = !!observations.find(o => o.type === b.id && o.cat_id === activeCatId);
                                                    if (isDoneA === isDoneB) return 0;
                                                    return isDoneA ? 1 : -1;
                                                })
                                                .map(notice => {
                                                    const existingObs = observations.find(o => o.type === notice.id && o.cat_id === activeCatId);
                                                    const isDone = !!existingObs;
                                                    const choices = notice.choices || ['いつも通り', '気になる'];
                                                    const inputType = notice.inputType || 'ok-notice';

                                                    const isEditing = editingNoteId === notice.id;

                                                    if (isEditing) {
                                                        return (
                                                            <ObservationEditor
                                                                key={notice.id}
                                                                notice={notice}
                                                                choices={choices}
                                                                existingObs={existingObs}
                                                                styles={styles}
                                                                onCancel={() => {
                                                                    triggerFeedback('light');
                                                                    setEditingNoteId(null);
                                                                    setNoteText("");
                                                                    setSelectedValue("");
                                                                }}
                                                                onSave={async (val, text, files) => {
                                                                    triggerFeedback('success');
                                                                    if (addObservation) {
                                                                        await addObservation(activeCatId, notice.id, val, text, files);
                                                                    }
                                                                    setEditingNoteId(null);
                                                                }}
                                                                triggerFeedback={triggerFeedback}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <div key={notice.id} className="flex flex-col gap-1.5 group relative">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-sm font-medium drop-shadow-md ${styles.text}`}>{notice.title}</span>
                                                                {/* Memo Trigger Button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        triggerFeedback('medium');
                                                                        setEditingNoteId(notice.id);
                                                                        // Default value logic
                                                                        if (existingObs) {
                                                                            setSelectedValue(existingObs.value);
                                                                            setNoteText(existingObs.notes || "");
                                                                        } else {
                                                                            // For photo type, default is '撮影した' or similar from choices[0]
                                                                            setSelectedValue(choices[0] || '記録');
                                                                            setNoteText("");
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-white/40 hover:text-white transition-colors"
                                                                    title="詳細・メモを入力"
                                                                >
                                                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            {!isDone ? (
                                                                <div className="flex gap-1.5 flex-wrap">
                                                                    {inputType === 'photo' ? (
                                                                        <motion.button
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                triggerFeedback('medium');
                                                                                // Directly open editor for photo type
                                                                                setEditingNoteId(notice.id);
                                                                                setSelectedValue(choices[0] || '撮影した');
                                                                            }}
                                                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border active:scale-95 transition-all ${styles.buttonBg} ${styles.buttonText} border-white/20 hover:bg-white/30`}
                                                                        >
                                                                            <Camera className="w-4 h-4" />
                                                                            <span>写真を撮る</span>
                                                                        </motion.button>
                                                                    ) : (
                                                                        (inputType === 'choice' || inputType === 'count' ? choices : choices.slice(0, 2)).map((choice, idx) => (
                                                                            <motion.button
                                                                                key={choice}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    triggerFeedback('success');
                                                                                    if (addObservation) {
                                                                                        await addObservation(activeCatId, notice.id, choice);
                                                                                    }
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border active:scale-95 transition-all ${idx === 0
                                                                                    ? `${styles.buttonBg} ${styles.buttonText} border-white/20 hover:bg-white/30`
                                                                                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30'
                                                                                    }`}
                                                                            >
                                                                                {choice}
                                                                            </motion.button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                                                    <Check className="w-3 h-3" />
                                                                    <span>{existingObs?.value || '記録済み'}</span>
                                                                    {existingObs?.notes && <MessageCircle className="w-3 h-3 text-white/50 ml-1.5" />}
                                                                    {/* Show image indicator if present (we don't have images in existingObs type here yet, need fetch update, but for now just text is fine or check notes) */}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}

                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}


            {/* 
              === SOCIAL RIGHT STACK (Right-Edge Actions) === 
              Card mode: Horizontal layout
              Other modes: Vertical layout
            */}
            <div className={`fixed right-4 bottom-10 z-50 flex items-center pointer-events-none ${placement === 'bottom-center' ? 'flex-row gap-4' : 'flex-col gap-5'}`}>

                {/* Pickup Widget (Notification Badge Style) */}
                <div className="pointer-events-auto">
                    <AnimatePresence>
                        {activeCount > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                whileTap={{ scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    onOpenPickup();
                                }}
                                className="relative group"
                            >
                                {/* Main Icon Ring - Double Layer */}
                                <div className={`w-14 h-14 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-2xl transition-all ${styles.glassBg} ${styles.glassHover}`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-inner ring-2 ring-black/10">
                                        <span className="text-white font-bold text-sm font-sans drop-shadow-md">{activeCount}</span>
                                    </div>
                                </div>

                                {/* Label Tooltip (Left side) */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                                    <span className="text-xs text-white font-bold tracking-wide">{catchUpData.items[0]?.title || 'Pickup'}</span>
                                    {/* Small arrow */}
                                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black/60 border-t border-r border-white/10 transform rotate-45"></div>
                                </div>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Menu Trigger (Unified Design) */}
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            onOpenCare();
                        }}
                        className={`group relative w-14 h-14 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-2xl transition-all ${styles.glassBg} ${styles.glassHover}`}
                    >
                        {/* Inner Circle (For stylistic unity with Pickup) */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner transition-colors ${isLight ? 'bg-black/5 group-hover:bg-black/10' : 'bg-white/10 group-hover:bg-white/10'}`}>
                            <LayoutGrid className={`w-5 h-5 drop-shadow-md opacity-90 group-hover:opacity-100 ${styles.iconStroke}`} />
                        </div>
                    </motion.button>
                </div>

            </div>
        </>
    );
}
