"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Cat, Task, AppSettings, NoticeDef, NoticeLog, SignalDef, SignalLog, InventoryItem, AppEvent, Memo, CareTaskDef } from '@/types';
import { DEFAULT_TASKS, DEFAULT_NOTICE_DEFS, SIGNAL_DEFS, DEFAULT_CARE_TASK_DEFS, DEFAULT_INVENTORY_ITEMS } from '@/lib/constants';
import { useCats as useSupabaseCats, useTodayCareLogs, useTodayObservations } from '@/hooks/use-supabase-data';
import { createClient } from '@/lib/supabase';

type AppState = {
    isPro: boolean;
    setIsPro: (v: boolean) => void;
    aiEnabled: boolean;
    setAiEnabled: (v: boolean) => void;
    activeCatId: string;
    setActiveCatId: (v: string) => void;
    cats: Cat[];
    catsLoading: boolean;
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    noticeDefs: NoticeDef[];
    setNoticeDefs: React.Dispatch<React.SetStateAction<NoticeDef[]>>;
    noticeLogs: Record<string, Record<string, NoticeLog>>; // catId -> noticeId -> log
    setNoticeLogs: React.Dispatch<React.SetStateAction<Record<string, Record<string, NoticeLog>>>>;
    signalLogs: Record<string, Record<string, SignalLog>>; // catId -> signalId -> log
    setSignalLogs: React.Dispatch<React.SetStateAction<Record<string, Record<string, SignalLog>>>>;
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    memos: { draft: string; items: Memo[] };
    setMemos: React.Dispatch<React.SetStateAction<{ draft: string; items: Memo[] }>>;
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    lastSeenAt: string;
    setLastSeenAt: (v: string) => void;
    householdId: string | null;
    isDemo: boolean;
    // Supabase functions
    addCareLog: (type: string, slotOrCatId?: string, catId?: string) => Promise<{ error: any } | undefined>;
    addObservation: (type: string, value: string) => Promise<{ error: any } | undefined>;
    careLogs: { type: string; done_at: string; slot?: string; date?: string; id?: string; cat_id?: string | null }[];
    demoCareLogsDone: Record<string, string>; // taskId -> doneAt ISO string
    observations: any[];
    refetchCats: () => void;
    // CRUD functions for settings
    addCareTask: (title: string, settings?: Partial<CareTaskDef>) => void;
    updateCareTask: (id: string, updates: Partial<CareTaskDef>) => void;
    deleteCareTask: (id: string) => void;
    addNoticeDef: (title: string, settings?: Partial<NoticeDef>) => void;
    updateNoticeDef: (id: string, updates: Partial<NoticeDef>) => void;
    deleteNoticeDef: (id: string) => void;
    addInventoryItem: (label: string, minDays: number, maxDays: number, settings?: Partial<InventoryItem>) => void;
    updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
    deleteInventoryItem: (id: string) => void;
    updateInvThreshold: (key: 'soon' | 'urgent' | 'critical', value: number) => void;
    careTaskDefs: CareTaskDef[];
    // Notification
    fcmToken: string | null;
    setFcmToken: (token: string | null) => void;
    // Defaults
    initializeDefaults: () => Promise<void>;
};

const AppContext = createContext<AppState | undefined>(undefined);

type AppProviderProps = {
    children: ReactNode;
    householdId?: string | null;
    isDemo?: boolean;
};

export function AppProvider({ children, householdId = null, isDemo = false }: AppProviderProps) {
    const [isPro, setIsPro] = useState(true);
    const [aiEnabled, setAiEnabled] = useState(true);
    const [activeCatId, setActiveCatId] = useState('');

    // Demo mode: use hardcoded cats
    const demoCats: Cat[] = useMemo(() => [
        { id: "c1", name: "麦", age: "2才", sex: "オス", avatar: "🐈" },
        { id: "c2", name: "雨", age: "2才", sex: "オス", avatar: "🐈‍⬛" },
    ], []);

    // Use Supabase cats or demo cats based on mode
    const { cats: supabaseCats, loading: catsLoading, refetch: refetchCats } = useSupabaseCats(isDemo ? null : householdId);

    // Notification State
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    // Use Supabase care logs
    const { careLogs: supabaseCareLogs, addCareLog: supabaseAddCareLog } = useTodayCareLogs(isDemo ? null : householdId);

    // Demo mode care log tracking - using care task ID as key, doneAt ISO string as value
    const today = new Date().toISOString().split('T')[0];

    const [demoCareLogsDone, setDemoCareLogsDone] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined' && isDemo) {
            try {
                const saved = localStorage.getItem('demoCareLogsDone');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const todayLogs: Record<string, string> = {};
                    for (const [key, value] of Object.entries(parsed)) {
                        if (typeof value === 'string' && String(value).startsWith(today)) {
                            todayLogs[key] = String(value);
                        }
                    }
                    return todayLogs;
                }
            } catch (e) { }
        }
        return {};
    });

    const supabase = createClient() as any;

    // Load initial settings data from Supabase
    useEffect(() => {
        if (!householdId || isDemo) return;

        const fetchData = async () => {
            // Care Tasks
            const { data: ctData } = await supabase
                .from('care_task_defs')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null);

            if (ctData) {
                setCareTaskDefs(ctData.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    icon: t.icon,
                    frequency: t.frequency,
                    timeOfDay: t.time_of_day,
                    mealSlots: t.meal_slots,
                    perCat: t.per_cat,
                    enabled: t.enabled
                })) as CareTaskDef[]);
            }

            // Notice Defs
            const { data: ndData } = await supabase
                .from('notice_defs')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null);

            if (ndData) {
                setNoticeDefs(ndData.map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    kind: n.kind,
                    cadence: n.cadence,
                    due: n.due,
                    choices: n.choices,
                    enabled: n.enabled,
                    optional: n.optional,
                    inputType: n.input_type || 'ok-notice',
                    category: n.category || 'physical',
                    required: n.required || false
                })) as NoticeDef[]);
            }

            // Inventory
            const { data: invData } = await supabase
                .from('inventory')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null);

            if (invData) {
                setInventory(invData as InventoryItem[]);
            }
        };

        fetchData();
    }, [householdId, isDemo]);

    // Persist demoCareLogsDone
    useEffect(() => {
        if (isDemo) {
            localStorage.setItem('demoCareLogsDone', JSON.stringify(demoCareLogsDone));
        }
    }, [demoCareLogsDone, isDemo]);

    // Convert demo care logs to same format as Supabase
    const careLogs = useMemo(() => {
        if (isDemo) {
            return Object.entries(demoCareLogsDone).map(([type, doneAt]) => ({
                id: `demo_${type}_${doneAt}`,
                type,
                done_at: doneAt,
                date: doneAt.split('T')[0],
                cat_id: null,
            }));
        }
        return supabaseCareLogs;
    }, [isDemo, demoCareLogsDone, supabaseCareLogs]);

    // Use Supabase observations for active cat
    const { observations, addObservation: supabaseAddObservation } = useTodayObservations(isDemo ? null : activeCatId);

    // Convert Supabase cats to local Cat type - memoize to avoid infinite loops
    const cats: Cat[] = useMemo(() => {
        if (isDemo) return demoCats;
        return supabaseCats.map(c => ({
            id: c.id,
            name: c.name,
            age: c.birthday ? `${Math.floor((Date.now() - new Date(c.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}才` : '年齢不明',
            sex: c.sex || 'オス',
            avatar: c.avatar || '🐈',
            birthday: c.birthday || undefined,
        }));
    }, [isDemo, supabaseCats, demoCats]);

    // Stable cat IDs for dependency tracking
    const catIds = useMemo(() => cats.map(c => c.id).join(','), [cats]);

    // Set active cat when cats are loaded
    useEffect(() => {
        if (cats.length > 0 && !activeCatId) {
            setActiveCatId(cats[0].id);
        }
    }, [catIds]); // eslint-disable-line react-hooks/exhaustive-deps

    const [tasks, setTasks] = useState<Task[]>([]);

    // Update tasks when cats change
    useEffect(() => {
        if (cats.length > 0) {
            setTasks(prevTasks => {
                const catTasks = cats.flatMap(cat =>
                    DEFAULT_TASKS.map(t => ({
                        ...t,
                        id: `${cat.id}_${t.id}`,
                        catId: cat.id,
                        done: false,
                        later: false
                    }))
                );
                return catTasks;
            });
        }
    }, [catIds]); // eslint-disable-line react-hooks/exhaustive-deps

    const [noticeDefs, setNoticeDefs] = useState<NoticeDef[]>(DEFAULT_NOTICE_DEFS);

    // Demo notice logs with some abnormal values to show in cat tab overlay
    const [noticeLogs, setNoticeLogs] = useState<Record<string, Record<string, NoticeLog>>>(() => {
        // Create demo data for cat tab overlay
        if (isDemo) {
            const now = new Date();
            return {
                'c1': {
                    'notice_vomit': {
                        id: 'c1_notice_vomit_demo',
                        noticeId: 'notice_vomit',
                        catId: 'c1',
                        at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                        value: '1回吐いた',
                        done: false,
                        later: false
                    },
                    'notice_appetite': {
                        id: 'c1_notice_appetite_demo',
                        noticeId: 'notice_appetite',
                        catId: 'c1',
                        at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                        value: '食欲がない',
                        done: false,
                        later: false
                    }
                },
                'c2': {
                    'notice_water': {
                        id: 'c2_notice_water_demo',
                        noticeId: 'notice_water',
                        catId: 'c2',
                        at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                        value: '水をたくさん飲む',
                        done: false,
                        later: false
                    }
                }
            } as Record<string, Record<string, NoticeLog>>;
        }
        return {};
    });
    const [signalLogs, setSignalLogs] = useState<Record<string, Record<string, SignalLog>>>({});

    const [inventory, setInventory] = useState<InventoryItem[]>(() => {
        // Load from localStorage in demo mode
        if (typeof window !== 'undefined' && isDemo) {
            const saved = localStorage.getItem('inventory');
            if (saved) return JSON.parse(saved);
        }
        // Use centralized defaults from constants
        return DEFAULT_INVENTORY_ITEMS;
    });

    const [memos, setMemos] = useState<{ draft: string; items: Memo[] }>({
        draft: "",
        items: [],
    });

    const [events, setEvents] = useState<AppEvent[]>([]);
    const [settings, setSettings] = useState<AppSettings>(() => ({
        plan: 'Free',
        aiEnabled: true,
        engagement: 'passive',
        homeMode: 'checklist',
        weeklySummaryEnabled: true,
        quietHours: { start: 23, end: 7 },
        invThresholds: { soon: 7, urgent: 3, critical: 1 },
        seasonalDeckEnabled: true,
        skinPackOwned: false,
        skinMode: 'default',
        photoTagAssist: true,
        dayStartHour: 4,
    }));
    const [lastSeenAt, setLastSeenAt] = useState<string>(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Load from localStorage (Local-first for demo mode)
    useEffect(() => {
        if (isDemo) {
            try {
                const savedTasks = localStorage.getItem('tasks');
                if (savedTasks) setTasks(JSON.parse(savedTasks));
                const savedLastSeen = localStorage.getItem('last_seen_at');
                if (savedLastSeen) setLastSeenAt(savedLastSeen);
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
    }, [isDemo]);

    useEffect(() => {
        if (isDemo && tasks.length > 0) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }, [tasks, isDemo]);

    useEffect(() => {
        localStorage.setItem('last_seen_at', lastSeenAt);
    }, [lastSeenAt]);

    // Care task definitions (customizable) - use defaults from constants
    const [careTaskDefs, setCareTaskDefs] = useState<CareTaskDef[]>(() => {
        if (typeof window !== 'undefined' && isDemo) {
            const saved = localStorage.getItem('careTaskDefs');
            if (saved) return JSON.parse(saved);
        }
        // Use centralized defaults from constants
        return DEFAULT_CARE_TASK_DEFS;
    });

    // Persist careTaskDefs
    useEffect(() => {
        if (isDemo && careTaskDefs.length > 0) {
            localStorage.setItem('careTaskDefs', JSON.stringify(careTaskDefs));
        }
    }, [careTaskDefs, isDemo]);

    // Persist noticeDefs
    useEffect(() => {
        if (isDemo) {
            localStorage.setItem('noticeDefs', JSON.stringify(noticeDefs));
        }
    }, [noticeDefs, isDemo]);

    // Persist inventory
    useEffect(() => {
        if (isDemo) {
            localStorage.setItem('inventory', JSON.stringify(inventory));
        }
    }, [inventory, isDemo]);

    // CRUD: Care Tasks
    const addCareTask = async (title: string, settings?: Partial<CareTaskDef>) => {
        const id = `custom_${Date.now()}`;
        const newTask: CareTaskDef = {
            id,
            title,
            icon: 'Heart', // Default icon
            frequency: 'once-daily',
            timeOfDay: 'anytime',
            mealSlots: ['morning'], // Default for once-daily
            perCat: false,
            enabled: true,
            ...settings
        };
        // Auto-set mealSlots if frequency is provided in settings
        if (settings?.frequency && !settings.mealSlots) {
            const getDefaultSlots = (freq: string): ('morning' | 'noon' | 'evening' | 'night')[] => {
                switch (freq) {
                    case 'once-daily': return ['morning'];
                    case 'twice-daily': return ['morning', 'evening'];
                    case 'three-times-daily': return ['morning', 'noon', 'evening'];
                    case 'four-times-daily': return ['morning', 'noon', 'evening', 'night'];
                    case 'as-needed': return [];
                    default: return [];
                }
            };
            newTask.mealSlots = getDefaultSlots(settings.frequency);
        }
        setCareTaskDefs(prev => [...prev, newTask]);

        if (!isDemo && householdId) {
            await supabase.from('care_task_defs').insert({
                id: newTask.id,
                household_id: householdId,
                title: newTask.title,
                icon: newTask.icon,
                frequency: newTask.frequency,
                time_of_day: newTask.timeOfDay,
                meal_slots: newTask.mealSlots,
                per_cat: newTask.perCat,
                enabled: newTask.enabled
            });
        }
    };
    const updateCareTask = async (id: string, updates: Partial<CareTaskDef>) => {
        setCareTaskDefs(prev => prev.map(t => {
            if (t.id !== id) return t;

            const updated = { ...t, ...updates };

            // Auto-update mealSlots when frequency changes (unless explicitly set)
            if (updates.frequency && !updates.mealSlots) {
                const getDefaultSlots = (freq: string): ('morning' | 'noon' | 'evening' | 'night')[] => {
                    switch (freq) {
                        case 'once-daily': return ['morning'];
                        case 'twice-daily': return ['morning', 'evening'];
                        case 'three-times-daily': return ['morning', 'noon', 'evening'];
                        case 'four-times-daily': return ['morning', 'noon', 'evening', 'night'];
                        case 'as-needed': return [];
                        default: return [];
                    }
                };
                updated.mealSlots = getDefaultSlots(updates.frequency);
            }

            return updated;
        }));

        if (!isDemo && householdId) {
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
            if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
            if (updates.timeOfDay !== undefined) dbUpdates.time_of_day = updates.timeOfDay;
            if (updates.mealSlots !== undefined) dbUpdates.meal_slots = updates.mealSlots;
            if (updates.perCat !== undefined) dbUpdates.per_cat = updates.perCat;
            if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
            // Also update meal_slots if auto-updated? 
            // The map logic above handles auto-update in local state 'updated' object.
            // We should use 'updated' object logic here?
            // Actually, we should just replicate the logic or pass specific updates.
            // Simpler: recalculate meal_slots if frequency changed.
            if (updates.frequency && !updates.mealSlots) {
                const getDefaultSlots = (freq: string) => {
                    switch (freq) {
                        case 'once-daily': return ['morning'];
                        case 'twice-daily': return ['morning', 'evening'];
                        case 'three-times-daily': return ['morning', 'noon', 'evening'];
                        case 'four-times-daily': return ['morning', 'noon', 'evening', 'night'];
                        case 'as-needed': return [];
                        default: return [];
                    }
                };
                dbUpdates.meal_slots = getDefaultSlots(updates.frequency);
            }

            await supabase.from('care_task_defs').update(dbUpdates).eq('id', id);
        }
    };
    const deleteCareTask = async (id: string) => {
        setCareTaskDefs(prev => prev.filter(t => t.id !== id));
        if (!isDemo && householdId) {
            await supabase.from('care_task_defs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        }
    };

    // CRUD: Notice Defs
    const addNoticeDef = async (title: string, settings?: Partial<NoticeDef>) => {
        const id = `custom_n_${Date.now()}`;
        const newNotice: NoticeDef = {
            id,
            title,
            kind: 'notice',
            cadence: 'daily',
            due: 'any',
            choices: ['いつも通り', 'ちょっと違う'],
            enabled: true,
            optional: false,
            // Enhanced fields
            inputType: 'ok-notice',
            category: 'health',
            required: false,
            ...settings
        };
        setNoticeDefs(prev => [...prev, newNotice]);

        if (!isDemo && householdId) {
            await supabase.from('notice_defs').insert({
                id: newNotice.id,
                household_id: householdId,
                title: newNotice.title,
                kind: newNotice.kind,
                cadence: newNotice.cadence,
                due: newNotice.due,
                choices: newNotice.choices,
                enabled: newNotice.enabled,
                optional: newNotice.optional,
                input_type: newNotice.inputType,
                category: newNotice.category,
                required: newNotice.required
            });
        }
    };
    const updateNoticeDefFn = async (id: string, updates: Partial<NoticeDef>) => {
        setNoticeDefs(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

        if (!isDemo && householdId) {
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
            if (updates.choices !== undefined) dbUpdates.choices = updates.choices;
            if (updates.inputType !== undefined) dbUpdates.input_type = updates.inputType;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            if (updates.required !== undefined) dbUpdates.required = updates.required;

            await supabase.from('notice_defs').update(dbUpdates).eq('id', id);
        }
    };
    const deleteNoticeDef = async (id: string) => {
        setNoticeDefs(prev => prev.filter(n => n.id !== id));
        if (!isDemo && householdId) {
            await supabase.from('notice_defs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        }
    };

    // CRUD: Inventory
    const addInventoryItem = async (label: string, minDays: number, maxDays: number, settings?: Partial<InventoryItem>) => {
        const id = `inv_${Date.now()}`;
        const newItem: InventoryItem = {
            id,
            label,
            range: [minDays, maxDays],
            last: 'まだある',
            // Enhanced fields
            stockLevel: 'full',
            alertEnabled: true,
            ...settings
        };
        setInventory(prev => [...prev, newItem]);

        if (!isDemo && householdId) {
            await supabase.from('inventory').insert({
                id: newItem.id,
                household_id: householdId,
                label: newItem.label,
                range_min: minDays,
                range_max: maxDays,
                last_bought: newItem.last_bought || null,
                stock_level: newItem.stockLevel,
                alert_enabled: newItem.alertEnabled
            });
        }
    };
    const updateInventoryItemFn = async (id: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

        if (!isDemo && householdId) {
            const dbUpdates: any = {};
            if (updates.label !== undefined) dbUpdates.label = updates.label;
            if (updates.range_max !== undefined) dbUpdates.range_max = updates.range_max;
            if (updates.last_bought !== undefined) dbUpdates.last_bought = updates.last_bought;
            if (updates.stockLevel !== undefined) dbUpdates.stock_level = updates.stockLevel;
            // map alertEnabled to alert_enabled
            if (updates.alertEnabled !== undefined) dbUpdates.alert_enabled = updates.alertEnabled;

            await supabase.from('inventory').update(dbUpdates).eq('id', id);
        }
    };
    const deleteInventoryItem = async (id: string) => {
        setInventory(prev => prev.filter(i => i.id !== id));
        if (!isDemo && householdId) {
            await supabase.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        }
    };

    // Settings: Threshold
    const updateInvThreshold = (key: 'soon' | 'urgent' | 'critical', value: number) => {
        setSettings(s => ({
            ...s,
            invThresholds: { ...s.invThresholds, [key]: value }
        }));
    };

    // Wrapper functions for Supabase operations
    const addCareLog = async (type: string, slotOrCatId?: string, catId?: string) => {
        if (isDemo) {
            // Demo mode: update demoCareLogsDone state
            const now = new Date().toISOString();
            setDemoCareLogsDone(prev => ({ ...prev, [type]: now }));
            return undefined;
        }
        // For now, slot is passed but not tracked separately in Supabase
        // In the future, we can add slot field to care_logs table
        return supabaseAddCareLog(type, catId || slotOrCatId);
    };

    const addObservation = async (type: string, value: string) => {
        if (isDemo) {
            // Demo mode: update local state
            return undefined;
        }
        return supabaseAddObservation(type, value);
    };

    const initializeDefaults = async () => {
        if (isDemo || !householdId) return;

        try {
            // Care Tasks
            const { count: careCount } = await supabase.from('care_task_defs').select('*', { count: 'exact', head: true });
            if (careCount === 0) {
                const careTasks = DEFAULT_CARE_TASK_DEFS.map(def => ({
                    id: def.id,
                    household_id: householdId,
                    title: def.title,
                    icon: def.icon,
                    frequency: def.frequency,
                    time_of_day: def.timeOfDay || 'anytime',
                    meal_slots: def.mealSlots || [],
                    per_cat: def.perCat,
                    enabled: def.enabled
                }));
                const { error } = await supabase.from('care_task_defs').insert(careTasks);
                if (error) throw error;
            }

            // Notice Defs
            const { count: noticeCount } = await supabase.from('notice_defs').select('*', { count: 'exact', head: true });
            if (noticeCount === 0) {
                const notices = DEFAULT_NOTICE_DEFS.map(def => ({
                    id: def.id,
                    household_id: householdId,
                    title: def.title,
                    kind: def.kind,
                    cadence: def.cadence,
                    due: def.due,
                    choices: def.choices,
                    input_type: def.inputType,
                    category: def.category,
                    required: def.required,
                    enabled: def.enabled,
                    optional: def.optional
                }));
                const { error } = await supabase.from('notice_defs').insert(notices);
                if (error) throw error;
            }

            // Inventory
            const { count: invCount } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
            if (invCount === 0) {
                const items = DEFAULT_INVENTORY_ITEMS.map((item: any) => ({
                    id: item.id,
                    household_id: householdId,
                    label: item.label,
                    range_max: item.range_max || item.range?.[1] || 30, // Map legacy range
                    range_min: item.range_min || item.range?.[0] || 7,
                    stock_level: item.stockLevel,
                    alert_enabled: item.alertEnabled,
                    purchase_memo: item.purchaseMemo
                }));
                const { error } = await supabase.from('inventory').insert(items);
                if (error) throw error;
            }

            // Reload page to reflect changes
            window.location.reload();

        } catch (e) {
            console.error("Failed to initialize defaults", e);
            throw e;
        }
    };

    const value: AppState = {
        isPro: settings.plan === 'Pro',
        setIsPro: (v) => setSettings(s => ({ ...s, plan: v ? 'Pro' : 'Free' })),
        aiEnabled: settings.aiEnabled,
        setAiEnabled: (v) => setSettings(s => ({ ...s, aiEnabled: v })),
        activeCatId, setActiveCatId,
        cats,
        catsLoading,
        tasks, setTasks,
        noticeDefs, setNoticeDefs,
        noticeLogs, setNoticeLogs,
        signalLogs, setSignalLogs,
        inventory, setInventory,
        memos, setMemos,
        events, setEvents,
        settings, setSettings,
        lastSeenAt, setLastSeenAt,
        householdId,
        isDemo,
        addCareLog,
        addObservation,
        careLogs,
        demoCareLogsDone,
        observations,
        refetchCats,
        // CRUD functions
        careTaskDefs,
        addCareTask,
        updateCareTask,
        deleteCareTask,
        addNoticeDef,
        updateNoticeDef: updateNoticeDefFn,
        deleteNoticeDef,
        addInventoryItem,
        updateInventoryItem: updateInventoryItemFn,
        deleteInventoryItem,
        updateInvThreshold,
        // Notification
        fcmToken,
        setFcmToken,
        initializeDefaults,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppProvider');
    }
    return context;
}
