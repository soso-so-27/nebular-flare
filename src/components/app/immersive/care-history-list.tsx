import { getFullImageUrl } from '@/lib/utils';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/store/app-store';
import { useCareData } from '@/hooks/use-care-logic';
import { useAuth } from '@/providers/auth-provider';
import { Cat, Check, Clock, ImageIcon, UtensilsCrossed, Droplet, Trash2, Scissors, Sparkles, Pill, PenLine, Heart, MessageCircle, AlertCircle, Camera, Undo2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface CareHistoryListProps {
    className?: string;
    style?: React.CSSProperties;
    onOpenPhoto?: (url: string) => void;
}

const ICON_MAP: Record<string, any> = {
    'UtensilsCrossed': UtensilsCrossed,
    'Droplet': Droplet,
    'Trash2': Trash2,
    'Scissors': Scissors,
    'Sparkles': Sparkles,
    'Pill': Pill,
    'PenLine': PenLine,
    'Heart': Heart,
    'MessageCircle': MessageCircle,
    'AlertCircle': AlertCircle,
    'Camera': Camera
};

export function CareHistoryList({ className, style, onOpenPhoto }: CareHistoryListProps) {
    const { user: currentUser } = useAuth();
    const { cats, householdUsers } = useAppState();
    const { careLogs, deleteCareLog, careTaskDefs } = useCareData();

    const handleUndo = async (logId: string) => {
        const result = await deleteCareLog(logId);
        if (result && result.error) {
            toast.error("完了を取り消せませんでした");
        } else {
            toast.success("記録を取り消しました");
        }
    };

    // Filter relevant logs (tasks present in defs) and sort by time desc
    const historyItems = React.useMemo(() => {
        // Helper to infer slot from time
        const getSlotFromTime = (date: Date): string => {
            const hour = date.getHours();
            if (hour >= 5 && hour < 11) return 'morning';
            if (hour >= 11 && hour < 15) return 'noon';
            if (hour >= 15 && hour < 20) return 'evening';
            return 'night';
        };

        // Map logs to detailed info
        const items = careLogs.map((log: any) => {
            const def = careTaskDefs.find((d: any) => d.id === log.type || log.type.startsWith(d.id));
            const cat = cats.find((c: any) => c.id === log.cat_id || c.id === (def?.targetCatIds?.[0]));

            // Priority: Reactive Current User Metadata > Household Users Table
            let user = householdUsers.find((u: any) => u.id === log.done_by);
            if (currentUser && log.done_by === currentUser.id) {
                user = {
                    ...user,
                    display_name: currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || user?.display_name,
                    avatar_url: currentUser.user_metadata?.avatar_url || user?.avatar_url
                };
            }

            // Parse time
            const date = new Date(log.done_at || (log as any).at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Extract slot from log.type (e.g., "care_food:morning" -> "morning") or log.slot
            let slot: string | undefined = log.slot;
            if (!slot && log.type.includes(':')) {
                slot = log.type.split(':')[1];
            }
            // Fallback: infer slot from time for slot-based tasks
            if (!slot && def?.mealSlots && def.mealSlots.length > 0) {
                slot = getSlotFromTime(date);
            }

            // Build display title with slot info
            const slotLabel = slot ? (
                slot === 'morning' ? '朝' : slot === 'evening' ? '夕' : slot === 'noon' ? '昼' : '夜'
            ) : undefined;
            const displayTitle = slotLabel
                ? `${def?.title || log.type}（${slotLabel}）`
                : (def?.title || log.type);

            return {
                id: log.id,
                log,
                def,
                cat,
                user,
                timeStr,
                slot,
                displayTitle,
                timestamp: date.getTime()
            };
        }).sort((a: any, b: any) => b.timestamp - a.timestamp);

        return items;
    }, [careLogs, careTaskDefs, cats, householdUsers, currentUser]);

    if (historyItems.length === 0) {
        return (
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 text-white/30 text-xs italic ${className}`} style={style}>
                <Clock className="w-5 h-5 opacity-50" />
                <span>まだ履歴がありません</span>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`} style={style}>
            <div className="flex items-center gap-2 px-2 pb-1">
                <div className="w-1 h-3 rounded-full bg-brand-peach" />
                <span className="text-xs font-bold text-brand-peach">おねがいの記録</span>
            </div>

            <div className="space-y-2">
                <AnimatePresence initial={false}>
                    {historyItems.map((item: any) => {
                        const IconComponent = item.def?.icon && ICON_MAP[item.def.icon] ? ICON_MAP[item.def.icon] : Sparkles;

                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5"
                            >
                                {/* Time */}
                                <div className="text-[10px] font-mono text-white/40 w-9 shrink-0">
                                    {item.timeStr}
                                </div>

                                {/* Icon */}
                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-lg border border-white/10 shrink-0 text-white/70">
                                    <IconComponent className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-white/90 truncate">
                                            {item.displayTitle}
                                        </span>
                                        {/* Images Indicator */}
                                        {(item.log as any).images?.length > 0 && (
                                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10">
                                                <ImageIcon className="w-2.5 h-2.5 text-white/70" />
                                                <span className="text-[9px] text-white/70">{(item.log as any).images.length}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        {/* Cat Avatar (Small) */}
                                        {item.cat && (
                                            <div className="flex items-center gap-1">
                                                <img
                                                    src={getFullImageUrl(item.cat.avatar)}
                                                    alt={item.cat.name}
                                                    className="w-3.5 h-3.5 rounded-full border border-white/20 object-cover"
                                                />
                                                <span className="text-[10px] text-white/50">{item.cat.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Photo Thumbnails */}
                                    {(item.log as any).images?.length > 0 && (
                                        <div className="flex gap-1.5 mt-2 h-12 overflow-x-auto no-scrollbar pointer-events-auto">
                                            {(item.log as any).images.map((img: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onOpenPhoto) onOpenPhoto(getFullImageUrl(img));
                                                    }}
                                                    className="h-full aspect-square rounded-lg overflow-hidden border border-white/10 shrink-0 cursor-pointer active:scale-95 transition-transform"
                                                >
                                                    <img src={getFullImageUrl(img)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action Area: User + Toggle Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.user && (
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10" title={item.user.display_name}>
                                            <span className="text-[10px] font-bold text-white/60 tracking-wider">
                                                {item.user.display_name?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => item.id && handleUndo(item.id)}
                                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 active:scale-90 transition-all hover:bg-white/10 hover:text-white/60"
                                        title="完了を取り消す"
                                    >
                                        <RotateCcw size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
