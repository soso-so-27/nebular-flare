/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";
import type { MedicationLog } from '@/types';

/**
 * Hook for managing medication logs (prescriptions, treatments) within a household.
 */
export function useMedicationLogs(householdId: string | null) {
    const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const fetchMedicationLogs = useCallback(async () => {
        if (!householdId) return;
        try {
            const { data, error } = await supabase
                .from('medication_logs')
                .select('*')
                .eq('household_id', householdId)
                .order('starts_at', { ascending: false });

            if (error) throw error;
            setMedicationLogs(data as MedicationLog[]);
        } catch (e) {
            dbLogger.error("Error fetching medication logs:", e);
        } finally {
            setLoading(false);
        }
    }, [householdId, supabase]);

    useEffect(() => {
        fetchMedicationLogs();

        if (!householdId) return;

        const channel = supabase
            .channel('public:medication_logs')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'medication_logs', filter: `household_id=eq.${householdId}` },
                () => fetchMedicationLogs()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, fetchMedicationLogs, supabase]);

    const addMedicationLog = useCallback(async (log: Partial<MedicationLog>) => {
        if (!householdId) return { error: "No household" };
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('medication_logs')
                .insert({
                    ...log,
                    household_id: householdId,
                    created_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return { data };
        } catch (e) {
            dbLogger.error('addMedicationLog error:', e);
            return { error: e };
        }
    }, [householdId, supabase]);

    const updateMedicationLog = useCallback(async (id: string, log: Partial<MedicationLog>) => {
        try {
            const { data, error } = await supabase
                .from('medication_logs')
                .update(log)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data };
        } catch (e) {
            dbLogger.error('updateMedicationLog error:', e);
            return { error: e };
        }
    }, [supabase]);

    const deleteMedicationLog = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('medication_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return {};
        } catch (e) {
            dbLogger.error('deleteMedicationLog error:', e);
            return { error: e };
        }
    }, [supabase]);

    return { medicationLogs, loading, addMedicationLog, updateMedicationLog, deleteMedicationLog, refetch: fetchMedicationLogs };
}
