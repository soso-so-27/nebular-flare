"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, Cat } from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface BottomNavigationBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    hasNewNotifications?: boolean;
}

const tabs = [
    { id: "home", label: "\u3053\u306e\u3054\u308d", icon: CalendarDays },
    { id: "memories", label: "\u304a\u3082\u3044\u3067", icon: BookOpen },
    { id: "cat", label: "\u306d\u3053", icon: Cat },
];

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
    activeTab,
    onTabChange,
}) => {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[10005] border-t border-[#DDDCD8] bg-[#F2F1EF]/92 pb-[max(env(safe-area-inset-bottom),12px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] pt-3 backdrop-blur-xl"
            role="navigation"
            aria-label="\u30e1\u30a4\u30f3\u30ca\u30d3\u30b2\u30fc\u30b7\u30e7\u30f3"
        >
            <div className="relative mx-auto flex h-[64px] max-w-md items-end justify-between px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-current={isActive ? "page" : undefined}
                            aria-label={tab.label}
                            onClick={() => {
                                triggerFeedback("light");
                                onTabChange(tab.id);
                            }}
                            className={`relative flex flex-1 flex-col items-center justify-end gap-1 pb-1 transition-all ${
                                isActive ? "text-[#3D5A80]" : "text-[#8A8988]"
                            }`}
                        >
                            <div className="relative">
                                <Icon
                                    className={`h-6 w-6 transition-transform ${isActive ? "scale-110" : "scale-100"}`}
                                    strokeWidth={isActive ? 2.4 : 1.9}
                                />
                                {isActive && (
                                    <motion.span
                                        layoutId="tab-indicator"
                                        className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#3D5A80]"
                                    />
                                )}
                            </div>
                            <span className="text-[11px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
