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
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к сообщениям
            </button>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Новое сообщение</h1>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Кому
                        </label>
                        <select
                            value={selectedParticipantId || ''}
                            onChange={(e) => setSelectedParticipantId(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Тема
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите тему сообщения"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Сообщение
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Текст сообщения..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px] resize-y"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !selectedParticipantId || !title.trim() || !content.trim()}
                            className="flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-white mr-2" />
                            ) : (
                                <Send className="w-5 h-5 mr-2" />
                            )}
                            Отправить сообщение
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
