"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ActivityFeed } from "./activity-feed";

// Reusing the header style from GalleryScreen
function ScreenHeader({ title, onClose }: { title: string; onClose?: () => void }) {
    return (
        <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{title}</h2>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-white/10"
            >
                <X className="h-5 w-5 text-slate-300" />
            </Button>
        </div>
    );
}

interface ActivityScreenProps {
    onClose?: () => void;
}

export function ActivityScreen({ onClose }: ActivityScreenProps) {
    return (
        <div className="min-h-screen bg-transparent">
            <ScreenHeader title="お世話履歴" onClose={onClose} />
            <div className="p-4 safe-bottom">
                {/* 
                  Usage of ActivityFeed with embedded=true to show the list directly.
                  limit=100 to show more history.
                */}
                <ActivityFeed embedded={true} limit={100} />
            </div>
        </div>
    );
}
