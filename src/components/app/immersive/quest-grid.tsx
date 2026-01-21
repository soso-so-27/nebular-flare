import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Cat, UtensilsCrossed, Droplet, Trash2, Scissors, Sparkles, Pill, PenLine, Heart, MessageCircle, AlertCircle, Circle, Plus, X } from 'lucide-react';
import { useCareData } from '@/hooks/use-care-data';
import { useAdhocTasks } from '@/hooks/use-adhoc-tasks';
import { useAppState } from '@/store/app-store';
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";
import { CelebrationOverlay, getRandomReaction } from '@/components/ui/celebration-overlay';
import { getFullImageUrl } from '@/lib/utils';
import { toCatPerspective } from '@/lib/cat-speech';

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

    // Ad-hoc tasks (Supabase-backed)
    const { pendingTasks: adhocTasks, addAdhocTask, completeAdhocTask } = useAdhocTasks();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

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
                            onClick={() => commitTask(item)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handlePhotoClick(e as any, item.id);
                            }}
                            className="aspect-[4/3] relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.96] transition-all duration-100 border border-white/10 shadow-xl hover:shadow-2xl hover:border-white/20"
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
                            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                            {/* Inner Highlight (Card Effect) */}
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />

                            {/* Icon Badge (Top Left) */}
                            <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 shadow-lg">
                                <IconComponent size={18} strokeWidth={2} />
                            </div>

                            {/* Bottom Label */}
                            <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
                                <div className="text-[13px] font-bold text-white drop-shadow-lg truncate leading-tight">
                                    {item.label}
                                </div>
                                {item.subLabel && (
                                    <div className="text-[10px] text-white/60 truncate drop-shadow-sm mt-0.5">
                                        {item.subLabel}
                                    </div>
                                )}
                            </div>

                            {/* Priority Badge (Floating) */}
                            {item.priority === 'high' && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-red-500/80 backdrop-blur-sm border border-white/20 text-[8px] font-bold text-white animate-pulse shadow-lg flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-white" />
                                    急ぎ
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </AnimatePresence>

            {/* Ad-hoc Tasks */}
            <AnimatePresence mode="popLayout">
                {adhocTasks.map((task, idx) => {
                    // Assign photo background like regular quest items
                    const bgPhoto = allCatPhotos.length > 0
                        ? getFullImageUrl(allCatPhotos[(task.id.charCodeAt(0) + idx) % allCatPhotos.length])
                        : undefined;

                    return (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, y: -50 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            onClick={async () => {
                                triggerFeedback('success');
                                sounds.success();
                                await completeAdhocTask(task.id);
                                // Also record in care_logs for history
                                await addCareLog(`adhoc:${task.label}`, null, task.label);
                            }}
                            className="aspect-[4/3] relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.96] transition-all duration-100 border border-dashed border-white/20 shadow-xl"
                        >
                            {/* Photo Background */}
                            {bgPhoto ? (
                                <img src={bgPhoto} className="absolute inset-0 w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3a3a3a] to-[#2a2a2a]" />
                            )}
                            {/* Dark Overlay */}
                            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
                            {/* Icon Badge */}
                            <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 shadow-lg">
                                <Sparkles size={18} strokeWidth={2} />
                            </div>
                            {/* Bottom Label */}
                            <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
                                <div className="text-[13px] font-bold text-white drop-shadow-lg truncate leading-tight">
                                    {task.label}
                                </div>
                                <div className="text-[10px] text-white/60 mt-0.5">追加タスク</div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Add Task Card */}
            <motion.div
                layout
                onClick={() => setShowAddModal(true)}
                className="aspect-[4/3] relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.96] transition-all duration-100 border border-dashed border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2"
            >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white/50" />
                </div>
                <span className="text-[11px] text-white/40 font-medium">追加のおねがい</span>
            </motion.div>

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

            {/* Add Task Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#2A2A30] rounded-2xl p-4 w-full max-w-xs border border-white/10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">追加のおねがいだにゃ</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <X className="w-4 h-4 text-white/50" />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                placeholder="例: 病院に電話する"
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-peach/50"
                                autoFocus
                            />
                            <button
                                onClick={async () => {
                                    if (newTaskName.trim()) {
                                        const catLabel = toCatPerspective(newTaskName.trim());
                                        await addAdhocTask(catLabel);
                                        setNewTaskName('');
                                        setShowAddModal(false);
                                        toast.success('追加しました');
                                    }
                                }}
                                disabled={!newTaskName.trim()}
                                className="w-full mt-3 py-2.5 rounded-xl bg-brand-peach text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-peach/80 transition-colors"
                            >
                                追加
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
