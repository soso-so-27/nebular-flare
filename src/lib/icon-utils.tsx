import React from 'react';
import {
    Utensils, Droplet, Trash2, Sparkles, Clipboard,
    Heart, Syringe, Pill, Activity, Cat, Stethoscope,
    UtensilsCrossed, Scissors
} from 'lucide-react';
import { cn } from './utils';

export type IconId = 'food' | 'water' | 'toilet' | 'brush' | 'health' | 'med' | 'heart' | 'default';

export const APP_ICONS = {
    // Legacy short keys
    'food': { label: 'ごはん', Icon: Utensils },
    'water': { label: '水', Icon: Droplet },
    'toilet': { label: 'トイレ', Icon: Trash2 },
    'brush': { label: 'お手入れ', Icon: Sparkles },
    'health': { label: '健康', Icon: Activity },
    'med': { label: '薬', Icon: Pill },
    'shot': { label: '注射', Icon: Syringe },
    'heart': { label: 'ハート', Icon: Heart },
    'cat': { label: '猫', Icon: Cat },
    'default': { label: 'その他', Icon: Clipboard },
    // Lucide icon names (for DEFAULT_CARE_TASK_DEFS)
    'UtensilsCrossed': { label: 'ごはん', Icon: UtensilsCrossed },
    'Utensils': { label: 'ごはん', Icon: Utensils },
    'Droplet': { label: '水', Icon: Droplet },
    'Trash2': { label: 'トイレ', Icon: Trash2 },
    'Scissors': { label: 'ブラッシング', Icon: Scissors },
    'Sparkles': { label: '遊び', Icon: Sparkles },
    'Pill': { label: 'お薬', Icon: Pill },
    'Heart': { label: 'ハート', Icon: Heart },
    'Activity': { label: '健康', Icon: Activity },
    'Cat': { label: '猫', Icon: Cat },
};

const LEGACY_EMOJI_MAP: Record<string, string> = {
    '🍚': 'food',
    '💧': 'water',
    '🧹': 'toilet',
    '✨': 'brush',
    '🐕': 'dog', // just in case
    '🐈': 'cat',
    '🐱': 'cat',
    '🏥': 'health',
    '💊': 'med',
    '💉': 'shot',
    '❤️': 'heart',
};

export function getIcon(id: string) {
    // Check if it's a legacy emoji that we have a replacement for
    if (LEGACY_EMOJI_MAP[id]) {
        id = LEGACY_EMOJI_MAP[id];
    }

    // If id matches a key in APP_ICONS, return that component
    const iconDef = APP_ICONS[id as keyof typeof APP_ICONS];
    if (iconDef) {
        return iconDef.Icon;
    }

    // Legacy support: if it's an emoji or unknown string, return a fallback that renders it
    // But since the UI expects a Component, we return a wrapped component
    // If the ID looks like it contains non-ASCII (emoji), render it as text
    if (/[^\u0000-\u007F]+/.test(id)) {
        // Return a component that renders the emoji
        return (props: React.SVGProps<SVGSVGElement>) => (
            <span className={cn("text-xl leading-none not-italic mx-auto flex items-center justify-center align-middle", props.className)} style={{ width: '1em', height: '1em' }}>
                {id}
            </span>
        );
    }

    return APP_ICONS.default.Icon;
}

export function getIconList() {
    return Object.entries(APP_ICONS).map(([id, def]) => ({
        id,
        label: def.label,
        Icon: def.Icon
    }));
}
