"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, Cat, Lock } from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface BottomNavigationBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    hasNewNotifications?: boolean;
    showMemoriesLock?: boolean;
}

function FilledCalendarDaysIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path fill="currentColor" d="M7 3.5a1 1 0 0 1 1 1V5h8v-.5a1 1 0 1 1 2 0V5h.5A2.5 2.5 0 0 1 21 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10A2.5 2.5 0 0 1 5.5 5H6v-.5a1 1 0 0 1 1-1Z" />
            <path fill="#F2F1EF" d="M7 10.2h10v1.6H7zm0 3.4h4.3v1.6H7zm6 0h4v1.6h-4zM7.4 6.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm9.2 0a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z" />
        </svg>
    );
}

function FilledBookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path fill="currentColor" d="M4.5 5.5A2.5 2.5 0 0 1 7 3h4.2c1.1 0 2.1.4 2.8 1.1A4 4 0 0 1 16.8 3H21v15.2h-4.2c-1.2 0-2.4.5-3.2 1.3l-.6.6-.6-.6a4.5 4.5 0 0 0-3.2-1.3H5V5.5Z" />
            <path fill="#F2F1EF" d="M7 6.8h3.5c.5 0 1 .1 1.5.3v9a5.8 5.8 0 0 0-1.5-.2H7zm10 0h-3.5c-.5 0-1 .1-1.5.3v9c.5-.2 1-.2 1.5-.2H17z" />
        </svg>
    );
}

function FilledCatIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path fill="currentColor" d="M7.2 5.1 9 6.8l1.1-2.8a1 1 0 0 1 .9-.6h2a1 1 0 0 1 .9.6L15 6.8l1.8-1.7c.6-.6 1.6-.1 1.5.8L18 9.3a7.8 7.8 0 0 1 2.1 5.2c0 4-3.5 6.9-8.1 6.9s-8.1-2.9-8.1-6.9A7.8 7.8 0 0 1 6 9.3l-.3-3.4c-.1-.9.9-1.4 1.5-.8Z" />
            <path fill="#F2F1EF" d="M9.4 12.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5.2 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-4.3 4.1c.5.6 1.1.9 1.7.9s1.2-.3 1.7-.9l.6.6a3 3 0 0 1-2.3 1.2 3 3 0 0 1-2.3-1.2z" />
        </svg>
    );
}

const tabs = [
    { id: "home", label: "\u3053\u306e\u3054\u308d", icon: CalendarDays, activeIcon: FilledCalendarDaysIcon },
    { id: "memories", label: "\u304a\u3082\u3044\u3067", icon: BookOpen, activeIcon: FilledBookOpenIcon },
    { id: "cat", label: "\u306d\u3053", icon: Cat, activeIcon: FilledCatIcon },
];

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
    activeTab,
    onTabChange,
    showMemoriesLock = true,
}) => {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[10005] bg-[#F2F1EF]/92 pb-[max(env(safe-area-inset-bottom),12px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] pt-3 backdrop-blur-xl"
            role="navigation"
            aria-label="\u30e1\u30a4\u30f3\u30ca\u30d3\u30b2\u30fc\u30b7\u30e7\u30f3"
        >
            <div className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-[#F2F1EF] to-transparent" />
            <div className="relative mx-auto flex h-[64px] max-w-md items-end justify-between px-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = isActive ? tab.activeIcon : tab.icon;

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
                                    strokeWidth={isActive ? 2.2 : 1.9}
                                />
                                {tab.id === "memories" && showMemoriesLock ? (
                                    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#F2F1EF]">
                                        <Lock className="h-2 w-2 text-[#8A8988]" strokeWidth={2.2} />
                                    </span>
                                ) : null}
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
