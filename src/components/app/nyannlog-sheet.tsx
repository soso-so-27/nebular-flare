"use client";

import { getFullImageUrl } from '@/lib/utils';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from '@/store/app-store';
import { createClient } from '@/lib/supabase';
import { X, PenLine, MessageCircle, Camera, AlertCircle, ChevronRight, History, Heart, Star, Bookmark, ChevronDown, Cat, BookOpen, CalendarDays, Tag } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { ja } from "date-fns/locale";
import { ReactionBadges, ReactionBar } from './reaction-bar';
import { CareHistoryList } from './immersive/care-history-list';
import { QuestGrid } from './immersive/quest-grid';

// =====================================================
// Types
// =====================================================
type NyannlogSheetProps = {
    isOpen: boolean;
    onClose: () => void;
    onOpenNew: () => void;
    onSelectItem?: (id: string, type: string, photos: string[]) => void;
    onOpenCalendar?: () => void;
    initialTab?: 'events' | 'requests';
};

type NyannlogItem = {
    id: string;
    type: string;
    catId: string;
    catName: string;
    note: string;
    photos: string[];
    createdAt: string;
    createdBy?: string;
    userName?: string;
    updates?: any[]; // Thread/updates
    reactions?: any[]; // Reactions
    is_bookmarked?: boolean;
    health_category?: string;
    health_value?: string;
};

type FilterType = 'all' | 'photo' | 'chat' | 'bookmark' | 'health';

type GroupedLogs = {
    date: string;
    items: NyannlogItem[];
};

// =====================================================
// Component
// =====================================================
export function NyannlogSheet(props: NyannlogSheetProps) {
    const { isOpen, onClose, onOpenNew, onSelectItem } = props;
    const {
        incidents,
        cats,
        householdUsers,
        settings,
        currentUserId,
        toggleBookmark,
        addReaction,
        removeReaction
    } = useAppState();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'events' | 'requests'>(isOpen ? (props.initialTab || 'requests') : 'requests');

    // Sync tab when prop changes or re-opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(props.initialTab || 'requests');
        }
    }, [isOpen, props.initialTab]);

    const isIsland = settings.layoutType === 'v2-island';

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Scroll to top when filter or cat changes (newest is at top)
    useEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeFilter, selectedCatId, isOpen]);

    // 統合されたログ一覧（全インシデント + スタンドアロン写真）
    const groupedLogs = useMemo<GroupedLogs[]>(() => {
        const items: NyannlogItem[] = [];

        // 1. 全インシデントを追加
        if (incidents) {
            incidents.forEach(inc => {
                const cat = cats.find(c => c.id === inc.cat_id);
                const user = householdUsers.find((u: any) => u.id === inc.created_by);
                // Filter out photos that match cat avatar to avoid confusion
                const filteredPhotos = (inc.photos || []).filter((p: string) => {
                    const avatar = cat?.avatar || '';
                    return p !== avatar && !avatar.includes(p);
                });
                items.push({
                    id: inc.id,
                    type: inc.type,
                    catId: inc.cat_id,
                    catName: cat?.name || '不明',
                    note: inc.note || '',
                    photos: filteredPhotos,
                    createdAt: inc.created_at,
                    createdBy: inc.created_by,
                    userName: user?.display_name,
                    updates: inc.updates || [],
                    reactions: inc.reactions || [],
                    is_bookmarked: inc.is_bookmarked || false,
                    health_category: inc.health_category,
                    health_value: inc.health_value
                });
            });
        }

        // 2. インシデントに含まれていないスタンドアロン写真を追加
        const incidentPhotoPaths = new Set(items.flatMap(item => item.photos));

        cats.forEach(cat => {
            if (cat.images) {
                cat.images.forEach(img => {
                    if (!incidentPhotoPaths.has(img.storagePath)) {
                        items.push({
                            id: img.id,
                            type: 'photo_standalone',
                            catId: cat.id,
                            catName: cat.name,
                            note: img.memo || '',
                            photos: [img.storagePath],
                            createdAt: img.createdAt,
                            userName: undefined
                        });
                    }
                });
            }
        });

        // 3. Apply Filters
        const filteredItems = items.filter(item => {
            // Cat Filter
            if (selectedCatId && item.catId !== selectedCatId) return false;

            // Category Filter
            if (activeFilter === 'all') return true;
            if (activeFilter === 'photo') return item.photos.length > 0;
            if (activeFilter === 'chat') return ['worried', 'chat', 'concerned', 'troubled'].includes(item.type);
            if (activeFilter === 'bookmark') return item.is_bookmarked;
            if (activeFilter === 'health') return !!item.health_category;
            return true;
        });

        // Sort items by date descending (newest first)
        const sortedItems = filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Group by date
        const groups: Record<string, NyannlogItem[]> = {};
        sortedItems.forEach(item => {
            const date = new Date(item.createdAt);
            let dateKey = format(date, 'yyyy-MM-dd');
            if (isToday(date)) dateKey = '今日';
            else if (isYesterday(date)) dateKey = '昨日';
            else dateKey = format(date, 'M月d日(E)', { locale: ja });

            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });

        return Object.entries(groups).map(([date, items]) => ({ date, items }));
    }, [incidents, cats, householdUsers, activeFilter, selectedCatId]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'worried':
            case 'chat':
            case 'troubled':
            case 'concerned':
                return MessageCircle;
            case 'daily':
            case 'log':
                return PenLine;
            case 'good':
                return Heart;
            case 'photo_standalone':
                return Camera;
            case 'vomit':
            case 'diarrhea':
            case 'injury':
            case 'appetite':
            case 'energy':
            case 'toilet':
                return AlertCircle;
            default:
                return PenLine;
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'daily': '記録',
            'worried': '相談',
            'chat': '相談',
            'log': '記録',
            'concerned': '相談',
            'troubled': '相談',
            'good': '記録',
            'photo_standalone': '写真',
            'vomit': '相談',
            'diarrhea': '相談',
            'injury': '相談',
            'appetite': '相談',
            'energy': '相談',
            'toilet': '相談',
            'other': '記録'
        };
        return labels[type] || '記録';
    };




    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(e, info) => {
                            // Close if dragged down more than 100px or velocity is high
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                onClose();
                            }
                        }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`
                            bg-[#1E1E23]/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col w-full max-w-md overflow-hidden transition-all duration-300
                            ${isIsland
                                ? 'rounded-t-[32px] h-[92vh]'
                                : 'rounded-[32px] mb-4 h-[90vh]'}
                        `}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                            <div className="w-10 h-1 bg-white/30 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-3 border-b border-white/5 flex flex-col">
                            {/* Tab Switcher */}
                            {!isIsland && (
                                <div className="flex p-1 bg-white/5 rounded-xl relative">
                                    <motion.div
                                        className="absolute top-1 bottom-1 bg-white/10 rounded-lg shadow-sm"
                                        initial={false}
                                        animate={{
                                            left: activeTab === 'requests' ? '4px' : '50%',
                                            width: 'calc(50% - 4px)',
                                            x: activeTab === 'requests' ? 0 : 0
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                    <button
                                        onClick={() => setActiveTab('requests')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors relative z-10 flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'text-white' : 'text-white/40'}`}
                                    >
                                        <Heart className="w-3.5 h-3.5" />
                                        おねがい
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('events')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors relative z-10 flex items-center justify-center gap-2 ${activeTab === 'events' ? 'text-white' : 'text-white/40'}`}
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        できごと
                                    </button>
                                </div>
                            )}

                            {/* Filter Section & Calendar - Consolidated Header (Only for events tab) */}
                            {activeTab === 'events' && (
                                <div className="mt-4 flex items-center justify-end gap-3 z-30 px-1">
                                    {/* Cat Selector Pulldown */}
                                    <div className="w-[105px]">
                                        <Select value={selectedCatId || 'all'} onValueChange={(val: string) => setSelectedCatId(val === 'all' ? null : val)}>
                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[10px] font-bold text-white focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-white/10 transition-all shadow-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Cat className="w-3 h-3 text-slate-400" />
                                                    <SelectValue placeholder="全員" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1E1E23] border-white/10 text-white z-[12050]">
                                                <SelectItem value="all" className="text-[10px] font-bold text-white">全員</SelectItem>
                                                {cats.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-bold text-white">
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Category Filter Pulldown */}
                                    <div className="w-[105px]">
                                        <Select value={activeFilter} onValueChange={(val: string) => setActiveFilter(val as any)}>
                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[10px] font-bold text-white focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-white/10 transition-all shadow-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Tag className="w-3 h-3 text-slate-400" />
                                                    <SelectValue placeholder="すべて" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1E1E23] border-white/10 text-white z-[12050]">
                                                {[
                                                    { id: 'all', label: 'すべて' },
                                                    { id: 'photo', label: '写真' },
                                                    { id: 'chat', label: '相談' },
                                                    { id: 'health', label: '健康' },
                                                    { id: 'bookmark', label: '重要' },
                                                ].map((f) => (
                                                    <SelectItem key={f.id} value={f.id} className="text-[10px] font-bold text-white">
                                                        {f.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Calendar Button (Island only) */}
                                    {isIsland && props.onOpenCalendar && (
                                        <button
                                            onClick={() => {
                                                onClose();
                                                props.onOpenCalendar?.();
                                            }}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                        >
                                            <CalendarDays className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Content Scrollable Area */}
                            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                {activeTab === 'events' ? (
                                    <>
                                        {/* Timeline Items */}
                                        {groupedLogs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <History className="w-8 h-8 text-white/20" />
                                                </div>
                                                <p className="text-slate-200 text-sm font-bold mb-2">まだ記録がありません</p>
                                                <p className="text-slate-500 text-xs">＋ボタンから今日のできごとを<br />記録してみましょう</p>
                                            </div>
                                        ) : (
                                            <div className="pb-24">
                                                {groupedLogs.map((group) => (
                                                    <div key={group.date} className="mt-8">
                                                        <div className="px-6 mb-3 flex items-center justify-center gap-3">
                                                            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white/10"></div>
                                                            <h3 className="text-[10px] font-black text-[#E8B4A0] tracking-[0.2em] flex-shrink-0">{group.date}</h3>
                                                            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white/10"></div>
                                                        </div>

                                                        <div className="divide-y divide-white/5">
                                                            {group.items.map((item) => {
                                                                const TypeIcon = getTypeIcon(item.type);
                                                                const cat = cats.find(c => c.id === item.catId);
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (onSelectItem) {
                                                                                onSelectItem(item.id, item.type, item.photos);
                                                                            }
                                                                        }}
                                                                        className="pl-6 pr-4 py-3 hover:bg-white/[0.03] transition-all cursor-pointer group relative active:scale-[0.98] active:bg-white/10"
                                                                    >
                                                                        <div className="absolute left-[2.1rem] top-0 bottom-0 w-[2px] bg-gradient-to-b from-white/5 via-white/10 to-white/5" />
                                                                        <div className={`absolute left-[1.85rem] top-6 w-[10px] h-[10px] rounded-full bg-[#1E1E23] border-2 z-10 ${item.photos.length > 0 ? 'border-[#E8B4A0]/50' : 'border-white/20'}`} />

                                                                        <div className="ml-6 flex items-start gap-3">
                                                                            <div className="relative flex-shrink-0">
                                                                                {cat?.avatar ? (
                                                                                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-white/10 bg-white/5">
                                                                                        <img src={getFullImageUrl(cat.avatar)} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300" alt="" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${['chat', 'worried', 'troubled', 'concerned'].includes(item.type) ? 'bg-[#E8B4A0]/20 text-[#E8B4A0]' : 'bg-white/5 text-slate-400'}`}>
                                                                                        <TypeIcon size={18} strokeWidth={2.5} />
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex-1 min-w-0 bg-white/[0.03] rounded-xl p-3 border border-white/5 relative group/item hover:bg-white/[0.05] transition-colors flex gap-3">
                                                                                <div className="flex-1 min-w-0 pr-2">
                                                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                                                        <div className="flex items-center gap-1.5 min-w-0 text-[10px] font-medium text-slate-500">
                                                                                            <span className="text-[#E8B4A0] font-bold truncate max-w-[120px]">{item.catName}</span>
                                                                                            {item.userName && (
                                                                                                <>
                                                                                                    <span className="opacity-20">|</span>
                                                                                                    <span className="text-slate-400 truncate max-w-[100px]">{item.userName}</span>
                                                                                                </>
                                                                                            )}
                                                                                            <span className="opacity-20">|</span>
                                                                                            <span className="opacity-60">{format(new Date(item.createdAt), 'HH:mm')}</span>
                                                                                            {item.updates && item.updates.length > 0 && (
                                                                                                <>
                                                                                                    <span className="opacity-20">|</span>
                                                                                                    <span className="text-[#E8B4A0] font-bold">{item.updates.length} 更新</span>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {item.note && <p className="text-slate-200 text-[13px] leading-relaxed break-words mb-2 font-medium">{item.note}</p>}

                                                                                    {item.photos.length > 0 && (
                                                                                        <div className="relative mb-2 rounded-xl overflow-hidden shadow-lg border border-white/10 aspect-[4/3] max-h-48">
                                                                                            <img src={getFullImageUrl(item.photos[0])} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                                                                            {item.photos.length > 1 && <div className="absolute bottom-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-[10px] text-white font-bold backdrop-blur-md border border-white/10">+{item.photos.length - 1}</div>}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Unified Right Action Cluster */}
                                                                                <div className="flex flex-col gap-2 shrink-0 items-center justify-center pl-2">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); toggleBookmark(item.id); }}
                                                                                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${item.is_bookmarked ? 'bg-[#FFD54F]/20 text-[#FFD54F]' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
                                                                                    >
                                                                                        <Star size={18} fill={item.is_bookmarked ? "currentColor" : "none"} strokeWidth={item.is_bookmarked ? 2 : 2} className="transition-all duration-300" />
                                                                                    </button>

                                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                                        <ReactionBar
                                                                                            incidentId={item.id}
                                                                                            reactions={item.reactions || []}
                                                                                            currentUserId={currentUserId || ''}
                                                                                            onAddReaction={(emoji) => addReaction(item.id, emoji)}
                                                                                            onRemoveReaction={(emoji) => removeReaction(item.id, emoji)}
                                                                                            orientation="vertical"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* FAB */}
                                        <div className="absolute bottom-8 right-6 z-50">
                                            <div className="absolute inset-0 bg-[#E8B4A0] rounded-full blur-xl opacity-20 animate-pulse" />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={onOpenNew}
                                                animate={{
                                                    boxShadow: [
                                                        "0 0 0 0 rgba(255, 255, 255, 0)",
                                                        "0 0 0 6px rgba(255, 255, 255, 0.1)",
                                                        "0 0 0 0 rgba(255, 255, 255, 0)"
                                                    ]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className="relative w-14 h-14 rounded-full bg-white shadow-lg shadow-white/5 flex items-center justify-center text-[#E8B4A0] group overflow-hidden"
                                            >
                                                <PenLine size={24} strokeWidth={2.5} className="relative z-10" />
                                            </motion.button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full px-4 pt-4 pb-12 space-y-8">
                                        {/* Pending Requests (QuestGrid) */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="w-1 h-3 rounded-full bg-[#E8B4A0]" />
                                                <span className="text-xs font-bold text-[#E8B4A0]">今日のおねがい</span>
                                            </div>
                                            <QuestGrid className="w-full" />
                                        </div>

                                        {/* Divider or Spacer */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

                                        {/* Completed Records (CareHistoryList) */}
                                        <CareHistoryList
                                            onOpenPhoto={(url) => {
                                                if (onSelectItem) {
                                                    onSelectItem('preview', 'photo', [url]);
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
