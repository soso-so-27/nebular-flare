import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cat } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatAvatarProps {
    src?: string | null;
    alt?: string;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function CatAvatar({ src, alt, className, size = "md" }: CatAvatarProps) {
    const isUrl = src && (src.startsWith('http') || src.startsWith('blob') || src.startsWith('/'));

    // Size mapping for the container
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-10 w-10",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
        "2xl": "h-32 w-32"
    };

    // Size mapping for the icon
    const iconSizes = {
        sm: "h-3 w-3",
        md: "h-5 w-5",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
        "2xl": "h-16 w-16"
    };

    return (
        <Avatar className={cn(sizeClasses[size], "bg-slate-100 items-center justify-center", className)}>
            {isUrl ? (
                <AvatarImage src={src} alt={alt} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-transparent">
                {/* If it's a known default emoji or transparent/null, show the Icon */}
                {(!src || src === "🐈") ? (
                    <Cat className={cn(iconSizes[size], "text-slate-400")} />
                ) : (
                    // If user set a specific emoji that isn't the default, display it? 
                    // Or enforcing the icon? User said "remove emojis". 
                    // Let's stick to showing the generic icon for now to be safe with "remove emojis".
                    // But if it's '🐈‍⬛', maybe they want that? 
                    // Strategy: If it looks like an emoji, try to show the icon, unless we modify the store.
                    // For now, let's treat ALMOST EVERYTHING as the icon fallback unless it's an image URL.
                    <Cat className={cn(iconSizes[size], "text-slate-400")} />
                )}
            </AvatarFallback>
        </Avatar>
    );
}
