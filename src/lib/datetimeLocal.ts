/**
 * Bridge between datetime-local wall strings (school IANA zone) and API instants (ISO).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { appIanaTimeZone } from '@/lib/appTimeZone';

/** `YYYY-MM-DDTHH:mm` — normalize for stable parsing. */
function normalizeDatetimeLocalInput(local: string): string {
    const s = local.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
        return `${s}:00`;
    }
    return s;
}

function parseWallComponents(isoLikeLocal: string): {
    y: string;
    mo: string;
    d: string;
    h: string;
    mi: string;
    sec: string;
} | null {
    const m = isoLikeLocal.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
    );
    if (!m) return null;
    return {
        y: m[1],
        mo: m[2],
        d: m[3],
        h: m[4],
        mi: m[5],
        sec: m[6] ? m[6] : '00',
    };
}

/**
 * Convert a datetime-local value (wall clock in the app's zone) to UTC ISO for the API.
 */
export function datetimeLocalValueToUtcIso(local: string | null | undefined): string {
    const raw = (local ?? '').trim();
    if (!raw) return '';
    const normalized = normalizeDatetimeLocalInput(raw);
    const p = parseWallComponents(normalized);
    if (!p) return '';
    const tz = appIanaTimeZone();
    const wall = `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.sec}`;
    const utc = fromZonedTime(wall, tz);
    if (Number.isNaN(utc.getTime())) return '';
    return utc.toISOString();
}

/**
 * Convert an API ISO instant (any offset/Z) to datetime-local `value` (wall in app zone).
 */
export function utcIsoToDatetimeLocalValue(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return formatInTimeZone(d, appIanaTimeZone(), "yyyy-MM-dd'T'HH:mm");
}

/** Current moment as datetime-local string in the app's zone (for form defaults). */
export function nowToDatetimeLocalInAppZone(): string {
    return utcIsoToDatetimeLocalValue(new Date().toISOString());
}
