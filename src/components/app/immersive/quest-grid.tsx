import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Cat, UtensilsCrossed, Droplet, Trash2, Scissors, Sparkles, Pill, PenLine, Heart, MessageCircle, AlertCircle, Circle } from 'lucide-react';
import { useCareData } from '@/hooks/use-care-data';
import { useAppState } from '@/store/app-store';
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";
import { CelebrationOverlay, getRandomReaction } from '@/components/ui/celebration-overlay';
import { getFullImageUrl } from '@/lib/utils';

interface QuestGridProps {
    className?: string;
    style?: React.CSSProperties;
    onTaskComplete?: () => void;
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

export function QuestGrid({ className, style, onTaskComplete }: QuestGridProps) {
    const { careItems, addCareLog, awardForCare, activeCatId } = useCareData();
    const { cats } = useAppState();
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [celebration, setCelebration] = useState<{
        active: boolean;
        taskId: string;
        message: string;
        tapPosition: { x: number; y: number };
    } | null>(null);

    // Collect all cat photos for random backgrounds
    const allCatPhotos = useMemo(() => {
        const photos: string[] = [];
        cats.forEach(cat => {
            if (cat.images && cat.images.length > 0) {
                cat.images.forEach(img => {
                    if (img.storagePath) photos.push(img.storagePath);
                });
            }
        });
        return photos;
    }, [cats]);

    // Sync pendingIds with careLogs to handle reactive updates (like Undo)
    const { careLogs } = useCareData();
    React.useEffect(() => {
        // When careLogs change, it might mean an undo happened.
        // We can safely clear pendingIds because the final source of truth is the memoized questItems
        // which will re-calculate based on the latest careLogs.
        setPendingIds(new Set());
    }, [careLogs]);

    // Filter only pending items
    const questItems = careItems.filter(item => !item.done && !pendingIds.has(item.id));

    // Assign stable random photos to each quest item
    const questPhotos = useMemo(() => {
        const photoMap: Record<string, string | undefined> = {};
        questItems.forEach((item, index) => {
            if (allCatPhotos.length > 0) {
                // Use item id hash for stable but random-looking assignment
                const hash = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const storagePath = allCatPhotos[(hash + index) % allCatPhotos.length];
                // Convert storage path to full URL
                photoMap[item.id] = getFullImageUrl(storagePath);
            }
        });
        return photoMap;
    }, [questItems, allCatPhotos]);

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedTaskRef = useRef<string | null>(null);

    const handlePhotoClick = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        selectedTaskRef.current = taskId;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const taskId = selectedTaskRef.current;
        if (!file || !taskId) return;

        const item = careItems.find(i => i.id === taskId);
        if (!item) return;

        // Commit with photo
        await commitTask(item, [file]);

        // Reset
        e.target.value = '';
        selectedTaskRef.current = null;
    };

    const commitTask = async (item: any, photos: File[] = []) => {
        setPendingIds(prev => new Set(prev).add(item.id));
        triggerFeedback('success');

        const targetId = (item as any).actionId || item.id;
        const result = await addCareLog(targetId, item.perCat ? (activeCatId ?? undefined) : undefined, undefined, photos);

        if (result && result.error) {
            toast.error("記録できませんでした");
            setPendingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        } else {
            // Success
            // Check for Celebration (Last task?)
            const remaining = questItems.length - 1; // We just removed one locally
            if (remaining === 0) {
                const reactionMessage = getRandomReaction(item.defId || item.id);
                // Center position for simplicity or pass click event
                const tapPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                setCelebration({
                    active: true,
                    taskId: item.id,
                    message: reactionMessage,
                    tapPosition
                });
                sounds.celebrate();
            } else {
                sounds.success();
            }

            awardForCare(item.perCat ? (activeCatId ?? undefined) : undefined, undefined, true);

            if (onTaskComplete) onTaskComplete();

            // Wait animation then finalize
            setTimeout(() => {
                // No need to remove from pendingIds if we rely on parent re-render excludes done items
                // But local exclusion relies on pendingIds until parent updates
            }, 800);
        }
    };

    const triggerFeedback = (type: 'light' | 'medium' | 'success') => {
        try {
            if (type === 'light') haptics.impactLight();
            if (type === 'medium') haptics.impactMedium();
            if (type === 'success') haptics.success();
        } catch (e) { }
    };

    if (questItems.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center py-12 text-white/30 space-y-4 ${className}`} style={style}>
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Check className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm font-bold">全てのおねがい完了！</p>
                <p className="text-xs">猫ちゃんは満足しています✨</p>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-2 gap-3 p-1 ${className}`} style={style}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
            />

            <AnimatePresence mode="popLayout">
                {questItems.map(item => {
                    // Resolve Icon Component
                    // item.icon might be "UtensilsCrossed", "Trash2" etc.
                    const iconName = item.icon || 'Sparkles';
                    const IconComponent = ICON_MAP[iconName] || Sparkles;
                    const bgPhoto = questPhotos[item.id];

                    return (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, y: -50 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-lg group"
                        >
                            {/* Photo Background */}
                            {bgPhoto ? (
                                <img
                                    src={bgPhoto}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt=""
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3a3a3a] to-[#2a2a2a]" />
                            )}

                            {/* Dark Overlay for Readability */}
                            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                            {/* Top Metadata Row */}
                            {/* Simplified Header: Just Camera or Priority */}
                            <div className="absolute top-2 right-2 z-10 flex gap-2">
                                {/* Camera Button (Secondary Action) */}
                                <button
                                    onClick={(e) => handlePhotoClick(e, item.id)}
                                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors border border-white/20 active:scale-90 shadow-lg"
                                    title="写真を撮って記録"
                                >
                                    <Camera className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Primary Action Area: Bottom Bar + Icon Badge */}
                            <button
                                onClick={() => commitTask(item)}
                                className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 flex items-end gap-3 text-left group/btn transition-colors hover:from-black/100"
                            >
                                {/* Task Icon Badge (Interactive Feel) */}
                                <div className="shrink-0 w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl group-active/btn:scale-90 transition-transform">
                                    <IconComponent size={20} strokeWidth={2} />
                                </div>

                                <div className="min-w-0 flex-1 pb-0.5">
                                    <div className="text-[12px] font-bold text-white drop-shadow-md truncate leading-tight flex items-center gap-1.5">
                                        {item.label}
                                        <div className="w-4 h-4 rounded-full bg-[#7CAA8E] flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                        </div>
                                    </div>
                                    {item.subLabel ? (
                                        <div className="text-[9px] text-white/80 truncate drop-shadow-sm mt-1 font-medium">
                                            {item.subLabel}
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-white/60 italic drop-shadow-sm mt-1">
                                            タップでお世話完了
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Priority Badge (Floating) */}
                            {item.priority === 'high' && (
                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-red-500/80 backdrop-blur-sm border border-white/20 text-[8px] font-bold text-white animate-pulse shadow-lg flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-white" />
                                    急ぎ
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </AnimatePresence>

            {/* Celebration Overlay */}
            {celebration && (
                <CelebrationOverlay
                    isActive={celebration.active}
                    onComplete={() => setCelebration(null)}
                    tapPosition={celebration.tapPosition}
                    catAvatar={cats.find(c => c.id === activeCatId)?.avatar}
                    catName={cats.find(c => c.id === activeCatId)?.name || 'ねこ'}
                    reactionMessage={celebration.message}
                />
            )}
        </div>
    );
}
