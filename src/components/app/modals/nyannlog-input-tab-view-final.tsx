"use client";

import React from "react";
import { EmbeddedInputCard } from "../shared/embedded-input-card";

interface NyannlogInputTabViewProps {
    onClose: () => void;
    selectedCatId?: string | null;
}

export const NyannlogInputTabViewFinal = ({ onClose, selectedCatId }: NyannlogInputTabViewProps) => {
    return (
        <div className="w-full h-full flex flex-col overflow-y-auto touch-pan-y no-scrollbar">
            <div className="px-2 pb-28 pt-2 w-full flex-1 flex flex-col justify-end">
                <EmbeddedInputCard isStandalone={true} onSuccess={onClose} initialCatId={selectedCatId || undefined} />
            </div>
        </div>
    );
};
