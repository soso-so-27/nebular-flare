"use client";

import React, { createContext, useContext, ReactNode } from 'react';

// =====================================================
// 足あとポイント機能 — 凍結中
// DB・テーブルは温存。UI・ポイント付与を停止。
// =====================================================

interface FootprintContextValue {
    stats: {
        userTotal: number;
        householdTotal: number;
        breakdown: Array<{
            user_id: string;
            display_name: string;
            total_points: number;
        }>;
    };
    loading: boolean;
    loginBonusAvailable: boolean;
    refreshStats: () => Promise<void>;
    claimLoginBonus: () => Promise<boolean>;
    awardForCare: (catId?: string, actionId?: string, skipPopup?: boolean) => Promise<void>;
    awardForObservation: (catId: string, actionId?: string) => Promise<void>;
    awardForPhoto: (catId: string, actionId?: string) => Promise<void>;
    awardForIncident: (catId: string, actionId?: string) => Promise<void>;
    awardForNyannlog: (catId: string, actionId?: string) => Promise<void>;
    consumeFootprints: (type: string, points: number) => Promise<boolean>;
}

// 凍結中: 全て no-op を返す固定値
const FROZEN_VALUE: FootprintContextValue = {
    stats: { userTotal: 0, householdTotal: 0, breakdown: [] },
    loading: false,
    loginBonusAvailable: false,
    refreshStats: async () => { },
    claimLoginBonus: async () => false,
    awardForCare: async () => { },
    awardForObservation: async () => { },
    awardForPhoto: async () => { },
    awardForIncident: async () => { },
    awardForNyannlog: async () => { },
    consumeFootprints: async () => true,
};

const FootprintContext = createContext<FootprintContextValue>(FROZEN_VALUE);

export function useFootprintContext() {
    return useContext(FootprintContext);
}

// =====================================================
// Provider Component — 凍結中（子要素をそのまま返す）
// =====================================================

interface FootprintProviderProps {
    children: ReactNode;
    userId?: string;
    householdId?: string;
    isDemo?: boolean;
}

export function FootprintProvider({ children }: FootprintProviderProps) {
    return (
        <FootprintContext.Provider value={FROZEN_VALUE}>
            {children}
        </FootprintContext.Provider>
    );
}
