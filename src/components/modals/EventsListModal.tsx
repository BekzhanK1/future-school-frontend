'use client';

import Modal from '@/components/ui/Modal';
import type { EventsListModalData, EventModalData } from '@/lib/modalController';
import { modalController } from '@/lib/modalController';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';
import { Clock, MapPin, User, GraduationCap, ArrowRight, X, CalendarDays } from 'lucide-react';

interface EventsListModalProps {
    data: EventsListModalData | null;
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; accent: string; bg: string; dot: string }> = {
    schedule:     { label: 'Урок',    accent: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
    test:         { label: 'Тест',    accent: '#0369a1', bg: '#f0f9ff', dot: '#0284c7' },
    assignment:   { label: 'Задание', accent: '#c2410c', bg: '#fff7ed', dot: '#ea580c' },
    meeting:      { label: 'Встреча', accent: '#065f46', bg: '#f0fdf4', dot: '#16a34a' },
    gathering:    { label: 'Встреча', accent: '#065f46', bg: '#f0fdf4', dot: '#16a34a' },
    school_event: { label: 'Событие', accent: '#be185d', bg: '#fdf2f8', dot: '#db2777' },
    other:        { label: 'Событие', accent: '#374151', bg: '#f9fafb', dot: '#6b7280' },
};

function fmt(t: string) {
    return t.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
}

export default function EventsListModal({ data, isOpen, onClose }: EventsListModalProps) {
    const { t, locale } = useLocale();

    if (!isOpen || !data?.events?.length) return null;

    const localeCode = locale === 'en' ? 'en-GB' : 'ru-RU';

    const formattedDate = (() => {
        try {
            return formatSchoolDate(data.date, localeCode, {
                weekday: 'long', day: 'numeric', month: 'long',
            });
        } catch { return data.date; }
    })();

    const handleEventClick = (ev: EventsListModalData['events'][0]) => {
        onClose();
        const payload: EventModalData = {
            title: ev.title,
            start: ev.start,
            subject: ev.subject,
            teacher: ev.teacher,
            time: ev.time,
            description: ev.description || '',
            url: ev.url,
            type: ev.type as EventModalData['type'],
            room: ev.room,
            classroom: ev.classroom,
            target_audience: ev.target_audience,
            subject_group_display: ev.subject_group_display,
            target_users: ev.target_users,
        };
        modalController.open('event-modal', payload);
    };

    // Unique time slots for the header summary
    const timeSlots = [...new Set(data.events.map(e => e.time).filter(Boolean).map(fmt))];

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide capitalize">
                            {formattedDate}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                        {data.events.length} {data.events.length === 1 ? 'событие' : data.events.length < 5 ? 'события' : 'событий'} одновременно
                    </h3>
                    {timeSlots.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">{timeSlots.join(', ')}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Event cards */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {data.events.map((ev, idx) => {
                    const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.other;
                    const timeStr = ev.time ? fmt(ev.time) : '';

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleEventClick(ev)}
                            className="w-full text-left group rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-150"
                        >
                            <div className="flex items-stretch">
                                {/* Left color bar */}
                                <div
                                    className="w-1 flex-shrink-0"
                                    style={{ background: cfg.dot }}
                                />

                                <div className="flex-1 px-3 py-3 min-w-0">
                                    {/* Top row: type badge + time */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                            style={{ color: cfg.accent, background: cfg.bg }}
                                        >
                                            {cfg.label}
                                        </span>
                                        {timeStr && (
                                            <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">
                                                {timeStr}
                                            </span>
                                        )}
                                    </div>

                                    {/* Subject / title */}
                                    <p className="text-sm font-semibold text-gray-900 leading-snug mb-2 truncate">
                                        {ev.type === 'schedule' ? (ev.subject || ev.title) : ev.title}
                                    </p>

                                    {/* Meta chips */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {ev.type === 'schedule' && ev.classroom && (
                                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <GraduationCap className="w-3 h-3" />
                                                {ev.classroom}
                                            </span>
                                        )}
                                        {ev.room && (
                                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <MapPin className="w-3 h-3" />
                                                каб. {ev.room}
                                            </span>
                                        )}
                                        {ev.teacher && (
                                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <User className="w-3 h-3" />
                                                {ev.teacher}
                                            </span>
                                        )}
                                    </div>

                                    {ev.description && (
                                        <p className="mt-2 text-xs text-gray-400 truncate">{ev.description}</p>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center pr-3 text-gray-300 group-hover:text-gray-500 transition-colors">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {t('modals.event.close')}
                </button>
            </div>
        </Modal>
    );
}
