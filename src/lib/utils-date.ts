import { Cadence, DueTime } from "@/types";

export function sameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function endOfMonth(d: Date): Date {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    last.setHours(20, 0, 0, 0);
    return last;
}

export function nextDueAt(item: { cadence: Cadence; due: DueTime; dueAt?: string }, now: Date): Date {
    if (item.dueAt) return new Date(item.dueAt);
    const n = new Date(now);

    if (item.cadence === "daily") {
        const due = new Date(n.getFullYear(), n.getMonth(), n.getDate());
        if (item.due === "morning") due.setHours(9, 0, 0, 0);
        else if (item.due === "evening") due.setHours(20, 0, 0, 0);
        else due.setHours(23, 59, 59, 999);
        return due;
    }

    if (item.cadence === "weekly") {
        const due = new Date(n);
        const day = due.getDay();
        const add = (7 - day) % 7;
        due.setDate(due.getDate() + add);
        due.setHours(18, 0, 0, 0);
        return due;
    }

    if (item.cadence === "monthly") {
        return endOfMonth(n);
    }

    const fallback = new Date(n);
    fallback.setHours(23, 59, 59, 999);
    return fallback;
}

export type Bucket = 'overdue' | 'now' | 'today' | 'week' | 'month' | 'later' | 'done';

export function bucketFor(item: { done: boolean; cadence: Cadence; due: DueTime; dueAt?: string }, now: Date): Bucket {
    if (item.done) return "done";
    const due = nextDueAt(item, now);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) return "overdue";
    if (diffMs <= 3 * 60 * 60 * 1000) return "now";
    if (sameDay(due, now)) return "today";
    if (diffMs <= 7 * 24 * 60 * 60 * 1000) return "week";
    if (diffMs <= 31 * 24 * 60 * 60 * 1000) return "month";
    return "later";
}

export function humanDue(d: Date): string {
    return d.toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Get date string (YYYY-MM-DD) relative to a specific start hour of the day
export function getAdjustedDateString(date: Date, startHour: number = 0): string {
    const d = new Date(date);
    d.setHours(d.getHours() - startHour);

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getAdjustedDate(date: Date, startHour: number = 0): Date {
    const d = new Date(date);
    d.setHours(d.getHours() - startHour);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
