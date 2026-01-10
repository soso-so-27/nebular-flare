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
        <div className={cn("relative flex shrink-0 overflow-hidden rounded-full bg-slate-100 items-center justify-center", sizeClasses[size], className)}>
            {isUrl ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
            ) : null}

            <div className={cn("flex flex-col items-center justify-center absolute inset-0 text-slate-400", isUrl ? "hidden" : "")}>
                <Cat className={iconSizes[size]} />
            </div>
        </div>
    );
}
