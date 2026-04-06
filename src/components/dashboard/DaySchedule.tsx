'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { modalController } from '@/lib/modalController';
import type { EventModalData } from '@/lib/modalController';
import { useLocale } from '@/contexts/LocaleContext';
import { useUserState } from '@/contexts/UserContext';

interface Event {
    id: string;
    title: string;
    start: string;
    subject: string;
    teacher: string;
    time: string;
    description: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    classroom?: string;
    room?: string;
    target_audience?: string;
    subject_group_display?: string;
    target_users?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
    type?: string;
    url?: string;
    sortKeyMinutes?: number;
}

function formatLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function dayEventSortMinutes(ev: Event): number {
    if (ev.sortKeyMinutes != null) return ev.sortKeyMinutes;
    const head = ev.time?.split(' - ')[0]?.trim() ?? '';
    const m = head.match(/^(\d{1,2}):(\d{2})/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return 24 * 60;
}

interface DayScheduleProps {
    date?: Date;
    events?: Event[];
    onChangeDate?: (delta: number) => void;
}

const TYPE_META: Record<string, { label: string; icon: string; accent: string }> = {
    schedule: { label: 'Урок',     icon: '📚', accent: '#7c3aed' },
    test:     { label: 'Тест',     icon: '📝', accent: '#0284c7' },
    assignment: { label: 'Задание', icon: '📋', accent: '#d97706' },
    meeting:  { label: 'Встреча',  icon: '👥', accent: '#059669' },
    gathering:{ label: 'Встреча',  icon: '👥', accent: '#059669' },
    school_event: { label: 'Событие', icon: '🎓', accent: '#db2777' },
    other:    { label: 'Событие',  icon: '📌', accent: '#6b7280' },
};

function getTypeMeta(type?: string) {
    return TYPE_META[type ?? ''] ?? { label: type ?? '', icon: '📌', accent: '#6b7280' };
}

export default function DaySchedule({
    date = new Date(),
    events = [],
    onChangeDate,
}: DayScheduleProps) {
    const { t, locale } = useLocale();
    const { user } = useUserState();
    const isTeacher = user?.role === 'teacher';

    const dayEvents = useMemo(() => {
        const dateString = formatLocalYmd(date);
        return events
            .filter(ev => {
                const isHomework = ev.title === 'Домашнее Задание';
                return !isHomework && ev.start === dateString;
            })
            .sort((a, b) => dayEventSortMinutes(a) - dayEventSortMinutes(b));
    }, [date, events]);

    const handleEventClick = (ev: Event) => {
        const eventData: EventModalData = {
            title: ev.title,
            start: ev.start,
            subject: ev.subject,
            teacher: ev.teacher,
            time: ev.time,
            description: ev.description,
            room: ev.room,
            classroom: ev.classroom,
            target_audience: ev.target_audience,
            subject_group_display: ev.subject_group_display,
            target_users: ev.target_users,
            url: ev.url,
            type: (ev as any).type,
        };
        modalController.open('event-modal', eventData);
    };

    const formatDate = (d: Date) => {
        const localeCode = locale === 'en' ? 'en-GB' : 'ru-RU';
        return d.toLocaleDateString(localeCode, { day: 'numeric', month: 'long' });
    };

    const isToday = useMemo(() => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }, [date]);

    const dayName = useMemo(() => {
        const localeCode = locale === 'en' ? 'en-GB' : 'ru-RU';
        return date.toLocaleDateString(localeCode, { weekday: 'long' });
    }, [date, locale]);

    return (
        <div className="flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-violet-50 to-white">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-violet-500 uppercase tracking-wider capitalize">
                        {dayName}
                    </p>
                    <h2 className="text-base font-bold text-gray-900 truncate mt-0.5">
                        {isToday ? (
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                Сегодня · {formatDate(date)}
                            </span>
                        ) : formatDate(date)}
                    </h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => onChangeDate?.(-1)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangeDate?.(1)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Event count badge */}
            {dayEvents.length > 0 && (
                <div className="px-5 pt-3 pb-0">
                    <span className="text-xs text-gray-400">
                        {dayEvents.length} {dayEvents.length === 1 ? 'событие' : dayEvents.length < 5 ? 'события' : 'событий'}
                    </span>
                </div>
            )}

            {/* Events list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '120px' }}>
                {dayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                            <CalendarDays className="w-7 h-7 text-violet-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">{t('daySchedule.noEvents')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('daySchedule.noEventsPlanned')}</p>
                    </div>
                ) : (
                    dayEvents.map((ev) => {
                        const meta = getTypeMeta(ev.type);
                        const timeStart = ev.time?.split(' - ')[0] ?? ev.time ?? '';
                        const timeEnd = ev.time?.split(' - ')[1] ?? '';

                        return (
                            <button
                                key={ev.id}
                                type="button"
                                onClick={() => handleEventClick(ev)}
                                className="w-full text-left group flex items-stretch gap-3 rounded-xl border border-gray-100 p-3 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-sm transition-all"
                            >
                                {/* Color stripe */}
                                <div
                                    className="w-1 rounded-full shrink-0 self-stretch"
                                    style={{ backgroundColor: ev.borderColor || meta.accent }}
                                />

                                {/* Time column */}
                                <div className="shrink-0 w-14 flex flex-col items-start">
                                    <span className="text-xs font-bold text-gray-800 leading-none">
                                        {timeStart}
                                    </span>
                                    {timeEnd && (
                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                            {timeEnd}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span
                                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                            style={{
                                                backgroundColor: `${ev.backgroundColor || '#ede9fe'}`,
                                                color: meta.accent,
                                            }}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                                        {ev.subject || ev.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {isTeacher && ev.classroom && (
                                            <span className="text-[11px] text-gray-500 truncate">
                                                {ev.classroom}
                                            </span>
                                        )}
                                        {ev.room && (
                                            <span className="text-[11px] text-gray-400">
                                                каб. {ev.room}
                                            </span>
                                        )}
                                        {!isTeacher && ev.teacher && (
                                            <span className="text-[11px] text-gray-400 truncate">
                                                {ev.teacher}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 self-center shrink-0 transition-colors" />
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
