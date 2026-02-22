"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, Wrench, Camera, BookOpen, Bell } from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface BottomNavigationBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    hasNewNotifications?: boolean;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
    activeTab,
    onTabChange,
    hasNewNotifications = false
}) => {
    const tabs = [
        { id: "home", label: "ホーム", icon: Home },
        { id: "tools", label: "ツール", icon: Wrench },
        { id: "camera", label: "カメラ", icon: Camera, isCenter: true },
        { id: "zukan", label: "アルバム", icon: BookOpen },
        { id: "notifications", label: "通知", icon: Bell },
    ];

    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
    };

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[10005] px-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3"
            style={glassStyle}
        >
            <div className="max-w-md mx-auto flex items-center justify-between relative h-12">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    if (tab.isCenter) {
                        return (
                            <div key={tab.id} className="relative -top-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        triggerFeedback('medium');
                                        onTabChange(tab.id);
                                    }}
                                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-brand-peach shadow-lg border-[1.5px] border-brand-peach"
                                >
                                    <Icon className="w-8 h-8" strokeWidth={1.5} />
                                </motion.button>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                triggerFeedback('light');
                                onTabChange(tab.id);
                            }}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 transition-colors relative ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                            <div className="relative">
                                <Icon className={`w-6 h-6`} strokeWidth={isActive ? 2 : 1.5} />
                                {tab.id === "notifications" && hasNewNotifications && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-white rounded-full" />
                                )}
                            </div>
                            <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
