"use client";

import React from "react";
import { EmbeddedInputCard } from "../shared/embedded-input-card";

interface NyannlogInputTabViewProps {
    onClose: () => void;
    selectedCatId?: string | null;
    onExpandChange?: (expanded: 'none' | 'tags' | 'health') => void;
    onHeightChange?: (height: number) => void;
    initialDate?: Date;
}

export const NyannlogInputTabViewFinal = ({ onClose, selectedCatId, onExpandChange, onHeightChange, initialDate }: NyannlogInputTabViewProps) => {
    return (
        <div className="w-full flex flex-col">
            <EmbeddedInputCard
                isStandalone={false}
                onSuccess={onClose}
                initialCatId={selectedCatId || undefined}
                onExpandChange={onExpandChange}
                onHeightChange={onHeightChange}
                initialDate={initialDate}
            />
        </div>
    );
};
