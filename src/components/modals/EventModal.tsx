'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import type { EventModalData } from '@/lib/modalController';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';
import {
    Clock,
    MapPin,
    User,
    BookOpen,
    Calendar,
    Users,
    ArrowRight,
    X,
    ClipboardList,
    GraduationCap,
} from 'lucide-react';

interface EventModalProps {
    event: EventModalData | null;
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; accent: string; bg: string; icon: string }> = {
    schedule:     { label: 'Урок',           accent: '#7c3aed', bg: '#f5f3ff', icon: '📚' },
    test:         { label: 'Тест',           accent: '#0369a1', bg: '#f0f9ff', icon: '📝' },
    assignment:   { label: 'Задание',        accent: '#c2410c', bg: '#fff7ed', icon: '📋' },
    meeting:      { label: 'Собрание',       accent: '#065f46', bg: '#f0fdf4', icon: '👥' },
    gathering:    { label: 'Встреча',        accent: '#065f46', bg: '#f0fdf4', icon: '👥' },
    school_event: { label: 'Школьное событие', accent: '#be185d', bg: '#fdf2f8', icon: '🎓' },
    other:        { label: 'Событие',        accent: '#374151', bg: '#f9fafb', icon: '📌' },
};

const AUDIENCE_LABELS: Record<string, string> = {
    all: 'Для всех',
    teachers: 'Для учителей',
    class: 'Для класса',
    specific: 'Выбранным пользователям',
};

function fmt(timeStr: string) {
    return timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <div className="mt-0.5 w-5 flex-shrink-0 text-gray-400">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
                <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
            </div>
        </div>
    );
}

export default function EventModal({ event, isOpen, onClose }: EventModalProps) {
    const router = useRouter();
    const { t, locale } = useLocale();

    if (!isOpen || !event) return null;

    const cfg = TYPE_CONFIG[event.type ?? ''] ?? TYPE_CONFIG.other;
    const localeCode = locale === 'en' ? 'en-GB' : 'ru-RU';

    const formattedDate = (() => {
        try {
            return formatSchoolDate(event.start, localeCode, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });
        } catch { return event.start; }
    })();

    const handleNavigate = () => {
        if (event.url) { router.push(event.url); onClose(); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
            {/* Color header strip */}
            <div
                className="rounded-xl mb-4 px-4 py-4 flex items-start justify-between gap-3"
                style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.accent}` }}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">{cfg.icon}</span>
                        <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: cfg.accent, background: `${cfg.accent}18` }}
                        >
                            {cfg.label}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug break-words">
                        {event.type === 'schedule' ? (event.subject || event.title) : event.title}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors mt-0.5"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Info rows */}
            <div className="divide-y divide-gray-100">
                {event.time && (
                    <InfoRow
                        icon={<Clock className="w-4 h-4" />}
                        label="Время"
                        value={fmt(event.time)}
                    />
                )}

                <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Дата"
                    value={<span className="capitalize">{formattedDate}</span>}
                />

                {event.subject && event.type !== 'schedule' && (
                    <InfoRow
                        icon={<BookOpen className="w-4 h-4" />}
                        label={t('modals.event.subject')}
                        value={event.subject}
                    />
                )}

                {event.teacher && (
                    <InfoRow
                        icon={<User className="w-4 h-4" />}
                        label={t('modals.event.teacher')}
                        value={event.teacher}
                    />
                )}

                {event.type === 'schedule' && event.classroom && (
                    <InfoRow
                        icon={<GraduationCap className="w-4 h-4" />}
                        label="Класс"
                        value={event.classroom}
                    />
                )}

                {event.type === 'schedule' && event.room && (
                    <InfoRow
                        icon={<MapPin className="w-4 h-4" />}
                        label="Кабинет"
                        value={event.room}
                    />
                )}

                {event.target_audience && (
                    <InfoRow
                        icon={<Users className="w-4 h-4" />}
                        label="Аудитория"
                        value={
                            <div>
                                <span>{AUDIENCE_LABELS[event.target_audience] ?? event.target_audience}</span>
                                {event.target_audience === 'class' && event.subject_group_display && (
                                    <span className="ml-1 text-gray-500">· {event.subject_group_display}</span>
                                )}
                                {event.target_audience === 'specific' && event.target_users && event.target_users.length > 0 && (
                                    <ul className="mt-1 space-y-0.5">
                                        {event.target_users.map(u => (
                                            <li key={u.id} className="text-xs text-gray-500">
                                                {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            {/* Description */}
            {event.description && event.type !== 'schedule' && (
                <div className="mt-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-400">{t('modals.event.description')}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {t('modals.event.close')}
                </button>
                {event.url && (
                    <button
                        onClick={handleNavigate}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                        style={{ background: cfg.accent }}
                    >
                        {t('modals.event.navigate')}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </Modal>
    );
}
