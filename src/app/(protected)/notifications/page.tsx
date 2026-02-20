'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
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

export default function NotificationsPage() {
    const { t } = useLocale();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/notifications/');
            setNotifications(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await axiosInstance.get('/notifications/unread_count/');
            setUnreadCount(response.data.unread_count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await axiosInstance.post(`/notifications/${notificationId}/mark_as_read/`);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, is_read: true, read_at: new Date().toISOString() }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.post('/notifications/mark_all_as_read/');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const clearAll = async () => {
        if (!confirm('Вы уверены, что хотите удалить все уведомления?')) {
            return;
        }
        try {
            await axiosInstance.delete('/notifications/clear_all/');
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const getNotificationLink = (notification: Notification): string | null => {
        if (notification.related_assignment) {
            return `/assignments/${notification.related_assignment}`;
        }
        if (notification.related_test) {
            return `/tests/${notification.related_test}`;
        }
        if (notification.related_forum_thread) {
            // Личное сообщение (direct_message) — без subject_group, открываем в /messages
            if (!notification.related_forum_thread_subject_group) {
                return `/messages/${notification.related_forum_thread}`;
            }
            return `/subjects/${notification.related_forum_thread_subject_group}/qa/${notification.related_forum_thread}`;
        }
        return null;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_assignment':
            case 'assignment_graded':
                return '📝';
            case 'new_test':
            case 'test_available':
            case 'test_graded':
                return '📋';
            case 'forum_question':
            case 'forum_reply':
            case 'forum_mention':
            case 'forum_resolved':
            case 'forum_direct_message':
            case 'forum_announcement':
                return '💬';
            default:
                return '🔔';
        }
    };

    const formatDate = (dateString: string) => {
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
    };

    const getSubjectAndClassroom = (notification: Notification) => {
        // Try forum thread first
        if (notification.related_forum_thread_subject_name && notification.related_forum_thread_classroom_name) {
            return {
                subject: notification.related_forum_thread_subject_name,
                classroom: notification.related_forum_thread_classroom_name,
            };
        }
        // Try assignment
        if (notification.related_assignment_subject_name && notification.related_assignment_classroom_name) {
            return {
                subject: notification.related_assignment_subject_name,
                classroom: notification.related_assignment_classroom_name,
            };
        }
        // Try test
        if (notification.related_test_subject_name && notification.related_test_classroom_name) {
            return {
                subject: notification.related_test_subject_name,
                classroom: notification.related_test_classroom_name,
            };
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-purple-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Уведомления</h1>
                    {unreadCount > 0 && (
                        <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                            <CheckCheck className="w-4 h-4" />
                            Прочитать все
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Удалить все
                        </button>
                    )}
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Нет уведомлений
                    </h2>
                    <p className="text-gray-600">
                        Когда появятся новые уведомления, они будут отображаться здесь.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map(notification => {
                        const link = getNotificationLink(notification);
                        const NotificationContent = (
                            <div
                                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                                    notification.is_read
                                        ? 'bg-white border-gray-200'
                                        : 'bg-blue-50 border-blue-200'
                                }`}
                            >
                                <div className="text-2xl flex-shrink-0">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3
                                            className={`font-medium ${
                                                notification.is_read
                                                    ? 'text-gray-700'
                                                    : 'text-gray-900'
                                            }`}
                                        >
                                            {notification.title}
                                        </h3>
                                        {!notification.is_read && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                                                title="Отметить как прочитанное"
                                            >
                                                <Check className="w-4 h-4 text-gray-500" />
                                            </button>
                                        )}
                                    </div>
                                    {notification.message && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            {notification.message}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(notification.created_at)}
                                        </div>
                                        {notification.triggered_by_username && (
                                            <span>
                                                {notification.triggered_by_first_name ||
                                                    notification.triggered_by_last_name
                                                    ? `${notification.triggered_by_first_name} ${notification.triggered_by_last_name}`.trim()
                                                    : notification.triggered_by_username}
                                            </span>
                                        )}
                                        {(() => {
                                            const subjectInfo = getSubjectAndClassroom(notification);
                                            if (subjectInfo) {
                                                return (
                                                    <span className="text-purple-600 font-medium">
                                                        {subjectInfo.subject} • {subjectInfo.classroom}
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );

                        const handleNotificationClick = async (e?: React.MouseEvent) => {
                            if (e) {
                                e.preventDefault();
                            }
                            // Automatically mark as read when clicking on notification
                            if (!notification.is_read) {
                                await markAsRead(notification.id);
                            }
                            // Navigate after marking as read
                            if (link) {
                                router.push(link);
                            }
                        };

                        if (link) {
                            return (
                                <a 
                                    key={notification.id} 
                                    href={link}
                                    onClick={handleNotificationClick}
                                    className="block"
                                >
                                    {NotificationContent}
                                </a>
                            );
                        }

                        return (
                            <div 
                                key={notification.id}
                                onClick={handleNotificationClick}
                                className="cursor-pointer"
                            >
                                {NotificationContent}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
