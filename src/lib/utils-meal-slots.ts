import { Frequency, MealSlot } from '@/types';

// Time slot boundaries (hours)
const SLOT_BOUNDARIES = {
    morning: { start: 5, end: 11 },   // 5:00 - 10:59
    noon: { start: 11, end: 15 },     // 11:00 - 14:59
    evening: { start: 15, end: 20 },  // 15:00 - 19:59
    night: { start: 20, end: 5 },     // 20:00 - 4:59
};

// Get current meal slot based on hour
export function getCurrentMealSlot(hour: number): MealSlot {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 15) return 'noon';
    if (hour >= 15 && hour < 20) return 'evening';
    return 'night';
}

export function getDefaultMealSlots(frequency: Frequency): MealSlot[] {
    switch (frequency) {
        case 'daily':
            return ['morning'];
        case 'as-needed':
            return []; // No specific slots, always show
        default:
            return ['morning'];
    }
}

// Get Japanese label for meal slot
export function getMealSlotLabel(slot: MealSlot): string {
    switch (slot) {
        case 'morning': return '朝';
        case 'noon': return '昼';
        case 'evening': return '夕';
        case 'night': return '夜';
    }
}

// Check if current time is within a meal slot's window
export function isInMealSlotWindow(slot: MealSlot, hour: number): boolean {
    const boundary = SLOT_BOUNDARIES[slot];
    if (slot === 'night') {
        // Night wraps around midnight
        return hour >= boundary.start || hour < boundary.end;
    }
    return hour >= boundary.start && hour < boundary.end;
}

// Get the previous meal slot
export function getPreviousMealSlot(slot: MealSlot): MealSlot {
    switch (slot) {
        case 'morning': return 'night';
        case 'noon': return 'morning';
        case 'evening': return 'noon';
        case 'night': return 'evening';
    }
}

// Check if a meal slot has passed today
export function hasMealSlotPassed(slot: MealSlot, hour: number): boolean {
    const boundary = SLOT_BOUNDARIES[slot];
    if (slot === 'night') {
        // Night slot: only "passed" if we're in a new day and past 5am
        return hour >= 5 && hour < SLOT_BOUNDARIES.night.start;
    }
    return hour >= boundary.end;
}
