"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

interface UserReadTimestamps {
    lastSeenPhotoAt: string;
    lastSeenIncidentAt: string;
}

const DEFAULT_TIMESTAMPS: UserReadTimestamps = {
    lastSeenPhotoAt: new Date(0).toISOString(),
    lastSeenIncidentAt: new Date(0).toISOString(),
};

export function useUserReadTimestamps() {
    const { user } = useAuth();
    const [timestamps, setTimestamps] = useState<UserReadTimestamps>(DEFAULT_TIMESTAMPS);
    const [loading, setLoading] = useState(true);

    // Fetch timestamps on mount / user change
    useEffect(() => {
        if (!user) {
            setTimestamps(DEFAULT_TIMESTAMPS);
            setLoading(false);
            return;
        }

        const fetchTimestamps = async () => {
            const supabase = createClient();
            const { data, error } = await (supabase as any)
                .from('users')
                .select('last_seen_photo_at, last_seen_incident_at')
                .eq('id', user.id)
                .single();

            if (data) {
                setTimestamps({
                    lastSeenPhotoAt: data.last_seen_photo_at || DEFAULT_TIMESTAMPS.lastSeenPhotoAt,
                    lastSeenIncidentAt: data.last_seen_incident_at || DEFAULT_TIMESTAMPS.lastSeenIncidentAt,
                });
            }
            setLoading(false);
        };

        fetchTimestamps();
    }, [user]);

    // Update photo timestamp (call when photo sheet closes)
    const markPhotosAsSeen = useCallback(async () => {
        if (!user) return;

        const now = new Date().toISOString();
        const supabase = createClient();

        await (supabase as any)
            .from('users')
            .update({ last_seen_photo_at: now })
            .eq('id', user.id);

        setTimestamps(prev => ({ ...prev, lastSeenPhotoAt: now }));
    }, [user]);

    // Update incident timestamp (call when incident sheet closes)
    const markIncidentsAsSeen = useCallback(async () => {
        if (!user) return;

        const now = new Date().toISOString();
        const supabase = createClient();

        await (supabase as any)
            .from('users')
            .update({ last_seen_incident_at: now })
            .eq('id', user.id);

        setTimestamps(prev => ({ ...prev, lastSeenIncidentAt: now }));
    }, [user]);

    return {
        ...timestamps,
        loading,
        markPhotosAsSeen,
        markIncidentsAsSeen,
    };
}
