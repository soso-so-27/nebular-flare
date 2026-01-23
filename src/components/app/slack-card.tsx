"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SlackCardStatus = "danger" | "warn" | "success" | "info" | "default";

export interface SlackCardProps {
    status?: SlackCardStatus;
    icon?: React.ReactNode;
    title: string | React.ReactNode;
    meta?: string | React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    isDimmed?: boolean;
}

const statusColors: Record<SlackCardStatus, string> = {
    danger: "bg-rose-500",
    warn: "bg-orange-500",
    success: "bg-[#7CAA8E]",
    info: "bg-[#7CAA8E]",
    default: "bg-slate-300",
};

export const SlackCard = React.memo(function SlackCard({
    status = "default",
    icon,
    title,
    meta,
    actions,
    children,
    className,
    isDimmed = false,
}: SlackCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] overflow-hidden transition-opacity duration-200",
                isDimmed && "opacity-60",
                className
            )}
        >
            {/* Accent Bar */}
            <div
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-[4px]",
                    statusColors[status]
                )}
            />

            <div className="pl-[16px] pr-3 py-3 flex flex-col gap-2">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {icon && (
                            <div className="text-muted-foreground shrink-0">{icon}</div>
                        )}
                        <div className="text-[14px] font-bold leading-tight truncate">
                            {title}
                        </div>
                    </div>
                    {meta && (
                        <div className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap mt-0.5 font-medium">
                            {meta}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                    {children}
                </div>

                {/* Actions/Footer Area */}
                {actions && (
                    <div className="mt-1 flex flex-wrap gap-2 items-center">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
});

export const SlackCardAction = React.memo(function SlackCardAction({
    children,
    onClick,
    variant = "link",
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "link" | "button" | "outline";
    className?: string;
}) {
    if (variant === "button") {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors",
                    className
                )}
            >
                {children}
            </button>
        );
    }

    if (variant === "outline") {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                    className
                )}
            >
                {children}
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "text-[11px] font-bold text-[#5A8A6A] dark:text-[#7CAA8E] hover:underline px-1",
                className
            )}
        >
            {children}
        </button>
    );
});

export const SlackCardTag = React.memo(function SlackCardTag({
    children,
    status = "default",
}: {
    children: React.ReactNode;
    status?: SlackCardStatus;
}) {
    const badgeColors: Record<SlackCardStatus, string> = {
        danger: "bg-rose-50 text-rose-600 border-rose-100",
        warn: "bg-[#B8A6D9]/10 text-[#8B7AAF] border-[#B8A6D9]/20",
        success: "bg-[#F2F7F4] text-[#5A8C6E] border-[#E5F0EA]",
        info: "bg-[#7CAA8E]/10 text-[#5A8A6A] border-[#7CAA8E]/20",
        default: "bg-slate-50 text-slate-600 border-slate-100",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-bold border",
                badgeColors[status]
            )}
        >
            {children}
        </span>
    );
});
