import { appIanaTimeZone } from '@/lib/appTimeZone';

export type SchoolDateInput = string | number | Date | null | undefined;

function toValidDate(input: SchoolDateInput): Date | null {
    if (input == null || input === '') return null;
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

const tz = (): string => appIanaTimeZone();

/**
 * Format an instant in the school zone (Asia/Almaty by default).
 */
export function formatSchoolDateTime(
    input: SchoolDateInput,
    locale: string,
    options: Intl.DateTimeFormatOptions
): string {
    const d = toValidDate(input);
    if (!d) return '';
    return d.toLocaleString(locale, { ...options, timeZone: tz() });
}

export function formatSchoolDate(
    input: SchoolDateInput,
    locale: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = toValidDate(input);
    if (!d) return '';
    return d.toLocaleDateString(locale, { ...(options ?? {}), timeZone: tz() });
}

export function formatSchoolTime(
    input: SchoolDateInput,
    locale: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = toValidDate(input);
    if (!d) return '';
    return d.toLocaleTimeString(locale, { ...(options ?? {}), timeZone: tz() });
}

/** `yyyy-MM-dd` in the school zone (for calendar day equality). */
export function schoolZoneYmd(input: SchoolDateInput): string {
    const d = toValidDate(input);
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz(),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (!y || !m || !day) return '';
    return `${y}-${m}-${day}`;
}
