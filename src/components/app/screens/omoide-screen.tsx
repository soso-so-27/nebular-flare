"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useCatContext } from "@/store/app-store";

export function OmoideScreen() {
    const { cats } = useCatContext();
    const catName = cats[0]?.name ?? "\u306d\u3053";

    return (
        <div className="flex min-h-[calc(100dvh-64px)] items-start justify-center bg-[#F2F1EF] px-6 pt-16 pb-6">
            <div className="flex w-full max-w-[320px] flex-col items-center text-center">
                <div className="flex h-[240px] w-full items-center justify-center rounded-[4px] bg-gradient-to-b from-[#E7E6E3] to-[#DDDCD8]">
                    <Lock className="h-8 w-8 text-[#8A8988]" strokeWidth={1.8} />
                </div>
                <p className="mt-6 text-[16px] font-semibold text-[#1E2840]">
                    {`${catName}\u306e7\u65e5\u5206\u306e\u8a18\u9332\u304c\u6e9c\u307e\u3063\u3066\u3044\u307e\u3059`}
                </p>
                <p className="mt-2 text-[13px] font-light text-[#5A5958]">
                    {`\u304a\u3082\u3044\u3067\u30bf\u30d6\u3067\u3001\u3042\u306e\u3053\u308d\u306e${catName}\u306b\u4f1a\u3048\u307e\u3059\u3002`}
                </p>
                <button
                    type="button"
                    className="mt-8 w-full rounded-[4px] bg-[#1E2840] px-6 py-[14px] text-center text-white"
                >
                    {"7\u65e5\u9593\u7121\u6599\u3067\u8a66\u3059 \u00b7 \u00a5980/\u6708"}
                </button>
                <button type="button" className="mt-4 text-[12px] text-[#8A8988]">
                    {"\u4eca\u306f\u3044\u3089\u306a\u3044"}
                </button>
            </div>
        </div>
    );
}
