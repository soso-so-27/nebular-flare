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
            <div className="shrink-0 pt-[env(safe-area-inset-top,2.5rem)]" />

            {/* Main Content Area: Purely Horizontal 100vh Flow */}
            <div className="flex-1 overflow-hidden relative pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
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
        </div>
    );
}
