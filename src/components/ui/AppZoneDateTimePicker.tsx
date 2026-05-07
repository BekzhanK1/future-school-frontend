'use client';

import { useCallback, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale/ru';
import { kk } from 'date-fns/locale/kk';
import { enGB } from 'date-fns/locale/en-GB';
import 'react-datepicker/dist/react-datepicker.css';
import './AppZoneDateTimePicker.css';

import { datetimeLocalValueToUtcIso, utcIsoToDatetimeLocalValue } from '@/lib/datetimeLocal';
import { appIanaTimeZone } from '@/lib/appTimeZone';
import { adjustMaskedCursor, maskEuropeanDateTime } from '@/lib/dateInputMask';

export type AppPickerUiLocale = 'ru' | 'en' | 'kk';

registerLocale('ru', ru);
registerLocale('kk', kk);
registerLocale('en-GB', enGB);

const localeProp: Record<AppPickerUiLocale, string> = {
    ru: 'ru',
    kk: 'kk',
    en: 'en-GB',
};

/** Первый — отображение в поле; все — разбор. dd=день, MM=месяц, mm=минуты. */
const PARSE_FORMATS = ['dd.MM.yyyy HH:mm', 'dd.MM.yyyy', 'd.M.yyyy HH:mm', 'd.M.yyyy'] as const;

function wallAppZoneToSelectedDate(wall: string): Date | null {
    const raw = wall?.trim() ?? '';
    if (!raw) return null;
    const iso = datetimeLocalValueToUtcIso(raw);
    if (!iso) return null;
    return new Date(iso);
}

function selectedDateToWallAppZone(d: Date | null): string {
    if (!d || Number.isNaN(d.getTime())) return '';
    return utcIsoToDatetimeLocalValue(d.toISOString());
}

export interface AppZoneDateTimePickerProps {
    value: string;
    onChange: (wallAppZone: string) => void;
    uiLocale?: AppPickerUiLocale;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    placeholderText?: string;
    /** react-datepicker popper z-index (modals need a high value) */
    popperClassName?: string;
}

export default function AppZoneDateTimePicker({
    value,
    onChange,
    uiLocale = 'ru',
    className,
    disabled,
    required,
    placeholderText,
    popperClassName = 'z-[300]',
}: AppZoneDateTimePickerProps) {
    const selected = useMemo(() => wallAppZoneToSelectedDate(value), [value]);
    const loc = localeProp[uiLocale] ?? 'ru';

    /** Авто-точки/пробел/двоеточие; без этого библиотека может уйти в `new Date()` (месяц/день по-американски). */
    const handleChangeRaw = useCallback((e: React.SyntheticEvent<HTMLElement>) => {
        const el = e.target;
        if (!(el instanceof HTMLInputElement)) return;
        const oldVal = el.value;
        const pos = el.selectionStart;
        const masked = maskEuropeanDateTime(oldVal);
        if (masked === oldVal) return;
        el.value = masked;
        const nextPos = adjustMaskedCursor(oldVal, masked, pos);
        requestAnimationFrame(() => {
            try {
                el.setSelectionRange(nextPos, nextPos);
            } catch {
                /* ignore */
            }
        });
    }, []);

    return (
        <div className="app-zone-dtp w-full">
            <DatePicker
                selected={selected}
                onChange={(d) => onChange(selectedDateToWallAppZone(d))}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat={[...PARSE_FORMATS]}
                strictParsing
                locale={loc}
                timeZone={appIanaTimeZone()}
                onChangeRaw={handleChangeRaw}
                className={className}
                wrapperClassName="w-full"
                disabled={disabled}
                required={required}
                placeholderText={placeholderText ?? '__.__.____ __:__'}
                popperClassName={`app-zone-dtp-popper ${popperClassName}`}
                calendarClassName="app-zone-dtp-calendar"
                showPopperArrow={false}
                calendarStartDay={1}
                autoComplete="off"
            />
        </div>
    );
}
