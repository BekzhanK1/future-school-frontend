'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
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
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error || 'Сообщение не найдено'}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="bg-white rounded-t-lg shadow-sm border border-gray-200 border-b-0 p-6 flex items-center shrink-0">
                <button
                    onClick={() => router.push('/messages')}
                    className="p-2 hover:bg-gray-100 rounded-full mr-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {thread.title}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Участники: {thread.participants.length}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto p-6 space-y-6">
                {thread.posts.map((post: any) => {
                    const isOwn = user?.id === post.author;
                    return (
                        <div
                            key={post.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="flex max-w-[80%] gap-3">
                                {!isOwn && (
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-1">
                                        <User className="w-4 h-4 text-gray-600" />
                                    </div>
                                )}
                                <div
                                    className={`rounded-2xl p-4 ${
                                        isOwn
                                            ? 'bg-purple-600 text-white rounded-tr-sm'
                                            : 'bg-white border text-gray-900 border-gray-200 rounded-tl-sm'
                                    }`}
                                >
                                    <div className={`text-xs mb-1 font-medium ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                                        {post.author_username}
                                    </div>
                                    <div className="whitespace-pre-wrap">{post.content}</div>
                                    <div className={`text-xs mt-2 text-right ${isOwn ? 'text-purple-200' : 'text-gray-400'}`}>
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
            <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-4 shrink-0">
                <form onSubmit={handleReply} className="flex gap-4">
                    <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Написать ответ..."
                        className="flex-1 bg-gray-50 border border-gray-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={replying}
                    />
                    <button
                        type="submit"
                        disabled={replying || !replyContent.trim()}
                        className="flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {replying ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 ml-1" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
