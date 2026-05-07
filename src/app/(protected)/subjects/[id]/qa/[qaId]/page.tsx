'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    Lock,
    Clock,
    Send,
    User,
    MessageSquare,
    BookOpen,
    Paperclip,
    X,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { getMediaUrl } from '@/lib/mediaUrl';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { useSubject } from '../../layout';
import ForumPostItem from '@/components/ForumPostItem';

const FORUM_MAX_FILES = 10;
const FORUM_MAX_SIZE_MB = 10;
const FORUM_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.odt,.ods,.csv,.ppt,.pptx';

interface ForumPost {
    id: number;
    thread: number;
    author: number;
    author_username: string;
    author_first_name: string;
    author_last_name: string;
    content: string;
    file?: string | null;
    attachments?: { id: number | null; file: string | null; position: number }[];
    is_answer: boolean;
    parent_post?: number | null;
    replies?: ForumPost[];
    created_at: string;
    updated_at: string;
}

interface ForumThread {
    id: number;
    subject_group: number;
    subject_group_course_name?: string;
    subject_group_classroom_display?: string;
    created_by: number;
    created_by_username: string;
    created_by_first_name?: string;
    created_by_last_name?: string;
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

export default function SubjectQADetailPage() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params?.id as string;
    const qaId = params?.qaId as string;
    const { user } = useUserState();
    const { subject } = useSubject();
    const { t } = useLocale();
    const [thread, setThread] = useState<ForumThread | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [answerContent, setAnswerContent] = useState('');
    const [answerFiles, setAnswerFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const answerFileInputRef = useRef<HTMLInputElement>(null);
    const [replyingToPostId, setReplyingToPostId] = useState<number | null>(null);
    const [replyingToAuthor, setReplyingToAuthor] = useState<string>('');
    const [replyingToContent, setReplyingToContent] = useState<string>('');

    useEffect(() => {
        if (qaId) {
            fetchThread();
        }
    }, [qaId]);

    const fetchThread = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/forum/threads/${qaId}/`);
            setThread(response.data);
            setError(null);
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } })
                          .response?.data?.message || t('qa.failedToLoad')
                    : t('qa.failedToLoad');
            setError(errorMessage);
            console.error('Error fetching thread:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateAnswerFiles = (files: File[]): string | null => {
        if (files.length > FORUM_MAX_FILES) return `Максимум ${FORUM_MAX_FILES} файлов`;
        const maxBytes = FORUM_MAX_SIZE_MB * 1024 * 1024;
        for (const f of files) {
            if (f.size > maxBytes) return `Файл "${f.name}" больше ${FORUM_MAX_SIZE_MB} МБ`;
        }
        return null;
    };

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answerContent.trim()) return;
        const fileErr = validateAnswerFiles(answerFiles);
        if (fileErr) {
            alert(fileErr);
            return;
        }

        try {
            setSubmitting(true);
            if (answerFiles.length > 0) {
                const formData = new FormData();
                formData.append('thread', qaId);
                formData.append('content', answerContent);
                formData.append('is_answer', String(user?.role === 'teacher'));
                if (replyingToPostId) formData.append('parent_post', String(replyingToPostId));
                answerFiles.forEach(f => formData.append('files', f));
                await axiosInstance.post('/forum/posts/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await axiosInstance.post('/forum/posts/', {
                    thread: parseInt(qaId),
                    content: answerContent,
                    is_answer: user?.role === 'teacher',
                    parent_post: replyingToPostId || undefined,
                });
            }
            setAnswerContent('');
            setAnswerFiles([]);
            setReplyingToPostId(null);
            setReplyingToAuthor('');
            setReplyingToContent('');
            fetchThread();
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } })
                          .response?.data?.message || t('qa.failedToPostAnswer')
                    : t('qa.failedToPostAnswer');
            alert(errorMessage);
            console.error('Error posting answer:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkResolved = async () => {
        if (!thread) return;
        try {
            await axiosInstance.post(`/forum/threads/${qaId}/mark-resolved/`);
            fetchThread();
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } })
                          .response?.data?.message ||
                      t('qa.failedToMarkResolved')
                    : t('qa.failedToMarkResolved');
            alert(errorMessage);
            console.error('Error marking resolved:', err);
        }
    };

    const handleArchive = async () => {
        if (!thread) return;
        try {
            await axiosInstance.post(`/forum/threads/${qaId}/archive/`);
            fetchThread();
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Не удалось архивировать';
            alert(errorMessage);
        }
    };

    const handleUnarchive = async () => {
        if (!thread) return;
        try {
            await axiosInstance.post(`/forum/threads/${qaId}/unarchive/`);
            fetchThread();
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Не удалось вернуть из архива';
            alert(errorMessage);
        }
    };

    const formatDate = (dateString: string) => {
        return formatSchoolDateTime(dateString, 'en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleReplyClick = (postId: number, authorUsername: string, content: string) => {
        setReplyingToPostId(postId);
        setReplyingToAuthor(authorUsername);
        setReplyingToContent(content);
    };

    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const canAnswer = isTeacher || isStudent;
    const isAnnouncement =
        thread?.type === 'announcement' ||
        thread?.type === 'announcement_to_parents';

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl p-4 sm:p-6">
                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="mb-3 h-5 w-1/2 rounded bg-gray-100" />
                            <div className="mb-2 h-3 w-2/3 rounded bg-gray-100" />
                            <div className="h-3 w-1/3 rounded bg-gray-100" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="mx-auto max-w-5xl p-4 sm:p-6">
                <button
                    onClick={() => router.push(`/subjects/${subjectId}/qa`)}
                    className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('qa.backToQA')}
                </button>
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error || t('qa.questionNotFound')}
                </div>
            </div>
        );
    }

    const questionPost = thread.posts[0];
    const answerPosts = thread.posts.slice(1);

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => router.push(`/subjects/${subjectId}/contents`)}
                            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                            <BookOpen className="h-4 w-4" />
                            {subject?.course_name || t('subject.contents')}
                        </button>
                        <button
                            onClick={() => router.push(`/subjects/${subjectId}/qa`)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('qa.backToQA')}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(thread.created_at)}</span>
                    </div>
                </div>
            </div>

            {/* Question Section */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                                {thread.title}
                            </h1>
                            {thread.is_resolved && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Решено
                                </span>
                            )}
                            {!thread.is_public && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                    <Lock className="h-3.5 w-3.5" />
                                    Приватно
                                </span>
                            )}
                            {isAnnouncement && thread.archived && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    {thread.type === 'announcement_to_parents'
                                        ? 'В архиве (родители не видят)'
                                        : 'Архивировано (ученики не видят)'}
                                </span>
                            )}
                            {thread.type === 'question' && (
                                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                    Вопрос
                                </span>
                            )}
                        </div>
                        {(thread.subject_group_course_name || thread.subject_group_classroom_display) && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                                <BookOpen className="h-4 w-4" />
                                {thread.subject_group_course_name && thread.subject_group_classroom_display && (
                                    <span>
                                        {thread.subject_group_course_name} • {thread.subject_group_classroom_display}
                                    </span>
                                )}
                                {thread.subject_group_course_name && !thread.subject_group_classroom_display && (
                                    <span>{thread.subject_group_course_name}</span>
                                )}
                                {!thread.subject_group_course_name && thread.subject_group_classroom_display && (
                                    <span>{thread.subject_group_classroom_display}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isTeacher && isAnnouncement && (
                            thread.archived ? (
                                <button
                                    onClick={handleUnarchive}
                                    className="rounded-lg bg-gray-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                                >
                                    Вернуть из архива
                                </button>
                            ) : (
                                <button
                                    onClick={handleArchive}
                                    className="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                                >
                                    {thread.type === 'announcement_to_parents'
                                        ? 'Скрыть от родителей (архив)'
                                        : 'Скрыть от учеников (архив)'}
                                </button>
                            )
                        )}
                        {isTeacher && !thread.is_resolved && thread.type === 'question' && (
                            <button
                                onClick={handleMarkResolved}
                                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                                {t('qa.markAsResolved')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                            {thread.created_by_username}
                        </span>
                        <span>•</span>
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(thread.created_at)}</span>
                    </div>
                </div>

                {questionPost && (
                    <div className="mb-1 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 sm:text-[15px]">
                            {questionPost.content}
                        </p>
                        {(questionPost.attachments?.length || questionPost.file) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(questionPost.attachments ?? (questionPost.file ? [{ id: null, file: questionPost.file, position: 0 }] : [])).map((att: { id: number | null; file: string | null }, i: number) => (
                                    att.file && (
                                        <a
                                            key={att.id ?? i}
                                            href={getMediaUrl(att.file)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-gray-100"
                                        >
                                            <Paperclip className="h-4 w-4 flex-shrink-0" />
                                            {att.file.split('/').pop()?.split('?')[0] || 'Файл'}
                                        </a>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Answers Section */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
                        <MessageSquare className="h-5 w-5 text-violet-600" />
                        {t('qa.answers')}
                    </h2>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        {answerPosts.length}
                    </span>
                </div>

                {answerPosts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                        <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                        <p className="text-gray-600">{t('qa.noAnswers')}</p>
                        {canAnswer && (
                            <p className="mt-2 text-sm text-gray-500">
                                {t('qa.beFirstToAnswer')}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {answerPosts.map(post => (
                            <ForumPostItem
                                key={post.id}
                                post={post}
                                depth={0}
                                canAnswer={canAnswer}
                                onReplyClick={handleReplyClick}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Answer Form */}
            {canAnswer && thread.allow_replies && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="mb-4 text-base font-bold text-gray-900 sm:text-lg">
                        {t('qa.yourAnswer')}
                    </h3>
                    {thread.is_resolved && (
                        <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                            <p className="text-sm text-yellow-800">
                                {t('qa.questionResolvedNote')}
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleSubmitAnswer}>
                        {replyingToPostId && (
                            <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                                <div className="flex-1">
                                    <p className="text-sm text-blue-800">
                                        Ты отвечаешь на пост от <strong>{replyingToAuthor}</strong>
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                                        "{replyingToContent}"
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplyingToPostId(null);
                                        setReplyingToAuthor('');
                                        setReplyingToContent('');
                                    }}
                                    className="rounded-lg px-2 py-1 text-sm font-bold text-blue-700 transition-colors hover:bg-sky-100"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <textarea
                            value={answerContent}
                            onChange={e => setAnswerContent(e.target.value)}
                            rows={6}
                            className="mb-4 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                            placeholder={t('qa.answerPlaceholder')}
                            required
                        />

                        {answerFiles.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {answerFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                                    >
                                        <Paperclip className="h-4 w-4 flex-shrink-0 text-gray-500" />
                                        <span className="truncate max-w-[160px]">{file.name}</span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setAnswerFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={answerFileInputRef}
                                    type="file"
                                    multiple
                                    accept={FORUM_ACCEPT}
                                    className="hidden"
                                    onChange={e => {
                                        const chosen = e.target.files ? Array.from(e.target.files) : [];
                                        setAnswerFiles(prev => [...prev, ...chosen].slice(0, FORUM_MAX_FILES));
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => answerFileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                                >
                                    <Paperclip className="h-4 w-4" />
                                    {t('forms.file') || 'Прикрепить файл'}
                                    {answerFiles.length > 0 && ` (${answerFiles.length}/${FORUM_MAX_FILES})`}
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !answerContent.trim()}
                                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                                <Send className="h-5 w-5" />
                                {submitting
                                    ? t('qa.posting')
                                    : t('qa.postAnswer')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
