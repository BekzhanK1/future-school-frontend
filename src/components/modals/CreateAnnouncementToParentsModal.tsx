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
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Класс/предмет * (можно несколько)
                    </label>
                    {loadingSubjects ? (
                        <div className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-violet-600" />
                        </div>
                    ) : (
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
                            {subjectGroups.map(sg => (
                                <label key={sg.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
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
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-200"
                                    />
                                    <span className="text-sm text-gray-700">{displayName(sg)}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Заголовок *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Заголовок объявления"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                        required
                    />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Текст *</label>
                    <textarea
                        value={formData.content}
                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Текст объявления для родителей"
                        rows={5}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                        required
                    />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="allow_replies_parents"
                            checked={formData.allow_replies}
                            onChange={e => setFormData(prev => ({ ...prev, allow_replies: e.target.checked }))}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-200"
                        />
                        <div>
                            <label htmlFor="allow_replies_parents" className="text-sm font-semibold text-gray-800">
                                Разрешить родителям оставлять комментарии
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                Если выключить, родители смогут только прочитать объявление.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
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
                        className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                    >
                        {submitting ? 'Отправка...' : 'Отправить родителям'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
