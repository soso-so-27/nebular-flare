"use client";

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { MedicationLog } from '@/types';
import { useMedicationLogs } from '@/hooks/use-supabase-data';

interface MedicationContextType {
    medicationLogs: MedicationLog[];
    addMedicationLog: (log: Partial<MedicationLog>) => Promise<{ error?: any; data?: any }>;
    updateMedicationLog: (id: string, log: Partial<MedicationLog>) => Promise<{ error?: any; data?: any }>;
    deleteMedicationLog: (id: string) => Promise<{ error?: any }>;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export function MedicationProvider({ children, householdId, isDemo }: { children: ReactNode; householdId: string | null; isDemo: boolean }) {
    const { medicationLogs, addMedicationLog: sAdd, updateMedicationLog: sUp, deleteMedicationLog: sDel } = useMedicationLogs(isDemo ? null : householdId);

    const wrap = (fn: any) => async (...args: any[]) => {
        if (isDemo) return { error: "Demo mode" };
        return (await fn(...args)) || {};
    };

    const value = useMemo(() => ({
        medicationLogs: medicationLogs || [],
        addMedicationLog: wrap(sAdd),
        updateMedicationLog: wrap(sUp),
        deleteMedicationLog: wrap(sDel)
    }), [medicationLogs, sAdd, sUp, sDel, isDemo]);

    return <MedicationContext.Provider value={value}>{children}</MedicationContext.Provider>;
}

export function useMedicationContext() {
    const context = useContext(MedicationContext);
    if (!context) throw new Error('useMedicationContext must be used within MedicationProvider');
    return context;
}
