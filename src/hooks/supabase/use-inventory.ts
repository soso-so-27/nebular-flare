/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Inventory = Database['public']['Tables']['inventory']['Row'];

/**
 * Hook for managing household inventory items.
 * Handles fetching, real-time updates, and marking items as bought.
 */
export function useInventory(householdId: string | null) {
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchInventory() {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null);

            if (!error && data) {
                setInventory(data);
            }
            setLoading(false);
        }

        fetchInventory();

        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'inventory', filter: `household_id=eq.${householdId}` },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setInventory(prev => [...prev, payload.new as Inventory]);
                    } else if (payload.eventType === 'UPDATE') {
                        setInventory(prev => prev.map(i => i.id === (payload.new as Inventory).id ? payload.new as Inventory : i));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId]);

    async function markBought(itemId: string) {
        const { error } = await supabase
            .from('inventory')
            .update({
                last_bought: new Date().toISOString().split('T')[0],
                range_min: 30,
                range_max: 45
            })
            .eq('id', itemId);

        return { error };
    }

    return { inventory, loading, markBought };
}
