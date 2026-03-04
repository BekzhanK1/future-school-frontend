'use client';

import { useMemo } from 'react';
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
}

interface DayScheduleProps {
    date?: Date;
    events?: Event[];
    /** Сдвиг текущего дня в сайдбаре (например, -1 / +1) */
    onChangeDate?: (delta: number) => void;
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
        const dateString = date.toISOString().split('T')[0];
        return events
            .filter(event => {
                // Only show exams, tests, and lessons (not homework)
                const isHomework = event.title === 'Домашнее Задание';
                const isSameDate = event.start === dateString;
                return !isHomework && isSameDate;
            })
            .sort((a, b) => {
                const timeA = new Date(`2000-01-01T${a.time}`);
                const timeB = new Date(`2000-01-01T${b.time}`);
                return timeA.getTime() - timeB.getTime();
            });
    }, [date, events]);

    const handleEventClick = (event: Event) => {
        const eventData: EventModalData = {
            title: event.title,
            start: event.start,
            subject: event.subject,
            teacher: event.teacher,
            time: event.time,
            description: event.description,
            room: event.room,
            classroom: event.classroom,
            target_audience: event.target_audience,
            subject_group_display: event.subject_group_display,
            target_users: event.target_users,
            url: event.url,
            type: (event as any).type,
        };
        modalController.open('event-modal', eventData);
    };

    const getEventTypeColor = (event: Event) => {
        // Для уроков используем цвет, пришедший из календаря
        if ((event as any).type === 'schedule') {
            return event.backgroundColor || 'rgb(220, 252, 231)';
        }

        const title = event.title;
        if (title === 'Домашнее Задание') return 'rgb(255, 237, 213)';
        if (title === 'Экзамен') return 'rgb(254, 226, 226)';
        if (title === 'Тест') return 'rgb(224, 242, 254)';
        if (title === 'Урок') return 'rgb(220, 252, 231)';
        return 'rgb(255, 237, 213)';
    };

    const getEventTypeText = (title: string) => {
        if (title === 'Домашнее Задание' || title === t('daySchedule.homework'))
            return t('daySchedule.homeworkShort');
        if (title === 'Экзамен' || title === t('daySchedule.exam'))
            return t('daySchedule.examShort');
        if (title === 'Тест' || title === t('daySchedule.test'))
            return t('daySchedule.testShort');
        if (title === 'Урок' || title === t('daySchedule.lesson'))
            return t('daySchedule.lessonShort');
        return title;
    };

    const formatDate = (date: Date) => {
        const localeCode = locale === 'en' ? 'en-US' : 'ru-RU';
        return date.toLocaleDateString(localeCode, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const handlePrevDay = () => {
        if (!onChangeDate) return;
        onChangeDate(-1);
    };

    const handleNextDay = () => {
        if (!onChangeDate) return;
        onChangeDate(1);
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                    {t('daySchedule.title')} {formatDate(date)}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrevDay}
                        className="px-2 py-1 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        {t('common.prev') ?? '←'}
                    </button>
                    <button
                        type="button"
                        onClick={handleNextDay}
                        className="px-2 py-1 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        {t('common.next') ?? '→'}
                    </button>
                </div>
            </div>

            <div className="p-4 sm:h-80 overflow-y-auto h-auto">
                {dayEvents.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t('daySchedule.noEvents')}
                        </h3>
                        <p className="text-gray-500">
                            {t('daySchedule.noEventsPlanned')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="group relative p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:border-blue-300"
                                tabIndex={0}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleEventClick(event);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Left side - Time and Type */}
                                    <div className="flex items-center space-x-3">
                                        <div className="text-sm font-semibold text-gray-900 min-w-[45px]">
                                            {event.time}
                                        </div>
                                        <div
                                            className="px-2 py-1 rounded-md text-xs font-medium"
                                            style={{
                                                backgroundColor: getEventTypeColor(
                                                    event
                                                ),
                                                color: '#374151',
                                            }}
                                        >
                                            {getEventTypeText(event.title)}
                                        </div>
                                    </div>

                                    {/* Right side - Subject, Class/Room (for teacher), Teacher */}
                                    <div className="flex-1 ml-4 text-right">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {event.subject}
                                        </div>
                                        {isTeacher && (event.classroom || event.room) && (
                                            <div className="text-xs text-gray-600 truncate">
                                                {[event.classroom, event.room].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500 truncate">
                                            {event.teacher}
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-5 rounded-lg transition-opacity duration-200 pointer-events-none"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
