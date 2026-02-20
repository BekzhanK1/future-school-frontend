'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Plus,
    MessageCircle,
    CheckCircle2,
    Lock,
    Clock,
    ArrowLeft,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubject } from '../layout';
import CreateQuestionModal from '@/components/modals/CreateQuestionModal';
import CreateAnnouncementModal from '@/components/modals/CreateAnnouncementModal';

interface ForumPost {
    id: number;
    thread: number;
    author: number;
    author_username: string;
    content: string;
    is_answer: boolean;
    created_at: string;
    updated_at: string;
}

interface ForumThread {
    id: number;
    subject_group: number;
    created_by: number;
    created_by_username: string;
    title: string;
    type: string;
    is_public: boolean;
    is_resolved: boolean;
    allow_replies: boolean;
    archived?: boolean;
    created_at: string;
    updated_at: string;
    posts: ForumPost[];
}

export default function SubjectQAPage() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params?.id as string;
    const { subject } = useSubject();
    const { user } = useUserState();
    const { t } = useLocale();
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

    const fetchThreads = useCallback(async () => {
        if (!subject?.id) return;

        try {
            setLoading(true);
            // Filter threads by subject_group
            const response = await axiosInstance.get(
                `/forum/threads/?subject_group=${subject.id}`
            );
            // DRF ViewSets return data directly as an array
            const threadsData = Array.isArray(response.data)
                ? response.data
                : response.data.results || response.data.data || [];
            setThreads(threadsData);
            setError(null);
        } catch (err: unknown) {
            console.error('Error fetching threads:', err);
            let errorMessage = t('qa.failedToLoad');

            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as {
                    response?: {
                        data?: { detail?: string; message?: string };
                        status?: number;
                    };
                };
                if (axiosError.response) {
                    // Check for detail field (DRF default error format)
                    if (axiosError.response.data?.detail) {
                        errorMessage = axiosError.response.data.detail;
                    } else if (axiosError.response.data?.message) {
                        errorMessage = axiosError.response.data.message;
                    } else if (axiosError.response.status === 403) {
                        errorMessage =
                            t('qa.permissionDenied') || 'Permission denied';
                    } else if (axiosError.response.status === 401) {
                        errorMessage = t('qa.unauthorized') || 'Unauthorized';
                    }
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [subject?.id, t]);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isStudent = user?.role === 'student';

    const handleGoToSubject = () => {
        router.push(`/subjects/${subjectId}/contents`);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <button
                onClick={handleGoToSubject}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg mb-4 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                {subject?.course_name || t('subject.contents')}
            </button>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {t('qa.title')}
                    </h1>
                    <p className="text-gray-600">{t('qa.subtitle')}</p>
                </div>
                {isStudent && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        {t('qa.askQuestion')}
                    </button>
                )}
                {!isStudent && user?.role === 'teacher' && (
                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Объявление
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">
                        {t('qa.noQuestions')}
                    </p>
                    {isStudent && (
                        <p className="text-gray-500 mt-2">
                            {t('qa.beFirstToAsk')}
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {threads.map(thread => (
                        <div
                            key={thread.id}
                            onClick={() =>
                                router.push(
                                    `/subjects/${subjectId}/qa/${thread.id}`
                                )
                            }
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {thread.title}
                                        </h3>
                                        {thread.type === 'announcement' && (
                                            <>
                                                <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                                    Объявление ученикам
                                                </span>
                                                {thread.archived && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                                                        В архиве
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {thread.type === 'announcement_to_parents' && (
                                            <>
                                                <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
                                                    Объявление родителям
                                                </span>
                                                {thread.archived && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                                                        В архиве
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {thread.type === 'question' && (
                                            <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">
                                                Вопрос
                                            </span>
                                        )}
                                        {thread.type === 'question' && !thread.is_resolved && (
                                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Открыто
                                            </span>
                                        )}
                                        {thread.is_resolved && (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" title="Решено" />
                                        )}
                                        {!thread.is_public && (
                                            <Lock className="w-5 h-5 text-gray-400" title="Приватно" />
                                        )}
                                    </div>
                                    <p className="text-gray-600 mb-3 line-clamp-2">
                                        {thread.posts[0]?.content ||
                                            t('qa.noContent')}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>
                                            {t('qa.by')}{' '}
                                            {thread.created_by_username}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatDate(thread.created_at)}
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {(() => {
                                                // Exclude the first post (question) from answer count
                                                const answerCount = Math.max(
                                                    0,
                                                    thread.posts.length - 1
                                                );
                                                return `${answerCount} ${
                                                    answerCount === 1
                                                        ? t('qa.answer')
                                                        : t('qa.answers')
                                                }`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Question Modal */}
            {subject && (
                <CreateQuestionModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onQuestionCreated={fetchThreads}
                    defaultSubjectGroupId={subject.id}
                />
            )}

            {/* Create Announcement Modal */}
            {subject && (
                <CreateAnnouncementModal
                    isOpen={showAnnouncementModal}
                    onClose={() => setShowAnnouncementModal(false)}
                    onAnnouncementCreated={fetchThreads}
                    defaultSubjectGroupId={subject.id}
                />
            )}
        </div>
    );
}
