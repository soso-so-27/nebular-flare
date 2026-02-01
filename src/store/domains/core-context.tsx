"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { AppEvent } from '@/types';
import { createClient } from '@/lib/supabase';
import { uploadUserAvatar } from '@/lib/storage';

interface CoreContextType {
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
    householdUsers: any[];
    currentUserId: string | null;
    householdId: string | null;
    isDemo: boolean;
    uploadUserImage: (userId: string, file: File) => Promise<{ publicUrl: string | null; error: string | null }>;
}

const CoreContext = createContext<CoreContextType | undefined>(undefined);

export function CoreProvider({ children, householdId, currentUserId, isDemo }: { children: ReactNode; householdId: string | null; currentUserId: string | null; isDemo: boolean }) {
    const supabase = createClient() as any;
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [householdUsers, setHouseholdUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!householdId || isDemo) return;
        const fetchUsers = async () => {
            const { data } = await supabase.from('users').select('id, display_name, avatar_url').eq('household_id', householdId);
            if (data) setHouseholdUsers(data.map((u: any) => ({ id: u.id, display_name: u.display_name || 'Unknown', avatar_url: u.avatar_url, role: 'member', joined_at: null })));
        };
        fetchUsers();
        const chan = supabase.channel('core-users').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `household_id=eq.${householdId}` }, () => fetchUsers()).subscribe();
        return () => { supabase.removeChannel(chan); };
    }, [householdId, isDemo, supabase]);

    const uploadUserImage = useCallback(async (userId: string, file: File) => {
        if (isDemo) return { publicUrl: '/demo-avatar.png', error: null };
        const result = await uploadUserAvatar(userId, file);
        return { publicUrl: result.publicUrl, error: result.error };
    }, [isDemo]);

    const value = useMemo(() => ({ events, setEvents, householdUsers, currentUserId, householdId, isDemo, uploadUserImage }), [events, householdUsers, currentUserId, householdId, isDemo, uploadUserImage]);
    return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>;
}

export function useCoreContext() {
    const context = useContext(CoreContext);
    if (!context) throw new Error('useCoreContext must be used within CoreProvider');
    return context;
}
