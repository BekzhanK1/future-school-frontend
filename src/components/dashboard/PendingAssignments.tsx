'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { modalController } from '@/lib/modalController';
import type { EventModalData } from '@/lib/modalController';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { ClipboardList, CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface ApiAssignment {
    id: number;
    title: string;
    description: string;
    due_at: string;
    course_name: string;
    teacher_username: string;
    is_submitted?: boolean;
}

interface Assignment {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    subject: string;
    teacher: string;
    status: 'pending' | 'completed' | 'overdue';
}

interface PendingAssignmentsProps {
    assignments?: Assignment[];
}

const STATUS_META = {
    pending:   { label: 'Ожидает',  color: '#d97706', bg: '#fffbeb', icon: Clock },
    overdue:   { label: 'Просрочен', color: '#dc2626', bg: '#fef2f2', icon: AlertCircle },
    completed: { label: 'Сдано',    color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
};

export default function PendingAssignments({ assignments: propAssignments }: PendingAssignmentsProps) {
    const { t, locale } = useLocale();
    const [rawAssignments, setRawAssignments] = useState<ApiAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/assignments/');
            setRawAssignments(response.data.results || response.data);
        } catch {
            setError('Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    const transformedAssignments = useMemo(() => rawAssignments.map((a): Assignment => {
        const due = new Date(a.due_at);
        const now = new Date();
        const status: Assignment['status'] = a.is_submitted ? 'completed'
            : due < now ? 'overdue'
            : 'pending';
        return { id: a.id, title: a.title, description: a.description || '', dueDate: a.due_at, subject: a.course_name, teacher: a.teacher_username, status };
    }), [rawAssignments]);

    const assignments = propAssignments || transformedAssignments;

    const pendingAssignments = useMemo(() =>
        assignments
            .filter(a => a.status === 'pending' || a.status === 'overdue')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
        [assignments]
    );

    const handleClick = (a: Assignment) => {
        const time = new Date(a.dueDate).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'ru-RU', { hour: '2-digit', minute: '2-digit' });
        const data: EventModalData = {
            title: a.title, start: a.dueDate, subject: a.subject, teacher: a.teacher,
            time, description: a.description, url: `/assignments/${a.id}`, type: 'assignment',
        };
        modalController.open('event-modal', data);
    };

    const formatDue = (dueDate: string) => {
        const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
        if (diff < 0) return `${Math.abs(diff)} дн. назад`;
        if (diff === 0) return 'Сегодня';
        if (diff === 1) return 'Завтра';
        return `Через ${diff} дн.`;
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                    {[1, 2].map(i => (
                        <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                        <ClipboardList className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{t('pendingAssignments.title')}</span>
                </div>
                {pendingAssignments.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                        {pendingAssignments.length}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="px-3 pb-3 space-y-1.5 max-h-52 overflow-y-auto">
                {error ? (
                    <p className="text-xs text-red-500 px-1 py-2">{error}</p>
                ) : pendingAssignments.length === 0 ? (
                    <div className="flex flex-col items-center py-5 text-center">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">{t('pendingAssignments.noAssignments')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('pendingAssignments.allCompleted')}</p>
                    </div>
                ) : (
                    pendingAssignments.map(a => {
                        const meta = STATUS_META[a.status];
                        const StatusIcon = meta.icon;
                        const dueStr = formatDue(a.dueDate);

                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => handleClick(a)}
                                className="w-full text-left group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all duration-150"
                            >
                                {/* Status dot */}
                                <div
                                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: meta.bg }}
                                >
                                    <StatusIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate leading-snug">{a.title}</p>
                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{a.subject}</p>
                                </div>

                                <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                                    <span
                                        className="text-[10px] font-semibold"
                                        style={{ color: meta.color }}
                                    >
                                        {dueStr}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-orange-400 transition-colors" />
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
