"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
    onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    return (
        <div className="flex items-center py-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onMenuClick}>
                <Menu className="h-5 w-5 text-slate-600" />
            </Button>
        </div>
    );
}
