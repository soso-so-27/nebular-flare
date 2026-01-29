"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleCardProps {
    title: string;
    icon: React.ReactNode;
    iconBgColor: string;
    badge?: string;
    badgeColor?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function CollapsibleCard({
    title,
    icon,
    iconBgColor,
    badge,
    badgeColor = "bg-slate-100 text-slate-500",
    children,
    defaultOpen = false
}: CollapsibleCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", iconBgColor)}>
                        {icon}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {title}
                    </h3>
                    {badge && (
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badgeColor)}>
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-slate-400 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Content - Collapsible */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
