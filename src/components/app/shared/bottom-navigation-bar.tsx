"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Camera, Cat, Home } from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface BottomNavigationBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    hasNewNotifications?: boolean;
}

const tabs = [
    { id: "home", label: "ホーム", icon: Home },
    { id: "collection", label: "図鑑", icon: BookOpen },
    { id: "camera", label: "撮影", icon: Camera, isCenter: true },
    { id: "cat", label: "うちの子", icon: Cat },
    { id: "calendar", label: "カレンダー", icon: Calendar },
];

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
    activeTab,
    onTabChange,
}) => {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[10005] border-t border-[#DDDCD8] bg-[#F2F1EF]/92 pb-[max(env(safe-area-inset-bottom),12px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] pt-3 backdrop-blur-xl"
            role="navigation"
            aria-label="メインナビゲーション"
        >
            <div className="relative mx-auto flex h-[64px] max-w-md items-end justify-between px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    if (tab.isCenter) {
                        return (
                            <div key={tab.id} className="relative -top-4">
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.94 }}
                                    aria-label="撮影を開く"
                                    onClick={() => {
                                        triggerFeedback("medium");
                                        onTabChange(tab.id);
                                    }}
                                    className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#3D5A80] text-white shadow-[0_10px_24px_rgba(61,90,128,0.28)] ring-4 ring-[#F2F1EF]"
                                >
                                    <Icon className="h-7 w-7" strokeWidth={2.2} />
                                </motion.button>
                            </div>
                        );
                    }

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
