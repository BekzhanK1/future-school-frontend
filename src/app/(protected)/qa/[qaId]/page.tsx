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
    Paperclip,
    X,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { getMediaUrl } from '@/lib/mediaUrl';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
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
    created_by: number;
    created_by_username: string;
    title: string;
    type: string;
    is_public: boolean;
    is_resolved: boolean;
    allow_replies: boolean;
    created_at: string;
    updated_at: string;
    posts: ForumPost[];
}

export default function QADetailPage() {
    const router = useRouter();
    const params = useParams();
    const qaId = params?.qaId as string;
    const { user } = useUserState();
    const { t } = useLocale();
    const [thread, setThread] = useState<ForumThread | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [answerContent, setAnswerContent] = useState('');
    const [answerFiles, setAnswerFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const answerFileInputRef = useRef<HTMLInputElement>(null);
    const [replyingToPostId, setReplyingToPostId] = useState<number | null>(
        null
    );
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
        } catch (err) {
            alert(t('qa.failedToPost'));
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleReplyClick = (
        postId: number,
        authorUsername: string,
        content: string
    ) => {
        setReplyingToPostId(postId);
        setReplyingToAuthor(authorUsername);
        setReplyingToContent(content);
    };

    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const canAnswer = isTeacher || isStudent;
    const isAuthor = thread?.created_by === parseInt(user?.id || '0');

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <button
                    onClick={() => router.push('/qa')}
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {t('qa.backToQA')}
                </button>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error || t('qa.questionNotFound')}
                </div>
            </div>
        );
    }

    const questionPost = thread.posts[0];
    const answerPosts = thread.posts.slice(1);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button
                onClick={() => router.push('/qa')}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                {t('qa.backToQA')}
            </button>

            {/* Question Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {thread.title}
                        </h1>
                        {thread.is_resolved && (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        )}
                        {!thread.is_public && (
                            <Lock className="w-6 h-6 text-gray-400" />
                        )}
                    </div>
                    {isTeacher && !thread.is_resolved && (
                        <button
                            onClick={handleMarkResolved}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {t('qa.markAsResolved')}
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">
                            {thread.created_by_username}
                        </span>
                        <span>•</span>
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(thread.created_at)}</span>
                    </div>
                    {thread.type === 'announcement' &&
                        !thread.allow_replies && (
                            <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded inline-block mt-2">
                                Комментарии отключены
                            </div>
                        )}
                </div>

                {questionPost && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-800 whitespace-pre-wrap">
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
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-gray-50"
                                        >
                                            <Paperclip className="w-4 h-4 flex-shrink-0" />
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
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {t('qa.answers')} ({answerPosts.length})
                </h2>

                {answerPosts.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">{t('qa.noAnswers')}</p>
                        {canAnswer && (
                            <p className="text-gray-500 text-sm mt-2">
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('qa.yourAnswer')}
                    </h3>
                    {thread.is_resolved && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                {t('qa.questionResolvedNote')}
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleSubmitAnswer}>
                        {replyingToPostId && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-blue-800">
                                        Ты отвечаешь на пост от{' '}
                                        <strong>{replyingToAuthor}</strong>
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
                                    className="text-blue-600 hover:text-blue-700 font-bold ml-2"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <textarea
                            value={answerContent}
                            onChange={e => setAnswerContent(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                            placeholder={t('qa.answerPlaceholder')}
                            required
                        />

                        {/* Multiple file attachments */}
                        {answerFiles.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {answerFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    {t('forms.file') || 'Прикрепить файл'}
                                    {answerFiles.length > 0 && ` (${answerFiles.length}/${FORUM_MAX_FILES})`}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !answerContent.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                            >
                                <Send className="w-5 h-5" />
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
