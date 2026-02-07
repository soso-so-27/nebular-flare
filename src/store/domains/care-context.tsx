"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { CareTaskDef, NoticeDef, NoticeLog, SignalLog, Task } from '@/types';
import { useTodayCareLogs, useTodayHouseholdObservations } from '@/hooks/use-supabase-data';
import { DEFAULT_TASKS, DEFAULT_NOTICE_DEFS, DEFAULT_CARE_TASK_DEFS } from '@/lib/constants';
import { createClient } from '@/lib/supabase';
import { storeLogger } from '@/lib/logger';

interface CareContextType {
    careLogs: any[];
    observations: any[];
    noticeLogs: Record<string, Record<string, NoticeLog>>;
    signalLogs: Record<string, Record<string, SignalLog>>;
    careTaskDefs: CareTaskDef[];
    noticeDefs: NoticeDef[];
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    demoCareLogsDone: Record<string, string>;
    addCareLog: (type: string, catId?: string | null, note?: string, images?: File[]) => Promise<{ error?: any }>;
    deleteCareLog: (id: string) => Promise<{ error?: any }>;
    addObservation: (catId: string, type: string, value: string, note?: string, images?: File[]) => Promise<{ error?: any }>;
    acknowledgeObservation: (id: string) => Promise<{ error?: any }>;
    deleteObservation: (id: string) => Promise<{ error?: any }>;
    addCareTask: (title: string, settings?: Partial<CareTaskDef>) => void;
    updateCareTask: (id: string, updates: Partial<CareTaskDef>) => void;
    deleteCareTask: (id: string) => void;
    addNoticeDef: (title: string, settings?: Partial<NoticeDef>) => void;
    updateNoticeDef: (id: string, updates: Partial<NoticeDef>) => void;
    deleteNoticeDef: (id: string) => void;
    initializeCareDefaults: () => Promise<void>;
    updateCareLogNote: (id: string, note: string) => Promise<{ error?: any }>;
    updateObservationNote: (id: string, note: string) => Promise<{ error?: any }>;
}

const CareContext = createContext<CareContextType | undefined>(undefined);

export function CareProvider({ children, householdId, isDemo, dayStartHour, catIds }: { children: ReactNode; householdId: string | null; isDemo: boolean; dayStartHour: number; catIds: string[] }) {
    const supabase = createClient() as any;
    const [careTaskDefs, setCareTaskDefs] = useState<CareTaskDef[]>([]);
    const [noticeDefs, setNoticeDefs] = useState<NoticeDef[]>(DEFAULT_NOTICE_DEFS);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [demoCareLogsDone, setDemoCareLogsDone] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined' && isDemo) {
            const today = new Date().toISOString().split('T')[0];
            try {
                const saved = localStorage.getItem('demoCareLogsDone');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const todayLogs: Record<string, string> = {};
                    for (const [key, value] of Object.entries(parsed)) {
                        if (typeof value === 'string' && value.startsWith(today)) todayLogs[key] = value;
                    }
                    return todayLogs;
                }
            } catch (e) { }
        }
        return {};
    });

    const [noticeLogs, setNoticeLogs] = useState<Record<string, Record<string, NoticeLog>>>(() => {
        if (isDemo) {
            const now = new Date();
            return {
                'c1': { 'notice_vomit': { id: 'c1_v_demo', noticeId: 'notice_vomit', catId: 'c1', at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(), value: '1回吐いた', done: false, later: false } },
                'c2': { 'notice_water': { id: 'c2_w_demo', noticeId: 'notice_water', catId: 'c2', at: new Date(now.getTime() - 3600 * 1000).toISOString(), value: '水をたくさん飲む', done: false, later: false } }
            } as Record<string, Record<string, NoticeLog>>;
        }
        return {};
    });
    const [signalLogs] = useState<Record<string, Record<string, SignalLog>>>({});

    const { careLogs: supabaseCareLogs, addCareLog: supabaseAddCareLog, deleteCareLog: supabaseDeleteCareLog, updateCareLogNote: supabaseUpdateCareLogNote } = useTodayCareLogs(isDemo ? null : householdId, dayStartHour);
    const { observations, addObservation: supabaseAddObservation, acknowledgeObservation: supabaseAcknowledgeObservation, deleteObservation: supabaseDeleteObservation, updateObservationNote: supabaseUpdateObservationNote } = useTodayHouseholdObservations(isDemo ? null : householdId, dayStartHour);

    useEffect(() => {
        if (isDemo) localStorage.setItem('demoCareLogsDone', JSON.stringify(demoCareLogsDone));
    }, [demoCareLogsDone, isDemo]);

    useEffect(() => {
        if (catIds.length > 0) {
            const newTasks = catIds.flatMap(id => DEFAULT_TASKS.map(t => ({ ...t, id: `${id}_${t.id}`, catId: id, done: false, later: false })));
            setTasks(newTasks);
        }
    }, [catIds]);

    const careLogs = useMemo(() => {
        if (isDemo) return Object.entries(demoCareLogsDone).map(([type, doneAt]) => ({ id: `demo_${type}_${doneAt}`, type, done_at: doneAt, date: doneAt.split('T')[0], cat_id: null, done_by: null }));
        return supabaseCareLogs;
    }, [isDemo, demoCareLogsDone, supabaseCareLogs]);

    // Initial Fetch
    useEffect(() => {
        if (!householdId || isDemo) return;
        const fetchData = async () => {
            const { data: ctData } = await supabase.from('care_task_defs').select('*').eq('household_id', householdId).is('deleted_at', null);
            if (ctData) setCareTaskDefs(ctData.map((t: any) => ({
                id: t.id, title: t.title, icon: t.icon,
                frequency: t.frequency.includes('daily') ? 'daily' : t.frequency,
                frequencyType: t.frequency_type || 'fixed',
                frequencyCount: t.frequency_count || (t.frequency === 'twice-daily' ? 2 : 1),
                timeOfDay: t.time_of_day, mealSlots: t.meal_slots, perCat: t.per_cat,
                targetCatIds: t.target_cat_ids, enabled: t.enabled, intervalHours: t.interval_hours
            })));
            const { data: ndData } = await supabase.from('notice_defs').select('*').eq('household_id', householdId).is('deleted_at', null);
            if (ndData) setNoticeDefs(ndData.map((n: any) => ({
                id: n.id, title: n.title, kind: n.kind, cadence: n.cadence, due: n.due, choices: n.choices, enabled: n.enabled, optional: n.optional,
                inputType: n.input_type || 'ok-notice', category: n.category || 'physical', required: n.required || false
            })));
        };
        fetchData();
    }, [householdId, isDemo, supabase]);

    const wrap = (fn: any) => async (...args: any[]) => {
        if (isDemo) return { error: "Demo mode" };
        return (await fn(...args)) || {};
    };

    const addCareLog = useCallback(async (type: string, catId?: string | null, note?: string, images?: File[]) => {
        if (isDemo) { setDemoCareLogsDone(prev => ({ ...prev, [type]: new Date().toISOString() })); return {}; }
        await supabaseAddCareLog(type, catId || undefined, note, images);
        return {};
    }, [isDemo, supabaseAddCareLog]);

    const deleteCareLog = useCallback(async (id: string) => {
        if (id.startsWith('demo_')) { setDemoCareLogsDone(prev => { const next = { ...prev }; const k = Object.keys(next).find(x => `demo_${x}_${next[x]}` === id); if (k) delete next[k]; return next; }); return {}; }
        await supabaseDeleteCareLog(id);
        return {};
    }, [isDemo, supabaseDeleteCareLog]);

    const addObservation = useCallback(async (catId: string, type: string, value: string, note?: string, images?: File[]) => {
        if (isDemo) { setNoticeLogs(prev => ({ ...prev, [catId]: { ...prev[catId], [type]: { id: `${catId}_${type}_${Date.now()}`, catId, noticeId: type, value, at: new Date().toISOString(), done: true, later: false } } })); return {}; }
        await supabaseAddObservation(catId, type, value, note, images);
        return {};
    }, [isDemo, supabaseAddObservation]);

    const acknowledgeObservation = useCallback(async (id: string) => {
        if (isDemo) { setNoticeLogs(prev => { const next = { ...prev }; for (const c in next) for (const n in next[c]) if (next[c][n].id === id) next[c][n].done = true; return { ...next }; }); return {}; }
        await supabaseAcknowledgeObservation(id);
        return {};
    }, [isDemo, supabaseAcknowledgeObservation]);

    const deleteObservation = useCallback(async (id: string) => {
        if (isDemo) { setNoticeLogs(prev => { const next = { ...prev }; for (const c in next) for (const n in next[c]) if (next[c][n].id === id) delete next[c][n]; return { ...next }; }); return {}; }
        await supabaseDeleteObservation(id);
        return {};
    }, [isDemo, supabaseDeleteObservation]);

    const addCareTask = useCallback(async (title: string, settings?: Partial<CareTaskDef>) => {
        if (!householdId || isDemo) return;
        await supabase.from('care_task_defs').insert({ household_id: householdId, title, ...settings });
    }, [householdId, isDemo, supabase]);

    const updateCareTask = useCallback(async (id: string, updates: Partial<CareTaskDef>) => {
        if (!householdId || isDemo) return;
        await supabase.from('care_task_defs').update(updates).eq('id', id);
    }, [householdId, isDemo, supabase]);

    const deleteCareTask = useCallback(async (id: string) => {
        if (!householdId || isDemo) return;
        await supabase.from('care_task_defs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }, [householdId, isDemo, supabase]);

    const addNoticeDef = useCallback(async (title: string, settings?: Partial<NoticeDef>) => {
        if (!householdId || isDemo) return;
        await supabase.from('notice_defs').insert({ household_id: householdId, title, ...settings });
    }, [householdId, isDemo, supabase]);

    const updateNoticeDef = useCallback(async (id: string, updates: Partial<NoticeDef>) => {
        if (!householdId || isDemo) return;
        await supabase.from('notice_defs').update(updates).eq('id', id);
    }, [householdId, isDemo, supabase]);

    const deleteNoticeDef = useCallback(async (id: string) => {
        if (!householdId || isDemo) return;
        await supabase.from('notice_defs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }, [householdId, isDemo, supabase]);

    const initializeCareDefaults = useCallback(async () => {
        if (isDemo || !householdId) return;
        try {
            const { count } = await supabase.from('care_task_defs').select('*', { count: 'exact', head: true });
            if (count === 0) {
                const tasks = DEFAULT_CARE_TASK_DEFS.map(d => ({ household_id: householdId, title: d.title, icon: d.icon, frequency: d.frequency, enabled: true }));
                await supabase.from('care_task_defs').insert(tasks);
            }
            window.location.reload();
        } catch (e) { storeLogger.error(e); }
    }, [householdId, isDemo, supabase]);

    const value = useMemo(() => ({
        careLogs, observations, noticeLogs, signalLogs, careTaskDefs, noticeDefs, tasks, setTasks, demoCareLogsDone,
        addCareLog, deleteCareLog, addObservation, acknowledgeObservation, deleteObservation,
        addCareTask, updateCareTask, deleteCareTask, addNoticeDef, updateNoticeDef, deleteNoticeDef, initializeCareDefaults,
        updateCareLogNote: wrap(supabaseUpdateCareLogNote),
        updateObservationNote: wrap(supabaseUpdateObservationNote)
    }), [careLogs, observations, noticeLogs, signalLogs, careTaskDefs, noticeDefs, tasks, setTasks, demoCareLogsDone, addCareLog, deleteCareLog, addObservation, acknowledgeObservation, deleteObservation, addCareTask, updateCareTask, deleteCareTask, addNoticeDef, updateNoticeDef, deleteNoticeDef, initializeCareDefaults, supabaseUpdateCareLogNote, supabaseUpdateObservationNote]);

    return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}

export function useCareContext() {
    const context = useContext(CareContext);
    if (!context) throw new Error('useCareContext must be used within CareProvider');
    return context;
}
