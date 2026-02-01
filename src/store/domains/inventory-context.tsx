"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { InventoryItem } from '@/types';
import { useInventory } from '@/hooks/use-supabase-data';
import { DEFAULT_INVENTORY_ITEMS } from '@/lib/constants';
import { createClient } from '@/lib/supabase';

interface InventoryContextType {
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    addInventoryItem: (label: string, minDays: number, maxDays: number, settings?: Partial<InventoryItem>) => Promise<void>;
    updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
    deleteInventoryItem: (id: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children, householdId, isDemo }: { children: ReactNode; householdId: string | null; isDemo: boolean }) {
    const supabase = createClient() as any;
    const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
    const { inventory: supabaseInventory } = useInventory(isDemo ? null : householdId);

    useEffect(() => {
        if (!isDemo && supabaseInventory.length > 0) {
            setInventory(supabaseInventory.map((item: any) => ({
                ...item,
                stockLevel: item.stock_level,
                alertEnabled: item.alert_enabled
            })));
        }
    }, [isDemo, supabaseInventory]);

    const addInventoryItem = useCallback(async (label: string, minDays: number, maxDays: number, settings?: Partial<InventoryItem>) => {
        const id = `inv_${Date.now()}`;
        const newItem: InventoryItem = { id, label, range: [minDays, maxDays], last: 'まだある', stockLevel: 'full', alertEnabled: true, ...settings };
        setInventory(prev => [...prev, newItem]);
        if (!isDemo && householdId) {
            await supabase.from('inventory').insert({ id, household_id: householdId, label, range_min: minDays, range_max: maxDays, stock_level: newItem.stockLevel, alert_enabled: newItem.alertEnabled });
        }
    }, [isDemo, householdId, supabase]);

    const updateInventoryItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
        if (!isDemo && householdId) {
            const dbUp: any = {};
            if (updates.label) dbUp.label = updates.label;
            if (updates.range_max) dbUp.range_max = updates.range_max;
            if (updates.stockLevel) dbUp.stock_level = updates.stockLevel;
            if (updates.alertEnabled !== undefined) dbUp.alert_enabled = updates.alertEnabled;
            await supabase.from('inventory').update(dbUp).eq('id', id);
        }
    }, [isDemo, householdId, supabase]);

    const deleteInventoryItem = useCallback(async (id: string) => {
        setInventory(prev => prev.filter(i => i.id !== id));
        if (!isDemo && householdId) await supabase.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }, [isDemo, householdId, supabase]);

    const value = useMemo(() => ({ inventory, setInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem }), [inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem]);
    return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventoryContext() {
    const context = useContext(InventoryContext);
    if (!context) throw new Error('useInventoryContext must be used within InventoryProvider');
    return context;
}
