'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Clock, Users, HelpCircle, Megaphone } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
import CreateQuestionModal from '@/components/modals/CreateQuestionModal';
import CreateAnnouncementToParentsModal from '@/components/modals/CreateAnnouncementToParentsModal';

interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface ForumPost {
    id: number;
    thread: number;
    author: number;
    author_username: string;
    content: string;
    created_at: string;
}

interface ForumThread {
    id: number;
    subject_group?: number;
    subject_group_course_name?: string;
    subject_group_classroom_display?: string;
    created_by: number;
    created_by_username: string;
    created_by_first_name: string;
    created_by_last_name: string;
    participants: number[];
    title: string;
    type: string;
    is_public?: boolean;
    created_at: string;
    posts: ForumPost[];
}

export default function MessagesPage() {
    const router = useRouter();
    const { user } = useUserState();
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showToParentsModal, setShowToParentsModal] = useState(false);

    const fetchThreads = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/forum/threads/');
            const threadsData = Array.isArray(response.data)
                ? response.data
                : response.data.results || [];
            setThreads(threadsData);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching messages:', err);
            setError('Не удалось загрузить сообщения');
        } finally {
            setLoading(false);
        }
    }, []);

    const personalThreads = threads.filter((t: ForumThread) => t.type === 'direct_message');
    const classThreads = threads.filter(
        (t: ForumThread) =>
            t.type === 'question' || t.type === 'announcement_to_parents'
    );

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!user) return null;

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-[28px]">
                            Сообщения
                        </h1>
                        <p className="text-sm text-gray-600 sm:text-base">
                        Связь между родителями и учителями
                    </p>
                </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        {user?.role === 'teacher' && (
                            <button
                                onClick={() => setShowToParentsModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                            >
                                <Megaphone className="h-4 w-4" />
                                Объявление родителям класса
                            </button>
                        )}
                        {user?.role === 'parent' && (
                            <button
                                onClick={() => setShowQuestionModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white px-3.5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50"
                            >
                                <HelpCircle className="h-4 w-4" />
                                Вопрос в общий форум класса
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/messages/new')}
                            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                            <Plus className="h-4 w-4" />
                            {user?.role === 'parent'
                                ? 'Личное сообщение учителю'
                                : 'Личное сообщение родителю'}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="mb-3 h-5 w-1/3 rounded bg-gray-100" />
                            <div className="mb-2 h-3 w-2/3 rounded bg-gray-100" />
                            <div className="h-3 w-1/2 rounded bg-gray-100" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : (
                <>
                    {/* Личные сообщения */}
                    <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                <Users className="h-5 w-5 text-violet-600" />
                                Личные сообщения
                            </h2>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                {personalThreads.length}
                            </span>
                        </div>
                        {personalThreads.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                                Нет личной переписки
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {personalThreads.map((thread: ForumThread) => (
                                    <div
                                        key={thread.id}
                                        onClick={() => router.push(`/messages/${thread.id}`)}
                                        className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:bg-violet-50/30"
                                    >
                                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                                            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                                                {thread.title}
                                            </h3>
                                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                                Личное
                                            </span>
                                        </div>
                                        <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                                            {thread.posts[0]?.content || 'Нет содержимого'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 sm:text-sm">
                                            <span>
                                                От:{' '}
                                                {thread.created_by_first_name || thread.created_by_last_name
                                                    ? [thread.created_by_first_name, thread.created_by_last_name].filter(Boolean).join(' ')
                                                    : thread.created_by_username}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(thread.created_at)}
                                            </span>
                                            {thread.participants?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    {thread.participants.length} участник(ов)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Обращения по классу (вопросы и объявления родителям) */}
                    <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                <MessageSquare className="h-5 w-5 text-violet-600" />
                                Обращения по классу
                            </h2>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                {classThreads.length}
                            </span>
                        </div>
                        <p className="mb-3 text-sm text-gray-500">
                            Вопросы и объявления, которые видят учитель и родители класса
                        </p>
                        {classThreads.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                                Пока нет обращений в общий форум
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {classThreads.map((thread: ForumThread) => (
                                    <div
                                        key={thread.id}
                                        onClick={() => {
                                            if (thread.type === 'direct_message') {
                                                router.push(`/messages/${thread.id}`);
                                            } else if (thread.subject_group) {
                                                router.push(`/subjects/${thread.subject_group}/qa/${thread.id}`);
                                            }
                                        }}
                                        className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:bg-violet-50/30"
                                    >
                                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                                            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                                                {thread.title}
                                            </h3>
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                                {thread.type === 'announcement_to_parents'
                                                    ? 'Объявление родителям'
                                                    : 'Вопрос'}
                                            </span>
                                            {thread.subject_group_course_name && (
                                                <span className="text-xs text-gray-500">
                                                    {thread.subject_group_course_name}
                                                    {thread.subject_group_classroom_display && ` • ${thread.subject_group_classroom_display}`}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                                            {thread.posts[0]?.content || 'Нет содержимого'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 sm:text-sm">
                                            <span>
                                                От:{' '}
                                                {thread.created_by_first_name || thread.created_by_last_name
                                                    ? [thread.created_by_first_name, thread.created_by_last_name].filter(Boolean).join(' ')
                                                    : thread.created_by_username}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(thread.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            <CreateQuestionModal
                isOpen={showQuestionModal}
                onClose={() => setShowQuestionModal(false)}
                onQuestionCreated={() => { setShowQuestionModal(false); fetchThreads(); }}
            />
            <CreateAnnouncementToParentsModal
                isOpen={showToParentsModal}
                onClose={() => setShowToParentsModal(false)}
                onCreated={() => { setShowToParentsModal(false); fetchThreads(); }}
            />
        </div>
    );
}
