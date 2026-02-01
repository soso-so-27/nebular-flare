"use client";

import React from "react";
import { EmbeddedInputCard } from "../shared/embedded-input-card";
import { X } from "lucide-react";

interface NyannlogInputTabViewProps {
    onClose: () => void;
    selectedCatId?: string | null;
}

export const NyannlogInputTabViewRefined = ({ onClose, selectedCatId }: NyannlogInputTabViewProps) => {
    return (
        <div className="w-full bg-[#18181B] min-h-[50vh] flex flex-col justify-end">
            <div className="px-4 pt-4 pb-32">
                <EmbeddedInputCard isStandalone={true} onSuccess={onClose} initialCatId={selectedCatId || undefined} />
            </div>
        </div>
    );
};
