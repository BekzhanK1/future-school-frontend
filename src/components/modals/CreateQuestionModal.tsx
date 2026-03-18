'use client';

import { useState, useEffect, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';

const FORUM_MAX_FILES = 10;
const FORUM_MAX_SIZE_MB = 10;
const FORUM_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.odt,.ods,.csv,.ppt,.pptx';

interface SubjectGroup {
    id: number;
    course_name: string;
    course_code: string;
    teacher_username: string;
}

interface CreateQuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQuestionCreated: () => void;
    defaultSubjectGroupId?: string | number;
}

export default function CreateQuestionModal({
    isOpen,
    onClose,
    onQuestionCreated,
    defaultSubjectGroupId,
}: CreateQuestionModalProps) {
    const { user } = useUserState();
    const { t } = useLocale();
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        is_public: true,
        subject_group: defaultSubjectGroupId
            ? String(defaultSubjectGroupId)
            : '',
    });
    const [questionFiles, setQuestionFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && (user?.role === 'student' || user?.role === 'parent')) {
            fetchSubjectGroups();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (defaultSubjectGroupId && isOpen) {
            setFormData(prev => ({
                ...prev,
                subject_group: String(defaultSubjectGroupId),
            }));
        }
    }, [defaultSubjectGroupId, isOpen]);

    const fetchSubjectGroups = async () => {
        setLoadingSubjects(true);
        try {
            if (user?.role === 'parent') {
                const response = await axiosInstance.get('/subject-groups/');
                setSubjectGroups(Array.isArray(response.data) ? response.data : response.data?.results ?? []);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userClassroom = (user as any).student_data?.classrooms?.[0]?.id;
                if (userClassroom) {
                    const response = await axiosInstance.get(
                        `/subject-groups/?classroom=${userClassroom}`
                    );
                    setSubjectGroups(Array.isArray(response.data) ? response.data : response.data?.results ?? []);
                }
            }
        } catch (error) {
            console.error('Error fetching subject groups:', error);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const validateFiles = (files: File[]): string | null => {
        if (files.length > FORUM_MAX_FILES) {
            return `Максимум ${FORUM_MAX_FILES} файлов`;
        }
        const maxBytes = FORUM_MAX_SIZE_MB * 1024 * 1024;
        for (const f of files) {
            if (f.size > maxBytes) {
                return `Файл "${f.name}" больше ${FORUM_MAX_SIZE_MB} МБ`;
            }
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content || !formData.subject_group) {
            return;
        }
        const fileError = validateFiles(questionFiles);
        if (fileError) {
            alert(fileError);
            return;
        }

        setSubmitting(true);
        try {
            if (questionFiles.length > 0) {
                const formDataReq = new FormData();
                formDataReq.append('title', formData.title);
                formDataReq.append('initial_content', formData.content);
                formDataReq.append('is_public', String(formData.is_public));
                formDataReq.append('subject_group', formData.subject_group);
                formDataReq.append('type', 'question');
                questionFiles.forEach(f => formDataReq.append('initial_files', f));
                await axiosInstance.post('/forum/threads/', formDataReq, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await axiosInstance.post('/forum/threads/', {
                    title: formData.title,
                    initial_content: formData.content,
                    is_public: formData.is_public,
                    subject_group: parseInt(formData.subject_group),
                    type: 'question',
                });
            }
            setFormData({
                title: '',
                content: '',
                is_public: true,
                subject_group: '',
            });
            setQuestionFiles([]);
            onQuestionCreated();
            onClose();
        } catch (err: unknown) {
            const errorMessage =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } })
                          .response?.data?.message ||
                      t('qa.createQuestionFailed')
                    : t('qa.createQuestionFailed');
            alert(errorMessage);
            console.error('Error creating thread:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setFormData({
                title: '',
                content: '',
                is_public: true,
                subject_group: '',
            });
            setQuestionFiles([]);
            onClose();
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = e.target.files ? Array.from(e.target.files) : [];
        const combined = [...questionFiles, ...chosen].slice(0, FORUM_MAX_FILES);
        setQuestionFiles(combined);
        e.target.value = '';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('qa.createQuestion')}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject Group Dropdown - Hidden if defaultSubjectGroupId is provided */}
                {!defaultSubjectGroupId && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            {t('qa.subjectGroup')} *
                        </label>
                        {loadingSubjects ? (
                            <div className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-violet-600" />
                            </div>
                        ) : (
                            <select
                                value={formData.subject_group}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        subject_group: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                                required
                            >
                                <option value="">
                                    {t('qa.selectSubjectGroup')}
                                </option>
                                {subjectGroups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.course_name} ({group.course_code}
                                        )
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {/* Question Title */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                        {t('qa.questionTitle')} *
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={e =>
                            setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                        placeholder={t('qa.questionTitlePlaceholder')}
                        required
                    />
                </div>

                {/* Question Content */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                        {t('qa.questionContent')} *
                    </label>
                    <textarea
                        value={formData.content}
                        onChange={e =>
                            setFormData({
                                ...formData,
                                content: e.target.value,
                            })
                        }
                        rows={6}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                        placeholder={t('qa.questionContentPlaceholder')}
                        required
                    />
                </div>

                {/* File attachments (optional, max 10) */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <label className="mb-1 block text-sm font-semibold text-gray-800">
                        {t('forms.file') || 'Файлы'}
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                        до {FORUM_MAX_FILES} файлов, максимум {FORUM_MAX_SIZE_MB} МБ каждый
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={FORUM_ACCEPT}
                        className="hidden"
                        onChange={onFileSelect}
                    />
                    <div className="flex flex-wrap gap-2 mb-2">
                        {questionFiles.map((file, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                            >
                                <Paperclip className="w-4 h-4 text-gray-500" />
                                <span className="truncate max-w-[180px]">{file.name}</span>
                                <span className="text-xs text-gray-400">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuestionFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {questionFiles.length < FORUM_MAX_FILES && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                        >
                            <Paperclip className="w-4 h-4" />
                            Добавить файл
                        </button>
                    )}
                </div>

                {/* Public Checkbox */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="is_public"
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={e =>
                                setFormData({
                                    ...formData,
                                    is_public: e.target.checked,
                                })
                            }
                            className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-violet-600 focus:ring-2 focus:ring-violet-200"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label
                            htmlFor="is_public"
                            className="cursor-pointer font-semibold text-gray-800"
                        >
                            {user?.role === 'parent'
                                ? 'В общий форум класса (видят учитель и все родители)'
                                : t('qa.makePublic')}
                        </label>
                        <p className="text-gray-500 mt-1">
                            {user?.role === 'parent'
                                ? 'Снимите галочку, чтобы написать только учителю (приватно)'
                                : t('qa.makePublicDescription')}
                        </p>
                    </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('actions.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            !formData.title ||
                            !formData.content ||
                            !formData.subject_group
                        }
                        className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? t('qa.posting') : t('qa.postQuestion')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
