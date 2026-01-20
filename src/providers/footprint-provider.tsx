"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { FootprintPopup } from '@/components/app/footprint-popup';
import { useFootprints, FOOTPRINT_POINTS } from '@/hooks/use-footprints';

// =====================================================
// Context Types
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

const FootprintContext = createContext<FootprintContextValue | null>(null);

export function useFootprintContext() {
    const ctx = useContext(FootprintContext);
    if (!ctx) {
        // Return a no-op context for demo mode or when not wrapped
        return {
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
            consumeFootprints: async () => false,
        };
    }
    return ctx;
}

// =====================================================
// Provider Component
// =====================================================

interface FootprintProviderProps {
    children: ReactNode;
    userId?: string;
    householdId?: string;
    isDemo?: boolean;
}

export function FootprintProvider({
    children,
    userId,
    householdId,
    isDemo = false,
}: FootprintProviderProps) {
    const [popupState, setPopupState] = useState<{ visible: boolean; points: number; key: number }>({
        visible: false,
        points: 0,
        key: 0,
    });

    const {
        stats,
        loading,
        loginBonusAvailable,
        awardFootprints,
        claimLoginBonus: rawClaimLoginBonus,
        consumeFootprints: rawConsumeFootprints,
        refresh,
    } = useFootprints({ userId, householdId });

    // Show popup animation
    const showPopup = useCallback((points: number) => {
        setPopupState(prev => ({
            visible: true,
            points,
            key: prev.key + 1,
        }));
    }, []);

    const hidePopup = useCallback(() => {
        setPopupState(prev => ({ ...prev, visible: false }));
    }, []);

    // Wrapper functions that show popup after awarding
    const claimLoginBonus = useCallback(async (): Promise<boolean> => {
        if (isDemo) {
            showPopup(FOOTPRINT_POINTS.login);
            return true;
        }
        const success = await rawClaimLoginBonus();
        if (success) {
            showPopup(FOOTPRINT_POINTS.login);
        }
        return success;
    }, [isDemo, rawClaimLoginBonus, showPopup]);

    const awardForCare = useCallback(async (catId?: string, actionId?: string, skipPopup: boolean = false) => {
        if (isDemo) {
            if (!skipPopup) showPopup(FOOTPRINT_POINTS.care);
            return;
        }
        const success = await awardFootprints('care', FOOTPRINT_POINTS.care, catId, actionId);
        if (success && !skipPopup) {
            showPopup(FOOTPRINT_POINTS.care);
        }
    }, [isDemo, awardFootprints, showPopup]);

    const awardForObservation = useCallback(async (catId: string, actionId?: string) => {
        if (isDemo) {
            showPopup(FOOTPRINT_POINTS.observation);
            return;
        }
        const success = await awardFootprints('observation', FOOTPRINT_POINTS.observation, catId, actionId);
        if (success) {
            showPopup(FOOTPRINT_POINTS.observation);
        }
    }, [isDemo, awardFootprints, showPopup]);

    const awardForPhoto = useCallback(async (catId: string, actionId?: string) => {
        if (isDemo) {
            showPopup(FOOTPRINT_POINTS.photo);
            return;
        }
        const success = await awardFootprints('photo', FOOTPRINT_POINTS.photo, catId, actionId);
        if (success) {
            showPopup(FOOTPRINT_POINTS.photo);
        }
    }, [isDemo, awardFootprints, showPopup]);

    const awardForIncident = useCallback(async (catId: string, actionId?: string) => {
        if (isDemo) {
            showPopup(FOOTPRINT_POINTS.incident);
            return;
        }
        const success = await awardFootprints('incident', FOOTPRINT_POINTS.incident, catId, actionId);
        if (success) {
            showPopup(FOOTPRINT_POINTS.incident);
        }
    }, [isDemo, awardFootprints, showPopup]);

    const awardForNyannlog = useCallback(async (catId: string, actionId?: string) => {
        if (isDemo) {
            showPopup(FOOTPRINT_POINTS.nyannlog);
            return;
        }
        const success = await awardFootprints('nyannlog', FOOTPRINT_POINTS.nyannlog, catId, actionId);
        if (success) {
            showPopup(FOOTPRINT_POINTS.nyannlog);
        }
    }, [isDemo, awardFootprints, showPopup]);

    const consumeFootprints = useCallback(async (type: string, points: number): Promise<boolean> => {
        const success = await rawConsumeFootprints(type, points);
        if (success) {
            // ポイント減少時のポップアップ（負の値を表示）
            showPopup(-Math.abs(points));
        }
        return success;
    }, [rawConsumeFootprints, showPopup]);

    // Auto-claim login bonus on mount (if available)
    useEffect(() => {
        if (loginBonusAvailable && !isDemo) {
            claimLoginBonus();
        }
    }, [loginBonusAvailable, isDemo, claimLoginBonus]);

    const value: FootprintContextValue = {
        stats,
        loading,
        loginBonusAvailable,
        refreshStats: refresh,
        claimLoginBonus,
        awardForCare,
        awardForObservation,
        awardForPhoto,
        awardForIncident,
        awardForNyannlog,
        consumeFootprints,
    };

    return (
        <FootprintContext.Provider value={value}>
            {children}
            <FootprintPopup
                key={popupState.key}
                points={popupState.points}
                isVisible={popupState.visible}
                onComplete={hidePopup}
            />
        </FootprintContext.Provider>
    );
}
