'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { use } from 'react';

export default function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user } = useUserState();
    const resolvedParams = use(params);
    const [thread, setThread] = useState<any>(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchThread();
    }, [resolvedParams.id]);

    useEffect(() => {
        // Scroll to bottom when thread loads or updates
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread]);

    const fetchThread = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/forum/threads/${resolvedParams.id}/`);
            setThread(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to load thread', err);
            setError('Не удалось загрузить беседу');
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setReplying(true);
        try {
            await axiosInstance.post(`/forum/posts/`, {
                thread: resolvedParams.id,
                content: replyContent.trim(),
            });
            setReplyContent('');
            await fetchThread(); // Refresh posts
        } catch (err) {
            console.error('Failed to send reply', err);
            setError('Не удалось отправить ответ');
        } finally {
            setReplying(false);
        }
    };

    const formatDate = (dateString: string) => {
        return formatSchoolDateTime(dateString, 'ru-RU', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl p-4 sm:p-6">
                <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 h-5 w-1/3 rounded bg-gray-100" />
                    <div className="mb-2 h-3 w-2/3 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="mx-auto max-w-5xl p-4 sm:p-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error || 'Сообщение не найдено'}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex h-[calc(100vh-80px)] max-w-5xl flex-col p-4 sm:p-6">
            {/* Header */}
            <div className="shrink-0 rounded-t-2xl border border-b-0 border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push('/messages')}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-100"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                        {thread.title}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Участники: {thread.participants.length}
                    </p>
                </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto border-x border-gray-100 bg-gray-50/60 p-4 sm:p-6 space-y-4">
                {thread.posts.map((post: any) => {
                    const isOwn = user?.id === post.author;
                    return (
                        <div
                            key={post.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="flex max-w-[80%] gap-3">
                                {!isOwn && (
                                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                )}
                                <div
                                    className={`rounded-2xl p-4 shadow-sm ${
                                        isOwn
                                            ? 'bg-violet-600 text-white rounded-tr-sm'
                                            : 'bg-white text-gray-900 ring-1 ring-gray-200 rounded-tl-sm'
                                    }`}
                                >
                                    <div className={`text-xs mb-1 font-semibold ${isOwn ? 'text-violet-100' : 'text-gray-500'}`}>
                                        {post.author_username}
                                    </div>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {post.content}
                                    </div>
                                    <div className={`text-xs mt-2 text-right ${isOwn ? 'text-violet-100' : 'text-gray-400'}`}>
                                        {formatDate(post.created_at)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="shrink-0 rounded-b-2xl border border-t-0 border-gray-100 bg-white p-3 shadow-sm sm:p-4">
                <form onSubmit={handleReply} className="flex gap-2 sm:gap-3">
                    <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Написать ответ..."
                        className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                        disabled={replying}
                    />
                    <button
                        type="submit"
                        disabled={replying || !replyContent.trim()}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                    >
                        {replying ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5 ml-0.5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
