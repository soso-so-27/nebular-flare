export function getToday(dayStartHour: number = 4): string {
    const now = new Date();
    const currentHour = now.getHours();

    // If we are before the start hour, we are still in the "previous" day
    if (currentHour < dayStartHour) {
        now.setDate(now.getDate() - 1);
    }

    // Format as YYYY-MM-DD using local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isSameDay(date1: Date, date2: Date, dayStartHour: number = 4): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Shift both dates back by dayStartHour to align them to a standard day boundary
    d1.setHours(d1.getHours() - dayStartHour);
    d2.setHours(d2.getHours() - dayStartHour);

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}
