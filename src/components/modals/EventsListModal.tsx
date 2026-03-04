'use client';

import Modal from '@/components/ui/Modal';
import type { EventsListModalData, EventModalData } from '@/lib/modalController';
import { modalController } from '@/lib/modalController';
import { useLocale } from '@/contexts/LocaleContext';

interface EventsListModalProps {
    data: EventsListModalData | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EventsListModal({
    data,
    isOpen,
    onClose,
}: EventsListModalProps) {
    const { t, locale } = useLocale();

    if (!isOpen || !data || !data.events || data.events.length === 0) return null;

    const getEventTypeColor = (type?: string) => {
        if (type === 'schedule') return 'rgb(219, 234, 254)';
        if (type === 'assignment') return 'rgb(255, 237, 213)';
        if (type === 'test') return 'rgb(224, 242, 254)';
        return 'rgb(255, 237, 213)';
    };

    const getEventTypeText = (type?: string) => {
        if (type === 'schedule') return t('events.schedule');
        if (type === 'assignment') return t('events.assignment');
        if (type === 'test') return t('events.test');
        return t('events.event');
    };

    // Format time string to remove seconds (HH:MM:SS -> HH:MM)
    const formatTimeString = (timeStr: string) => {
        if (!timeStr) return '';
        // Remove seconds from time string (HH:MM:SS -> HH:MM)
        // Match pattern like "09:00:00" or "09:00:00 - 10:30:00" and remove :SS part
        return timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
    };

    const handleEventClick = (event: EventsListModalData['events'][0]) => {
        onClose();
        const eventModalData: EventModalData = {
            title: event.title,
            start: event.start,
            subject: event.subject,
            teacher: event.teacher,
            time: event.time,
            description: event.description || '',
            url: event.url,
            type: event.type as EventModalData['type'],
            room: event.room,
            classroom: event.classroom,
            target_audience: event.target_audience,
            subject_group_display: event.subject_group_display,
            target_users: event.target_users,
        };
        modalController.open('event-modal', eventModalData);
    };

    // Get time range from events
    const getTimeRange = () => {
        if (!data.events || data.events.length === 0) return '';
        const times = data.events.map(e => e.time).filter(Boolean);
        if (times.length === 0) return '';
        if (times.length === 1) return times[0];
        // If all events have same time, show it once
        const uniqueTimes = [...new Set(times)];
        if (uniqueTimes.length === 1) return uniqueTimes[0];
        // Otherwise show range
        return `${times[0]} - ${times[times.length - 1]}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('events.eventCount', { count: data.events.length })}
                </h3>
                <p className="text-sm text-gray-600">
                    {(() => {
                        const d = new Date(data.date);
                        if (locale === 'kk') {
                            const weekdays = [
                                'жексенбі',
                                'дүйсенбі',
                                'сейсенбі',
                                'сәрсенбі',
                                'бейсенбі',
                                'жұма',
                                'сенбі',
                            ];
                            const months = [
                                'қаңтар',
                                'ақпан',
                                'наурыз',
                                'сәуір',
                                'мамыр',
                                'маусым',
                                'шілде',
                                'тамыз',
                                'қыркүйек',
                                'қазан',
                                'қараша',
                                'желтоқсан',
                            ];
                            const w = weekdays[d.getDay()];
                            const m = months[d.getMonth()];
                            return `${w}, ${d.getDate()} ${m} ${d.getFullYear()} ж.`;
                        }
                        return d.toLocaleDateString(
                            locale === 'en' ? 'en-GB' : 'ru-RU',
                            {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            }
                        );
                    })()}
                    {getTimeRange() && ` • ${getTimeRange()}`}
                </p>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {data.events.map((event, index) => (
                    <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleEventClick(event)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="px-2 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: getEventTypeColor(event.type),
                                            color: '#374151',
                                        }}
                                    >
                                        {getEventTypeText(event.type)}
                                    </div>
                                </div>
                                
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    {event.title}
                                </h4>

                                <div className="space-y-1 text-sm">
                                    {event.subject && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 w-20">
                                                {t('modals.event.subject')}
                                            </span>
                                            <span className="font-medium">{event.subject}</span>
                                        </div>
                                    )}

                                    {event.type === 'schedule' && event.classroom && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 w-20">Класс</span>
                                            <span className="font-medium">{event.classroom}</span>
                                        </div>
                                    )}

                                    {event.type === 'schedule' && event.room && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 w-20">Кабинет</span>
                                            <span className="font-medium">{event.room}</span>
                                        </div>
                                    )}

                                    {event.teacher && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 w-20">
                                                {t('modals.event.teacher')}
                                            </span>
                                            <span className="font-medium">{event.teacher}</span>
                                        </div>
                                    )}

                                    {event.time && (
                                        <div className="flex items-center">
                                            <span className="text-gray-500 w-20">
                                                {t('modals.event.time')}
                                            </span>
                                            <span className="font-medium">{formatTimeString(event.time)}</span>
                                        </div>
                                    )}
                                </div>

                                {event.description && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-sm text-gray-600">{event.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    {t('modals.event.close')}
                </button>
            </div>
        </Modal>
    );
}
