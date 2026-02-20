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
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Сообщения</h1>
                    <p className="text-gray-600">
                        Связь между родителями и учителями
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {user?.role === 'teacher' && (
                        <button
                            onClick={() => setShowToParentsModal(true)}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <Megaphone className="w-5 h-5" />
                            Объявление родителям класса
                        </button>
                    )}
                    {user?.role === 'parent' && (
                        <button
                            onClick={() => setShowQuestionModal(true)}
                            className="flex items-center gap-2 bg-white border border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <HelpCircle className="w-5 h-5" />
                            Вопрос в общий форум класса
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/messages/new')}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        {user?.role === 'parent' ? 'Личное сообщение учителю' : 'Личное сообщение родителю'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            ) : (
                <>
                    {/* Личные сообщения */}
                    <section className="mb-10">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Личные сообщения
                        </h2>
                        {personalThreads.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
                                Нет личной переписки
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {personalThreads.map((thread: ForumThread) => (
                                    <div
                                        key={thread.id}
                                        onClick={() => router.push(`/messages/${thread.id}`)}
                                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="text-xl font-semibold text-gray-900">{thread.title}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">Личное</span>
                                        </div>
                                        <p className="text-gray-600 mb-3 line-clamp-2">
                                            {thread.posts[0]?.content || 'Нет содержимого'}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                            <span>
                                                От: {thread.created_by_first_name || thread.created_by_last_name
                                                    ? [thread.created_by_first_name, thread.created_by_last_name].filter(Boolean).join(' ')
                                                    : thread.created_by_username}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatDate(thread.created_at)}
                                            </span>
                                            {thread.participants?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
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
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Обращения по классу
                        </h2>
                        <p className="text-sm text-gray-500 mb-3">
                            Вопросы и объявления, которые видят учитель и родители класса
                        </p>
                        {classThreads.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
                                Пока нет обращений в общий форум
                            </div>
                        ) : (
                            <div className="space-y-4">
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
                                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="text-xl font-semibold text-gray-900">{thread.title}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
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
                                        <p className="text-gray-600 mb-3 line-clamp-2">
                                            {thread.posts[0]?.content || 'Нет содержимого'}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                            <span>
                                                От: {thread.created_by_first_name || thread.created_by_last_name
                                                    ? [thread.created_by_first_name, thread.created_by_last_name].filter(Boolean).join(' ')
                                                    : thread.created_by_username}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
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
