/** Parse YYYY-MM-DD as local calendar date (no timezone drift). */
export function parseDateOnly(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's local calendar date, suitable for an HTML date input min value. */
export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}

/** End date must be strictly after start date. */
export function isDateAfter(end?: string, start?: string): boolean {
  const e = parseDateOnly(end);
  const s = parseDateOnly(start);
  if (!e || !s) return true;
  return e.getTime() > s.getTime();
}

/** Minimum selectable end date = day after start (for HTML date input min). */
export function dayAfter(dateStr?: string): string | undefined {
  const d = parseDateOnly(dateStr);
  if (!d) return undefined;
  d.setDate(d.getDate() + 1);
  return formatDateOnly(d);
}

export function endDateMin(start?: string): string | undefined {
  return dayAfter(start);
}
