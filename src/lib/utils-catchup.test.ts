import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCatchUpItems } from './utils-catchup';
import { Task, CareTaskDef, TaskGroup, Cadence, DueTime } from '@/types';

describe('getCatchUpItems', () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return empty list when no tasks or definitions provided', () => {
        const result = getCatchUpItems({
            tasks: [],
            noticeLogs: {},
            inventory: [],
            lastSeenAt: mockDate.toISOString(),
            settings: { dayStartHour: 4 } as any,
            cats: [],
            careTaskDefs: [],
            careLogs: [],
            noticeDefs: [],
            dayStartHour: 4
        });

        expect(result.allItems).toHaveLength(0);
        expect(result.summary).toBe("すべて順調です");
    });

    it('should identify unfinished care tasks', () => {
        const mockTask: Task = {
            id: 't1', catId: 'c1',
            title: 'Legacy Task',
            group: 'CARE' as TaskGroup,
            cadence: 'daily' as Cadence,
            due: 'morning' as DueTime,
            done: false,
            later: false
        };
        const mockDef: CareTaskDef = {
            id: 'd1', title: '朝ごはん', icon: 'food',
            frequency: 'daily', frequencyType: 'fixed', frequencyCount: 1,
            enabled: true, timeOfDay: 'morning',
            perCat: true // Required property
        };

        const result = getCatchUpItems({
            tasks: [mockTask],
            noticeLogs: {},
            inventory: [],
            lastSeenAt: mockDate.toISOString(),
            settings: { dayStartHour: 4 } as any,
            cats: [{ id: 'c1', name: 'Tama' }] as any,
            careTaskDefs: [mockDef],
            careLogs: [],
            noticeDefs: [],
            dayStartHour: 4
        });

        expect(result.allItems).toHaveLength(1);
        expect(result.allItems[0].type).toBe('task');
        expect(result.allItems[0].title).toBe('朝ごはん');
    });
});
