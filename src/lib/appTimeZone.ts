/** IANA zone for react-datepicker, date-fns-tz, and `Intl` formatters (default Asia/Almaty). */
export function appIanaTimeZone(): string {
    const tz = process.env.NEXT_PUBLIC_APP_TIME_ZONE?.trim();
    if (tz) return tz;
    return 'Asia/Almaty';
}
