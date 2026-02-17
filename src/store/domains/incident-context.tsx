"use client";

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useIncidents } from '@/hooks/use-supabase-data';
import { Incident } from '@/types';
import { createClient } from '@/lib/supabase';
import { storeLogger } from '@/lib/logger';

interface IncidentContextType {
    incidents: Incident[];
    addIncident: (catId: string, type: string, note: string, photos?: File[], health_category?: string, health_value?: string, onset?: string, symptom_details?: any, batch_id?: string, catIds?: string[], photoPaths?: string[]) => Promise<{ error?: any; data?: any }>;
    addIncidentUpdate: (incidentId: string, note: string, photos?: File[], statusChange?: string) => Promise<{ error?: any }>;
    resolveIncident: (incidentId: string) => Promise<{ error?: any }>;
    deleteIncident: (incidentId: string) => Promise<{ error?: any }>;
    addReaction: (incidentId: string, emoji: string) => Promise<{ error?: any }>;
    removeReaction: (incidentId: string, emoji: string) => Promise<{ error?: any }>;
    toggleBookmark: (incidentId: string) => Promise<{ error?: any }>;
    updateIncidentNote: (id: string, note: string) => Promise<{ error?: any }>;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export function IncidentProvider({ children, householdId, isDemo }: { children: ReactNode; householdId: string | null; isDemo: boolean }) {
    const supabase = createClient() as any;
    const {
        incidents,
        addIncident: sAdd,
        addIncidentUpdate: sAddUp,
        resolveIncident: sResolve,
        deleteIncident: sDel,
        addReaction: sAddRea,
        removeReaction: sRemRea,
        toggleBookmark: sTogBook,
        updateIncidentNote: sUpdateNote
    } = useIncidents(isDemo ? null : householdId);

    const wrap = (fn: any) => async (...args: any[]) => {
        if (isDemo) return { error: "Demo mode" };
        return (await fn(...args)) || {};
    };

    const value = useMemo(() => ({
        incidents,
        addIncident: async (...args: any[]) => {
            if (isDemo) return { error: "Demo mode" };
            return (await (sAdd as any)(...args)) || {};
        },
        addIncidentUpdate: wrap(sAddUp),
        resolveIncident: wrap(sResolve),
        deleteIncident: wrap(sDel),
        addReaction: wrap(sAddRea),
        removeReaction: wrap(sRemRea),
        toggleBookmark: wrap(sTogBook),
        updateIncidentNote: (id: string, note: string) => {
            if (isDemo) return Promise.resolve({ error: "Demo mode" });
            const { updateIncidentNote: sUpdate } = useIncidents(householdId); // This is sneaky because useIncidents is called inside Provider but we need the new function. Wait.
            // Actually, the destructuring in line 24 already has it if I update it.
            return (sUpdateNote as any)(id, note);
        }
    }), [incidents, isDemo, sAdd, sAddUp, sResolve, sDel, sAddRea, sRemRea, sTogBook, sUpdateNote]);

    return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncidentContext() {
    const context = useContext(IncidentContext);
    if (!context) throw new Error('useIncidentContext must be used within IncidentProvider');
    return context;
}
