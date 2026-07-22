/**
 * Admin founder surfaces display wall-clock time in Philippine Standard Time.
 * Stored timestamps remain UTC/ISO; only presentation is zoned to Asia/Manila.
 */

export const ADMIN_TIME_ZONE = "Asia/Manila";
export const ADMIN_DATE_LOCALE = "en-PH";

const PLACEHOLDER = "—";

const dateTimeFormatter = new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ADMIN_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
  dateStyle: "medium",
  timeZone: ADMIN_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
});

const listDayFormatter = new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
  month: "short",
  day: "numeric",
  timeZone: ADMIN_TIME_ZONE,
});

const calendarDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarDayKey(date: Date): string {
  return calendarDayFormatter.format(date);
}

/** Full datetime, e.g. "22 Jul 2026, 11:19 am" in Asia/Manila. */
export function formatAdminDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return dateTimeFormatter.format(date);
}

/** Date only, e.g. "22 Jul 2026" in Asia/Manila. */
export function formatAdminDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return dateFormatter.format(date);
}

/**
 * Compact inbox-style stamp: time if the message is from today (Manila),
 * otherwise short month/day.
 */
export function formatAdminListTime(
  value: string | number | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  if (calendarDayKey(date) === calendarDayKey(now)) {
    return timeFormatter.format(date);
  }
  return listDayFormatter.format(date);
}

/** Short message timestamp: "Jul 22, 11:19 am" in Asia/Manila. */
export function formatAdminMessageTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  }).format(date);
}
