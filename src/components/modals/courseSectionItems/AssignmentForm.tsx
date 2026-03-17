'use client';

import { useState } from 'react';
import { Calendar, Hash } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { useLocale } from '@/contexts/LocaleContext';
import { AssignmentFormData, AssignmentAttachment, FormCallbacks } from './types';
import { isAttachmentValid } from './utils';
import AttachmentManager from './AttachmentManager';

interface AssignmentFormProps extends FormCallbacks {
    courseSectionId: number;
    userId: number;
    defaultDueAt?: string;
}

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-gray-400 transition';

export default function AssignmentForm({
    courseSectionId,
    userId,
    defaultDueAt,
    onSuccess,
    onError,
    onComplete,
}: AssignmentFormProps) {
    const { t } = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>({
        title: '',
        description: '',
        due_at: defaultDueAt || '',
        max_grade: 100,
        teacher: userId,
        attachments: [],
    });

    const createAttachment = async (assignmentId: number, attachment: AssignmentAttachment): Promise<void> => {
        const formData = new FormData();
        formData.append('assignment', assignmentId.toString());
        formData.append('type', attachment.type);
        formData.append('title', attachment.title);
        if (attachment.type === 'file' && attachment.file) {
            formData.append('file', attachment.file);
        } else if (attachment.type === 'link' && attachment.file_url) {
            formData.append('file_url', attachment.file_url);
        }
        await axiosInstance.post('/assignment-attachments/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onError('');
        setAttemptedSubmit(true);

        const validationErrors: string[] = [];
        assignmentForm.attachments.forEach((attachment, index) => {
            const num = index + 1;
            if (!attachment.title?.trim()) {
                validationErrors.push(t('courseSectionModal.validationAttachmentTitle', { num }));
            } else if (attachment.type === 'file' && !attachment.file) {
                validationErrors.push(t('courseSectionModal.validationAttachmentFile', { num, title: attachment.title }));
            } else if (attachment.type === 'link' && !attachment.file_url?.trim()) {
                validationErrors.push(t('courseSectionModal.validationAttachmentUrl', { num, title: attachment.title }));
            }
        });

        if (validationErrors.length > 0) {
            onError(validationErrors.join('; '));
            return;
        }

        setIsSubmitting(true);

        try {
            const validAttachments = assignmentForm.attachments.filter(isAttachmentValid);

            const assignmentResponse = await axiosInstance.post('/assignments/', {
                course_section: courseSectionId,
                teacher: assignmentForm.teacher || userId,
                title: assignmentForm.title,
                description: assignmentForm.description,
                due_at: assignmentForm.due_at,
                max_grade: assignmentForm.max_grade,
            });

            const createdAssignmentId = assignmentResponse.data.id;

            if (validAttachments.length === 0) {
                onSuccess(t('courseSectionModal.assignmentCreatedSuccess'));
                setTimeout(() => onComplete(), 1500);
                return;
            }

            const results = { successful: 0, failed: 0, errors: [] as Array<{ title: string; error: string }> };

            for (const attachment of validAttachments) {
                try {
                    await createAttachment(createdAssignmentId, attachment);
                    results.successful++;
                } catch (attachmentError) {
                    results.failed++;
                    const errorMsg = attachmentError instanceof AxiosError
                        ? attachmentError.response?.data?.message || attachmentError.message
                        : 'Unknown error';
                    results.errors.push({ title: attachment.title, error: errorMsg });
                }
            }

            if (results.failed === 0) {
                onSuccess(t('courseSectionModal.assignmentWithAttachmentsSuccess', { count: validAttachments.length }));
            } else if (results.successful > 0) {
                onSuccess(t('courseSectionModal.assignmentPartialSuccess', { successful: results.successful, total: validAttachments.length }));
                onError(t('courseSectionModal.someAttachmentsFailed', { errors: results.errors.map(e => `"${e.title}": ${e.error}`).join('; ') }));
            } else {
                onSuccess(t('courseSectionModal.assignmentAttachmentsFailed'));
                onError(t('courseSectionModal.attachmentErrors', { errors: results.errors.map(e => `"${e.title}": ${e.error}`).join('; ') }));
            }

            setTimeout(() => onComplete(), 2000);
        } catch (error: unknown) {
            let errorMessage = t('courseSectionModal.failedToCreateAssignment');
            if (error instanceof AxiosError && error.response?.data) {
                const responseData = error.response.data;
                if (typeof responseData === 'object') {
                    errorMessage = Object.entries(responseData)
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                        .join('; ') || error.message;
                } else {
                    errorMessage = error.message;
                }
            }
            onError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('courseSectionModal.titleRequired')}
                </label>
                <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={e => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className={inputCls}
                    placeholder={t('courseSectionModal.enterAssignmentTitle')}
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('courseSectionModal.descriptionLabel')}
                </label>
                <textarea
                    value={assignmentForm.description}
                    onChange={e => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={inputCls}
                    placeholder={t('courseSectionModal.enterAssignmentDescription')}
                />
            </div>

            {/* Due date + Max grade */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('courseSectionModal.dueDate')}
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="datetime-local"
                            value={assignmentForm.due_at}
                            onChange={e => setAssignmentForm(prev => ({ ...prev, due_at: e.target.value }))}
                            required
                            className={`${inputCls} pl-10`}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('courseSectionModal.maxGrade')}
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="number"
                            value={assignmentForm.max_grade}
                            onChange={e => setAssignmentForm(prev => ({ ...prev, max_grade: parseInt(e.target.value) || 100 }))}
                            min="1"
                            max="1000"
                            className={`${inputCls} pl-10`}
                        />
                    </div>
                </div>
            </div>

            {/* Attachments */}
            <AttachmentManager
                attachments={assignmentForm.attachments}
                onChange={attachments => setAssignmentForm(prev => ({ ...prev, attachments }))}
                attemptedSubmit={attemptedSubmit}
                onErrorClear={() => onError('')}
            />

            {/* Submit */}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    {isSubmitting
                        ? t('courseSectionModal.creating')
                        : t('courseSectionModal.createAssignment')}
                </button>
            </div>
        </form>
    );
}
