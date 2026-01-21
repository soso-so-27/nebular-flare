"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppState } from '@/store/app-store';
import { toast } from 'sonner';

export interface AdhocTask {
    id: string;
    label: string;
    done: boolean;
    done_at: string | null;
    created_at: string;
    created_by: string | null;
}

export function useAdhocTasks() {
    const [adhocTasks, setAdhocTasks] = useState<AdhocTask[]>([]);
    const [loading, setLoading] = useState(true);
    const { householdId } = useAppState();
    const supabase = createClient() as any;

    // Fetch adhoc tasks for today
    const fetchTasks = useCallback(async () => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        // Get today's start (4AM cutoff like other care tasks)
        const now = new Date();
        const dayStart = new Date(now);
        if (now.getHours() < 4) {
            dayStart.setDate(dayStart.getDate() - 1);
        }
        dayStart.setHours(4, 0, 0, 0);

        const { data, error } = await supabase
            .from('adhoc_tasks')
            .select('*')
            .eq('household_id', householdId)
            .gte('created_at', dayStart.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching adhoc tasks:', error);
        } else {
            setAdhocTasks(data || []);
        }
        setLoading(false);
    }, [householdId, supabase]);

    useEffect(() => {
        fetchTasks();

        // Real-time subscription
        if (householdId) {
            const channel = supabase
                .channel('adhoc-tasks-changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'adhoc_tasks', filter: `household_id=eq.${householdId}` },
                    () => {
                        fetchTasks();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [householdId, supabase, fetchTasks]);

    // Add a new task
    const addAdhocTask = useCallback(async (label: string) => {
        if (!householdId) {
            toast.error('ログインしてください');
            return { error: 'No household' };
        }

        const { data, error } = await supabase
            .from('adhoc_tasks')
            .insert({
                household_id: householdId,
                label,
                done: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding adhoc task:', error);
            toast.error('追加できませんでした');
            return { error };
        }

        // Optimistically add to local state
        setAdhocTasks(prev => [...prev, data]);
        return { data };
    }, [householdId, supabase]);

    // Complete a task
    const completeAdhocTask = useCallback(async (taskId: string) => {
        const { error } = await supabase
            .from('adhoc_tasks')
            .update({
                done: true,
                done_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) {
            console.error('Error completing adhoc task:', error);
            return { error };
        }

        // Optimistically update local state
        setAdhocTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, done: true, done_at: new Date().toISOString() } : t
        ));
        return {};
    }, [supabase]);

    // Delete a task
    const deleteAdhocTask = useCallback(async (taskId: string) => {
        const { error } = await supabase
            .from('adhoc_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting adhoc task:', error);
            return { error };
        }

        setAdhocTasks(prev => prev.filter(t => t.id !== taskId));
        return {};
    }, [supabase]);

    // Get only pending tasks
    const pendingTasks = adhocTasks.filter(t => !t.done);

    return {
        adhocTasks,
        pendingTasks,
        loading,
        addAdhocTask,
        completeAdhocTask,
        deleteAdhocTask,
        refetch: fetchTasks
    };
}
