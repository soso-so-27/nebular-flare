"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, LayoutGrid, Plus, PawPrint } from "lucide-react";
import { NyannlogEventsTab } from "../modals/nyannlog-events-tab";
import { useGroupedLogs } from "@/hooks/use-grouped-logs";
import { useIncidentContext, useCoreContext, useCatContext } from "@/store/app-store";
import { LayoutIslandNeo } from "../immersive/layout-island-neo";
import { HomeViewToggle } from "../shared/home-view-toggle";
import { triggerFeedback } from "@/lib/haptics";
import { useFootprintContext } from "@/providers/footprint-provider";

interface DekigotoScreenProps {
    onClose: () => void;
    onOpenCalendar: () => void;
    onOpenSidebar: (section: string, item?: string) => void;
    onSelectItem: (id: string, type: string, photos?: string[]) => void;
    onNavigate: (tab: string) => void;
    // New Props for Island
    onOpenExchange: () => void;
    onOpenPhoto: () => void;
    onOpenIncident: () => void;
    onOpenNyannlogSheet: (tab?: 'events' | 'requests' | 'input') => void;
    onCloseNyannlog?: () => void;
    isNyannlogOpen?: boolean;
    activeNyannlogTab?: 'events' | 'requests' | 'input';
    onOpenIncidentDetail: (id: string) => void;
}

export function DekigotoScreen({
    onClose,
    onOpenCalendar,
    onOpenSidebar,
    onSelectItem,
    onNavigate,
    onOpenExchange,
    onOpenPhoto,
    onOpenIncident,
    onOpenNyannlogSheet,
    onCloseNyannlog,
    isNyannlogOpen,
    activeNyannlogTab,
    onOpenIncidentDetail
}: DekigotoScreenProps) {
    const { incidents: incidentList, toggleBookmark, addReaction, removeReaction } = useIncidentContext();
    const { currentUserId } = useCoreContext();
    const { cats } = useCatContext();
    const { stats } = useFootprintContext();
    const inputCardRef = useRef<HTMLDivElement>(null);
    const groupedLogs = useGroupedLogs('events', null, 'all');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Calculate representative photo for each date
    const dailyPhotos = React.useMemo(() => {
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


    return (
        <div className="fixed inset-0 z-[10002] bg-[#18181B] flex flex-col h-full">

            {/* Header: Pure Immersion (Balanced Space) */}
            <div className="shrink-0 h-10" />

            {/* Main Content Area: Purely Horizontal 100vh Flow */}
            <div className="flex-1 overflow-hidden relative">
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

            {/* Command Dock: Integrated Control Center */}
            <div className="fixed inset-x-0 bottom-0 z-[13000] pointer-events-none px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                <div className="max-w-md mx-auto flex items-end justify-between gap-6">
                    {/* Primary Action Unit (Left) */}
                    <div className="flex items-center gap-3">
                        {/* Plus Action */}
                        <motion.button
                            initial={false}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                triggerFeedback('medium');
                                if (isNyannlogOpen && activeNyannlogTab === 'input') {
                                    onCloseNyannlog?.();
                                } else {
                                    onOpenNyannlogSheet('input');
                                }
                            }}
                            className={cn(
                                "pointer-events-auto w-16 h-16 rounded-full bg-brand-peach text-white flex items-center justify-center border border-white/20 relative group overflow-hidden transition-all duration-300",
                                isNyannlogOpen && activeNyannlogTab === 'input' && "rotate-0"
                            )}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {isNyannlogOpen && activeNyannlogTab === 'input' ? (
                                    <motion.div
                                        key="close"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <X className="w-8 h-8" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="plus"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="absolute inset-0 rounded-[24px] bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                        </motion.button>

                        {/* Footprint (Exchange) - Matches Home style */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                triggerFeedback('light');
                                onOpenExchange();
                            }}
                            className="pointer-events-auto h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center gap-0.5 shadow-lg active:bg-white/20 transition-colors"
                        >
                            <PawPrint className="w-4 h-4 text-white/90" strokeWidth={2} />
                            {/* Optional: stats can be shown if requested, but Home hides it by default */}
                        </motion.button>
                    </div>

                    {/* Navigation Unit (Right) */}
                    <div className="pointer-events-auto bg-[#1E1E22]/90 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-[0_25px_50px_rgba(0,0,0,0.5)] flex items-center gap-1">
                        <HomeViewToggle
                            currentView="dekigoto"
                            onViewChange={(v: 'home' | 'dekigoto') => {
                                triggerFeedback('light');
                                onNavigate(v);
                            }}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
