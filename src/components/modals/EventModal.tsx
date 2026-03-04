'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import type { EventModalData } from '@/lib/modalController';
import { useLocale } from '@/contexts/LocaleContext';

interface EventModalProps {
    event: EventModalData | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EventModal({
    event,
    isOpen,
    onClose,
}: EventModalProps) {
    const router = useRouter();
    const { t, locale } = useLocale();

    if (!isOpen || !event) return null;

    const handleNavigate = () => {
        if (event.url) {
            router.push(event.url);
            onClose();
        }
    };

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

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="flex items-center justify-between mb-4">
                <div
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                        backgroundColor: getEventTypeColor(event.type),
                        color: '#374151',
                    }}
                >
                    {getEventTypeText(event.type)}
                </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {event.title}
            </h3>

            <div className="space-y-3">
                <div className="flex items-center">
                    <span className="text-gray-500 w-24">
                        {t('modals.event.subject')}
                    </span>
                    <span className="font-medium">{event.subject}</span>
                </div>

                {event.type === 'schedule' && event.classroom && (
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">
                            Класс
                        </span>
                        <span className="font-medium">{event.classroom}</span>
                    </div>
                )}

                {event.type === 'schedule' && event.room && (
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">
                            Кабинет
                        </span>
                        <span className="font-medium">{event.room}</span>
                    </div>
                )}

                {event.teacher && (
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">
                            {t('modals.event.teacher')}
                        </span>
                        <span className="font-medium">{event.teacher}</span>
                    </div>
                )}

                <div className="flex items-center">
                    <span className="text-gray-500 w-24">
                        {t('modals.event.time')}
                    </span>
                    <span className="font-medium">{formatTimeString(event.time)}</span>
                </div>

                <div className="flex items-center">
                    <span className="text-gray-500 w-24">
                        {t('modals.event.date')}
                    </span>
                    <span className="font-medium">
                        {new Date(event.start).toLocaleDateString(
                            locale === 'en' ? 'en-GB' : 'ru-RU',
                            {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            }
                        )}
                    </span>
                </div>
            </div>

            {event.description && event.type !== 'schedule' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {t('modals.event.description')}
                    </h4>
                    <p className="text-gray-600 text-sm">{event.description}</p>
                </div>
            )}

            {(event.target_audience || (event.target_users && event.target_users.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {locale === 'ru' ? 'Аудитория' : 'Audience'}
                    </h4>
                    <div className="text-gray-600 text-sm">
                        {event.target_audience === 'all' && (locale === 'ru' ? 'Для всех' : 'For everyone')}
                        {event.target_audience === 'teachers' && (locale === 'ru' ? 'Для учителей' : 'For teachers')}
                        {event.target_audience === 'class' && event.subject_group_display && (
                            <span>{locale === 'ru' ? 'Для класса: ' : 'For class: '}{event.subject_group_display}</span>
                        )}
                        {event.target_audience === 'specific' && event.target_users && event.target_users.length > 0 && (
                            <div>
                                <p className="mb-1">{locale === 'ru' ? 'Выбранным пользователям:' : 'Specific users:'}</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {event.target_users.map((u) => (
                                        <li key={u.id}>
                                            {[u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username} ({u.username})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
                {event.url && (
                    <button
                        onClick={handleNavigate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('modals.event.navigate')}
                    </button>
                )}
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
