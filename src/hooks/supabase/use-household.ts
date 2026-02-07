"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';

export function useHouseholdMembers(householdId: string | null) {
    const supabase = createClient() as any;

    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ['householdMembers', householdId],
        queryFn: async () => {
            if (!householdId) return [];
            const { data, error } = await supabase
                .from('users')
                .select('id, display_name, household_id')
                .eq('household_id', householdId);

            if (error) throw error;
            return data;
        },
        enabled: !!householdId,
    });

    return { members, loading };
}
