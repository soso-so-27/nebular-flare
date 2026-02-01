"use client";

import { getFullImageUrl, cn } from '@/lib/utils';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useCareData } from '@/hooks/use-care-logic';
import { createPortal } from "react-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    useCatContext,
    useSettingsContext,
    useCoreContext,
    useIncidentContext,
    useMedicationContext
} from '@/store/app-store';
import { createClient } from '@/lib/supabase';
import { X, PenLine, MessageCircle, Camera, AlertCircle, ChevronRight, History, Heart, Star, Bookmark, ChevronDown, Cat, BookOpen, CalendarDays, Tag, Plus } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { ja } from "date-fns/locale";
import { ReactionBadges, ReactionBar } from '../shared/reaction-bar';
import { CareHistoryList } from '../immersive/care-history-list';
import { QuestGrid } from '../immersive/quest-grid';
import { EmbeddedInputCard } from '../shared/embedded-input-card';
import { useGroupedLogs, FilterType } from '@/hooks/use-grouped-logs';
import { NyannlogEventsTab } from './nyannlog-events-tab';
import { NyannlogRequestsTabView } from './nyannlog-requests-tab-view';
import { NyannlogHeaderV2 } from './nyannlog-header-v2';
import { NyannlogInputTabViewFinal } from './nyannlog-input-tab-view-final';

// =====================================================
// Types
// =====================================================
type NyannlogSheetProps = {
    isOpen: boolean;
    onClose: () => void;
    onOpenNew: () => void;
    onSelectItem?: (id: string, type: string, photos: string[]) => void;
    onOpenCalendar?: () => void;
    onTabChange?: (tab: 'events' | 'requests' | 'input') => void;
    initialTab?: 'events' | 'requests' | 'input';
    usePortal?: boolean;
};

// =====================================================
// Component
// =====================================================
export const NyannlogSheet = React.memo(function NyannlogSheet(props: NyannlogSheetProps) {
    const { isOpen, onClose, onSelectItem, onTabChange, usePortal = true } = props;
    const { cats } = useCatContext();
    const { settings } = useSettingsContext();
    const { currentUserId } = useCoreContext();
    const { incidents: incidentList, toggleBookmark, addReaction, removeReaction } = useIncidentContext();
    const { medicationLogs } = useMedicationContext();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'events' | 'requests' | 'input'>(isOpen ? (props.initialTab || 'requests') : 'requests');
    const [requestsSubTab, setRequestsSubTab] = useState<'today' | 'history'>('today');
    const [direction, setDirection] = useState(0);

    const handleTabChange = (tab: 'events' | 'requests' | 'input') => {
        if (tab === activeTab) return;
        // requests (Left) -> events (Right) : 1
        // events (Right) -> requests (Left) : -1
        // If current is requests and target is events -> 1
        const newDirection = tab === 'events' ? 1 : -1;
        setDirection(newDirection);
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0
        })
    };
    const [showScrollFab, setShowScrollFab] = useState(false);
    const inputCardRef = useRef<HTMLDivElement>(null);
    const { totalCareTasks, completedCareTasks } = useCareData();

    // Sync tab when prop changes or re-opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(props.initialTab || 'requests');
        }
    }, [isOpen, props.initialTab]);


    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Track input card visibility for FAB
    useEffect(() => {
        if (!inputCardRef.current || activeTab !== 'events') return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowScrollFab(!entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        observer.observe(inputCardRef.current);
        return () => observer.disconnect();
    }, [activeTab, inputCardRef.current]);

    const groupedLogs = useGroupedLogs(activeTab, selectedCatId, activeFilter);

    const dailyPhotos = useMemo(() => {
        const photos: Record<string, string> = {};
        const allItems = [
            ...incidentList.map(inc => ({ date: inc.created_at, photos: inc.photos })),
            ...cats.flatMap(cat => (cat.images || []).map(img => ({ date: img.createdAt, photos: [img.storagePath] })))
        ];

        allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        allItems.forEach(item => {
            if (item.photos && item.photos.length > 0) {
                const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
                if (!photos[dateKey]) {
                    photos[dateKey] = item.photos[0];
                }
            }
        });
        return photos;
    }, [cats, incidentList]);

    // Scroll Control
    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        const wasOpen = prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        if (!isOpen) return;
        if (!wasOpen || activeTab) {
            const scrollToPosition = () => {
                if (scrollContainerRef.current) {
                    if (activeTab === 'events') {
                        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                    } else {
                        scrollContainerRef.current.scrollTop = 0;
                    }
                }
            };

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(scrollToPosition, 50);
                    setTimeout(scrollToPosition, 200);
                });
            });
        }
    }, [isOpen, activeTab]);

    const isIsland = settings.layoutType === 'v2-island';

    const activeMedications = useMemo(() => {
        const today = new Date();
        return (medicationLogs || []).filter((log: any) => {
            const start = new Date(log.starts_at);
            const end = log.end_date ? new Date(log.end_date) : null;
            const isActive = today >= start && (!end || today <= end);
            if (!isActive) return false;
            if (selectedCatId && log.cat_id !== selectedCatId) return false;
            return true;
        });
    }, [medicationLogs, selectedCatId]);

    if (usePortal && !portalTarget) return null;

    const content = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={usePortal ? { opacity: 0 } : { opacity: 1, y: 0 }}
                    animate={usePortal ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={usePortal ? { opacity: 0 } : { opacity: 1, y: 0 }}
                    className={cn(
                        usePortal ? "fixed inset-0 z-[12000] flex items-end justify-center transition-all duration-500" : "absolute inset-x-0 bottom-0 z-[1] h-full flex items-end justify-center pointer-events-auto", // z-1 & pointer-events-auto
                        usePortal ? (activeTab === 'requests' ? "bg-black/20" : "bg-black/60 backdrop-blur-sm") : ""
                    )}
                    onClick={onClose}
                >
                    <motion.div
                        initial={usePortal ? { y: "100%" } : { opacity: 1, scale: 1, y: 0 }}
                        animate={usePortal ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={usePortal ? { y: "100%" } : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "bg-[#18181B] shadow-2xl flex flex-col w-full max-w-md overflow-y-auto no-scrollbar transition-all duration-500 pointer-events-auto relative z-[9999]",
                            activeTab === 'input' ? "h-auto max-h-[25vh] rounded-t-[32px]" : "h-[100lvh]",
                            activeTab === 'requests' && "justify-end",
                            !usePortal && activeTab !== 'input' && "rounded-none"
                        )}
                    >
                        {activeTab !== 'input' && (
                            <NyannlogHeaderV2
                                activeTab={activeTab}
                                setActiveTab={(t) => {
                                    handleTabChange(t);
                                }}
                                isIsland={isIsland}
                                activeFilter={activeFilter}
                                setActiveFilter={setActiveFilter}
                                selectedCatId={selectedCatId}
                                setSelectedCatId={setSelectedCatId}
                                cats={cats}
                                onOpenCalendar={props.onOpenCalendar}
                                onClose={onClose}
                                requestsSubTab={requestsSubTab}
                                setRequestsSubTab={setRequestsSubTab}
                            />
                        )}

                        <div className={cn(
                            "flex flex-col min-h-0 relative",
                            activeTab === 'requests' ? "h-[30vh]" : "flex-1"
                        )}>
                            <AnimatePresence initial={false} custom={direction} mode="wait">
                                {activeTab === 'requests' ? (
                                    <motion.div
                                        key="requests"
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="w-full h-full pt-0"
                                    >
                                        <NyannlogRequestsTabView
                                            completedCareTasks={completedCareTasks}
                                            totalCareTasks={totalCareTasks}
                                            activeMedications={activeMedications}
                                            cats={cats}
                                            selectedCatId={selectedCatId}
                                            onSelectItem={onSelectItem}
                                            onClose={onClose}
                                            subTab={requestsSubTab}
                                            setSubTab={setRequestsSubTab}
                                        />
                                    </motion.div>
                                ) : activeTab === 'input' ? (
                                    <motion.div
                                        key="input"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="w-full"
                                    >
                                        <NyannlogInputTabViewFinal
                                            onClose={onClose}
                                            selectedCatId={selectedCatId}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="events"
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="h-full w-full flex flex-col"
                                    >
                                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-none pb-20">
                                            <NyannlogEventsTab
                                                groupedLogs={groupedLogs}
                                                currentUserId={currentUserId}
                                                onSelectItem={onSelectItem}
                                                toggleBookmark={toggleBookmark}
                                                addReaction={addReaction}
                                                removeReaction={removeReaction}
                                                inputCardRef={inputCardRef as React.RefObject<HTMLDivElement>}
                                                dailyPhotos={dailyPhotos}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {activeTab === 'events' && (
                            <button
                                onClick={() => {
                                    handleTabChange('input');
                                }}
                                className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-brand-peach text-white shadow-[0_8px_20px_rgba(var(--brand-peach-rgb),0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[10000] border-2 border-white/20"
                            >
                                <Plus className="w-8 h-8" strokeWidth={3} />
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (usePortal) {
        return createPortal(content, portalTarget!);
    }
    return content;
});
