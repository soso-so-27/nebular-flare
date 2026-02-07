"use client";

import React from "react";
import { EmbeddedInputCard } from "../shared/embedded-input-card";

interface NyannlogInputTabViewProps {
    onClose: () => void;
    selectedCatId?: string | null;
}

export const NyannlogInputTabViewFinal = ({ onClose, selectedCatId }: NyannlogInputTabViewProps) => {
    return (
        <div className="w-full flex flex-col">
            <EmbeddedInputCard isStandalone={false} onSuccess={onClose} initialCatId={selectedCatId || undefined} />
        </div>
    );
};
