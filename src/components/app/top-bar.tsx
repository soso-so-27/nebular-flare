"use client";

import React from "react";
import { Settings, Bell, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useAppState } from "@/store/app-store";

interface TopBarProps {
    onSettingsClick?: () => void;
    onNotificationClick?: () => void;
    onHistoryClick?: () => void;
}

export function TopBar({ onSettingsClick, onNotificationClick, onHistoryClick }: TopBarProps) {
    const { user } = useAuth();
    const { isDemo } = useAppState();

    // Get user initial from email or display name
    const userInitial = user?.email?.charAt(0).toUpperCase() || user?.user_metadata?.display_name?.charAt(0) || "?";

    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
                <span className="text-lg">🐾</span>
                <h1 className="text-base font-bold text-slate-900 dark:text-white">
                    CatUp
                </h1>
                {isDemo && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                        Demo
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onHistoryClick}>
                    <Calendar className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onNotificationClick}
                >
                    <Bell className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onSettingsClick}
                >
                    <Settings className="h-4 w-4 text-slate-500" />
                </Button>
                {user ? (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center" title={user.email || ""}>
                        <span className="text-xs font-bold text-primary">{userInitial}</span>
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <User className="h-4 w-4 text-slate-500" />
                    </Button>
                )}
            </div>
        </div>
    );
}

