"use client";

import React, { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import { useIncidents } from '@/hooks/use-supabase-data';
import { Incident } from '@/types';

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

    const wrap = useCallback((fn: any) => async (...args: any[]) => {
        if (isDemo) return { error: "Demo mode" };
        return (await fn(...args)) || {};
    }, [isDemo]);

    const addIncident = useCallback(async (...args: any[]) => {
        if (isDemo) return { error: "Demo mode" };
        return (await (sAdd as any)(...args)) || {};
    }, [isDemo, sAdd]);

    const value = useMemo(() => ({
        incidents,
        addIncident,
        addIncidentUpdate: wrap(sAddUp),
        resolveIncident: wrap(sResolve),
        deleteIncident: wrap(sDel),
        addReaction: wrap(sAddRea),
        removeReaction: wrap(sRemRea),
        toggleBookmark: wrap(sTogBook),
        updateIncidentNote: (id: string, note: string) => {
            if (isDemo) return Promise.resolve({ error: "Demo mode" });
            return (sUpdateNote as any)(id, note);
        }
    }), [addIncident, incidents, isDemo, sAddUp, sResolve, sDel, sAddRea, sRemRea, sTogBook, sUpdateNote, wrap]);

    return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncidentContext() {
    const context = useContext(IncidentContext);
    if (!context) throw new Error('useIncidentContext must be used within IncidentProvider');
    return context;
}
