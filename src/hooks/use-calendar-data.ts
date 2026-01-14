import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { startOfMonth, endOfMonth, format, addDays, subDays } from 'date-fns';

export interface DaySummary {
    date: Date;
    dateStr: string;
    hasCare: boolean;
    hasObservation: boolean;
    hasCrisis: boolean; // Vomit, no appetite, etc.
    hasEvent: boolean;
    eventCount: number;
    careCount: number;
}

const CRISIS_VALUES = [
    '食べない', 'ご飯を残す', '元気がない', 'ぐったり',
    '2回以上', '1回', // Vomit counts
    '下痢', '軟便', '血混じり'
];

const CRISIS_TYPES = ['vomit', 'hospital']; // Types that are always crisis

export function useCalendarData(householdId: string | null, targetMonth: Date) {
    const [data, setData] = useState<Record<string, DaySummary>>({});
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            const start = subDays(startOfMonth(targetMonth), 15).toISOString();
            const end = addDays(endOfMonth(targetMonth), 15).toISOString();

            // 1. Fetch Care Logs
            const { data: logs } = await supabase
                .from('care_logs')
                .select('done_at')
                .eq('household_id', householdId!)
                .gte('done_at', start)
                .lte('done_at', end)
                .is('deleted_at', null);

            // 2. Fetch Observations
            const { data: obs } = await supabase
                .from('observations')
                .select('recorded_at, type, value, cats(household_id)') // Join to ensure household match
                .eq('cats.household_id', householdId!)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .is('deleted_at', null);

            // 3. Fetch Events
            const { data: events } = await supabase
                .from('calendar_events')
                .select('at')
                .eq('household_id', householdId!)
                .gte('at', start)
                .lte('at', end)
                .is('deleted_at', null);

            // Aggregate
            const summary: Record<string, DaySummary> = {};

            // Helper to init day
            const getDay = (dateStr: string) => {
                if (!summary[dateStr]) {
                    summary[dateStr] = {
                        date: new Date(dateStr),
                        dateStr,
                        hasCare: false,
                        hasObservation: false,
                        hasCrisis: false,
                        hasEvent: false,
                        eventCount: 0,
                        careCount: 0
                    };
                }
                return summary[dateStr];
            };

            logs?.forEach((l: any) => {
                const dateStr = l.done_at.split('T')[0];
                const day = getDay(dateStr);
                day.hasCare = true;
                day.careCount++;
            });

            obs?.forEach((o: any) => {
                const dateStr = o.recorded_at.split('T')[0];
                const day = getDay(dateStr);
                day.hasObservation = true;
                if (CRISIS_TYPES.includes(o.type) || CRISIS_VALUES.includes(o.value)) {
                    day.hasCrisis = true;
                }
            });

            events?.forEach((e: any) => {
                const dateStr = e.at.split('T')[0];
                const day = getDay(dateStr);
                day.hasEvent = true;
                day.eventCount++;
            });

            setData(summary);
            setLoading(false);
        }

        fetchData();
    }, [householdId, targetMonth]);

    return { data, loading };
}
