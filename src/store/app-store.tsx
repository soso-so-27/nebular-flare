"use client";

import React, { useMemo, ReactNode, useState } from 'react';
import { SettingsProvider, useSettingsContext } from './domains/settings-context';
import { CatProvider, useCatContext } from './domains/cat-context';
import { CareProvider, useCareContext } from './domains/care-context';
import { IncidentProvider, useIncidentContext } from './domains/incident-context';
import { InventoryProvider, useInventoryContext } from './domains/inventory-context';
import { MedicationProvider, useMedicationContext } from './domains/medication-context';
import { AlbumProvider, useAlbumContext } from './domains/album-context';
import { CoreProvider, useCoreContext } from './domains/core-context';

export {
    useSettingsContext,
    useCatContext,
    useCoreContext,
    useCareContext,
    useIncidentContext,
    useInventoryContext,
    useMedicationContext,
    useAlbumContext
};

type AppProviderProps = {
    children: ReactNode;
    householdId?: string | null;
    currentUserId?: string | null;
    isDemo?: boolean;
};

// Provider to aggregate all domain contexts
export function AppProvider({ children, householdId = null, currentUserId = null, isDemo = false }: AppProviderProps) {
    return (
        <SettingsProvider>
            <CoreProvider householdId={householdId} currentUserId={currentUserId} isDemo={isDemo}>
                <CatProvider householdId={householdId} isDemo={isDemo}>
                    <DomainAwareProviders householdId={householdId} isDemo={isDemo}>
                        {children}
                    </DomainAwareProviders>
                </CatProvider>
            </CoreProvider>
        </SettingsProvider>
    );
}

// Helper to inject data that depends on other providers
function DomainAwareProviders({ children, householdId, isDemo }: { children: ReactNode, householdId: string | null, isDemo: boolean }) {
    const { settings } = useSettingsContext();
    const { cats } = useCatContext();
    const catIds = useMemo(() => cats.map(c => c.id), [cats]);

    return (
        <CareProvider householdId={householdId} isDemo={isDemo} dayStartHour={settings.dayStartHour} catIds={catIds}>
            <IncidentProvider householdId={householdId} isDemo={isDemo}>
                <InventoryProvider householdId={householdId} isDemo={isDemo}>
                    <MedicationProvider householdId={householdId} isDemo={isDemo}>
                        <AlbumProvider householdId={householdId} isDemo={isDemo}>
                            {children}
                        </AlbumProvider>
                    </MedicationProvider>
                </InventoryProvider>
            </IncidentProvider>
        </CareProvider>
    );
}
