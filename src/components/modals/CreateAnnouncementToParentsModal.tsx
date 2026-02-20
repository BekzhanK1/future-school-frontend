'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';

interface SubjectGroup {
    id: number;
    course_name: string;
    course_code: string;
    classroom_display?: string;
}

interface CreateAnnouncementToParentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateAnnouncementToParentsModal({
    isOpen,
    onClose,
    onCreated,
}: CreateAnnouncementToParentsModalProps) {
    const { user } = useUserState();
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        subject_groups: [] as number[],
        allow_replies: true,
    });

    useEffect(() => {
        if (isOpen && user?.role === 'teacher') {
            fetchSubjectGroups();
        }
    }, [isOpen, user]);

    const fetchSubjectGroups = async () => {
        setLoadingSubjects(true);
        try {
            const response = await axiosInstance.get('/subject-groups/?teacher=' + user?.id);
            const data = response.data?.results ?? response.data;
            setSubjectGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching subject groups:', error);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim() || !formData.content?.trim() || formData.subject_groups.length === 0) {
            alert('Заполните заголовок, текст и выберите хотя бы один класс.');
            return;
        }
        setSubmitting(true);
        try {
            for (const subjectGroupId of formData.subject_groups) {
                await axiosInstance.post('/forum/threads/', {
                    title: formData.title.trim(),
                    initial_content: formData.content.trim(),
                    subject_group: subjectGroupId,
                    type: 'announcement_to_parents',
                    is_public: true,
                    allow_replies: formData.allow_replies,
                });
            }
            setFormData({ title: '', content: '', subject_groups: [], allow_replies: true });
            onCreated();
            onClose();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { subject_group?: string; detail?: string } } }).response?.data
                        ?.subject_group ||
                      (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
                    : 'Ошибка создания объявления';
            alert(typeof msg === 'string' ? msg : 'Ошибка создания объявления');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setFormData({ title: '', content: '', subject_groups: [], allow_replies: true });
            onClose();
        }
    };

    const displayName = (sg: SubjectGroup) =>
        sg.classroom_display ? `${sg.course_name} (${sg.classroom_display})` : `${sg.course_name} (${sg.course_code})`;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Объявление родителям класса" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Класс/предмет * (можно несколько)
                    </label>
                    {loadingSubjects ? (
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {subjectGroups.map(sg => (
                                <label key={sg.id} className="flex items-center gap-2 py-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.subject_groups.includes(sg.id)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    subject_groups: [...prev.subject_groups, sg.id],
                                                }));
                                            } else {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    subject_groups: prev.subject_groups.filter(id => id !== sg.id),
                                                }));
                                            }
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">{displayName(sg)}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Заголовок *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Заголовок объявления"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Текст *</label>
                    <textarea
                        value={formData.content}
                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Текст объявления для родителей"
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                        required
                    />
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="allow_replies_parents"
                        checked={formData.allow_replies}
                        onChange={e => setFormData(prev => ({ ...prev, allow_replies: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="allow_replies_parents" className="text-sm font-medium text-gray-700">
                        Разрешить родителям оставлять комментарии
                    </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            !formData.title?.trim() ||
                            !formData.content?.trim() ||
                            formData.subject_groups.length === 0
                        }
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {submitting ? 'Отправка...' : 'Отправить родителям'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
