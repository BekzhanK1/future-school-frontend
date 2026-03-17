'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock, MessageCircle, FileText, FlaskConical, ChevronRight } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { useRouter } from 'next/navigation';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    triggered_by_username: string;
    triggered_by_first_name: string;
    triggered_by_last_name: string;
    related_assignment: number | null;
    related_assignment_subject_name: string | null;
    related_assignment_classroom_name: string | null;
    related_test: number | null;
    related_test_subject_name: string | null;
    related_test_classroom_name: string | null;
    related_forum_thread: number | null;
    related_forum_thread_subject_group: number | null;
    related_forum_thread_subject_name: string | null;
    related_forum_thread_classroom_name: string | null;
    related_forum_post: number | null;
}

type TypeMeta = { icon: React.ReactNode; accent: string; bg: string; label: string };

function getTypeMeta(type: string): TypeMeta {
    if (type.includes('assignment')) return {
        icon: <FileText className="w-4 h-4" />,
        accent: 'text-amber-600', bg: 'bg-amber-50', label: 'Задание',
    };
    if (type.includes('test')) return {
        icon: <FlaskConical className="w-4 h-4" />,
        accent: 'text-blue-600', bg: 'bg-blue-50', label: 'Тест',
    };
    if (type.includes('forum') || type.includes('message')) return {
        icon: <MessageCircle className="w-4 h-4" />,
        accent: 'text-violet-600', bg: 'bg-violet-50', label: 'Сообщение',
    };
    return {
        icon: <Bell className="w-4 h-4" />,
        accent: 'text-gray-500', bg: 'bg-gray-100', label: 'Уведомление',
    };
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
    const { t } = useLocale();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/notifications/');
            setNotifications(response.data.results || response.data || []);
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await axiosInstance.get('/notifications/unread_count/');
            setUnreadCount(response.data.unread_count || 0);
        } catch { /* silent */ }
    };

    const markAsRead = async (id: number) => {
        try {
            await axiosInstance.post(`/notifications/${id}/mark_as_read/`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.post('/notifications/mark_all_as_read/');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const clearAll = async () => {
        if (!confirm('Удалить все уведомления?')) return;
        try {
            await axiosInstance.delete('/notifications/clear_all/');
            setNotifications([]);
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const getLink = (n: Notification): string | null => {
        if (n.related_assignment) return `/assignments/${n.related_assignment}`;
        if (n.related_test) return `/tests/${n.related_test}`;
        if (n.related_forum_thread) {
            if (!n.related_forum_thread_subject_group) return `/messages/${n.related_forum_thread}`;
            return `/subjects/${n.related_forum_thread_subject_group}/qa/${n.related_forum_thread}`;
        }
        return null;
    };

    const getContext = (n: Notification) => {
        if (n.related_forum_thread_subject_name && n.related_forum_thread_classroom_name)
            return `${n.related_forum_thread_subject_name} · ${n.related_forum_thread_classroom_name}`;
        if (n.related_assignment_subject_name && n.related_assignment_classroom_name)
            return `${n.related_assignment_subject_name} · ${n.related_assignment_classroom_name}`;
        if (n.related_test_subject_name && n.related_test_classroom_name)
            return `${n.related_test_subject_name} · ${n.related_test_classroom_name}`;
        return null;
    };

    const handleClick = async (n: Notification, e: React.MouseEvent) => {
        e.preventDefault();
        if (!n.is_read) await markAsRead(n.id);
        const link = getLink(n);
        if (link) router.push(link);
    };

    const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-2/3" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Уведомления</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-violet-600 font-medium">{unreadCount} непрочитанных</p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Прочитать все
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                title="Удалить все"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs */}
                {notifications.length > 0 && (
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                        {(['all', 'unread'] as const).map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {f === 'all' ? `Все (${notifications.length})` : `Новые (${unreadCount})`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {displayed.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-50 flex items-center justify-center">
                            <Bell className="w-8 h-8 text-violet-200" />
                        </div>
                        <p className="font-semibold text-gray-700">
                            {filter === 'unread' ? 'Нет новых уведомлений' : 'Нет уведомлений'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Когда появятся — они будут здесь</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayed.map(n => {
                            const meta = getTypeMeta(n.type);
                            const link = getLink(n);
                            const context = getContext(n);
                            const senderName = n.triggered_by_first_name || n.triggered_by_last_name
                                ? `${n.triggered_by_first_name} ${n.triggered_by_last_name}`.trim()
                                : n.triggered_by_username;

                            return (
                                <div
                                    key={n.id}
                                    onClick={link ? e => handleClick(n, e as any) : undefined}
                                    className={`group relative flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                                        n.is_read
                                            ? 'bg-white border-gray-100 hover:border-gray-200'
                                            : 'bg-violet-50/60 border-violet-100 hover:border-violet-200'
                                    } ${link ? 'cursor-pointer' : ''}`}
                                >
                                    {/* Unread dot */}
                                    {!n.is_read && (
                                        <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white" />
                                    )}

                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.accent} mt-0.5 ${!n.is_read ? 'ml-3' : ''}`}>
                                        {meta.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm font-semibold leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                {n.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                    {formatDate(n.created_at)}
                                                </span>
                                                {!n.is_read && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
                                                        className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Отметить прочитанным"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {n.message && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        )}

                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            {senderName && (
                                                <span className="text-[11px] text-gray-400">от {senderName}</span>
                                            )}
                                            {context && (
                                                <span className={`text-[11px] font-medium ${meta.accent}`}>
                                                    {context}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow for clickable */}
                                    {link && (
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 self-center shrink-0 transition-colors" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
