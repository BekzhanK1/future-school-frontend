'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';

interface Contact {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
}

export default function NewMessagePage() {
    const router = useRouter();
    const { user } = useUserState();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const response = await axiosInstance.get('/users/contacts/');
                setContacts(response.data);
            } catch (err) {
                console.error('Failed to load contacts', err);
                setError('Не удалось загрузить контакты');
            } finally {
                setLoadingContacts(false);
            }
        };

        if (user) {
            fetchContacts();
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedParticipantId || !title.trim() || !content.trim()) {
            setError('Пожалуйста, заполните все поля');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axiosInstance.post('/forum/threads/', {
                type: 'direct_message',
                title: title.trim(),
                is_public: false,
                allow_replies: true,
                initial_content: content.trim(),
                participants: [selectedParticipantId],
            });
            router.push('/messages');
        } catch (err: any) {
            console.error('Failed to create message thread', err);
            setError('Не удалось отправить сообщение');
            setLoading(false);
        }
    };

    if (loadingContacts) {
        return (
            <div className="mx-auto max-w-3xl p-4 sm:p-6">
                <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 h-5 w-1/3 rounded bg-gray-100" />
                    <div className="mb-2 h-3 w-2/3 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
            <div className="mb-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Назад к сообщениям
                </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-[28px]">
                        Новое сообщение
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Выберите получателя и напишите сообщение.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            Кому
                        </label>
                        <select
                            value={selectedParticipantId || ''}
                            onChange={(e) => setSelectedParticipantId(Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                            required
                        >
                            <option value="" disabled>-- Выберите получателя --</option>
                            {contacts.map(contact => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.first_name || contact.last_name
                                        ? `${contact.first_name} ${contact.last_name}`.trim()
                                        : contact.username} ({contact.role === 'teacher' ? 'Учитель' : 'Родитель'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            Тема
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите тему сообщения"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                            required
                        />
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            Сообщение
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Текст сообщения..."
                            className="min-h-[150px] w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                            required
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="submit"
                            disabled={loading || !selectedParticipantId || !title.trim() || !content.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                            Отправить сообщение
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
