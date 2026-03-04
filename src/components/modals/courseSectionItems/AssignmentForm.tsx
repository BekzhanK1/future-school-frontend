'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { useLocale } from '@/contexts/LocaleContext';
import {
    AssignmentFormData,
    AssignmentAttachment,
    FormCallbacks,
} from './types';
import { isAttachmentValid } from './utils';
import AttachmentManager from './AttachmentManager';

interface AssignmentFormProps extends FormCallbacks {
    courseSectionId: number;
    userId: number;
    /** Значение по умолчанию для дедлайна (datetime-local, YYYY-MM-DDTHH:MM) */
    defaultDueAt?: string;
}

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

    /**
     * Creates a single attachment for an assignment
     */
    const createAttachment = async (
        assignmentId: number,
        attachment: AssignmentAttachment
    ): Promise<void> => {
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

        // Step 1: Validate all attachments before submission
        const validationErrors: string[] = [];
        assignmentForm.attachments.forEach((attachment, index) => {
            const attachmentNum = index + 1;

            if (!attachment.title?.trim()) {
                validationErrors.push(
                    t('courseSectionModal.validationAttachmentTitle', {
                        num: attachmentNum,
                    })
                );
            } else if (attachment.type === 'file' && !attachment.file) {
                validationErrors.push(
                    t('courseSectionModal.validationAttachmentFile', {
                        num: attachmentNum,
                        title: attachment.title,
                    })
                );
            } else if (
                attachment.type === 'link' &&
                !attachment.file_url?.trim()
            ) {
                validationErrors.push(
                    t('courseSectionModal.validationAttachmentUrl', {
                        num: attachmentNum,
                        title: attachment.title,
                    })
                );
            }
        });

        // Show validation errors and prevent submission
        if (validationErrors.length > 0) {
            onError(validationErrors.join('; '));
            return;
        }

        setIsSubmitting(true);

        try {
            // Step 2: All attachments are valid at this point
            const validAttachments =
                assignmentForm.attachments.filter(isAttachmentValid);

            // Step 3: Create the assignment
            const assignmentPayload = {
                course_section: courseSectionId,
                teacher: assignmentForm.teacher || userId,
                title: assignmentForm.title,
                description: assignmentForm.description,
                due_at: assignmentForm.due_at,
                max_grade: assignmentForm.max_grade,
            };

            const assignmentResponse = await axiosInstance.post(
                '/assignments/',
                assignmentPayload
            );

            const createdAssignmentId = assignmentResponse.data.id;
            console.log('✓ Assignment created with ID:', createdAssignmentId);

            // Step 4: Create attachments (if any)
            if (validAttachments.length === 0) {
                onSuccess(t('courseSectionModal.assignmentCreatedSuccess'));
                setTimeout(() => {
                    onComplete();
                }, 1500);
                return;
            }

            // Track attachment creation results
            const results = {
                successful: 0,
                failed: 0,
                errors: [] as Array<{ title: string; error: string }>,
            };

            // Create each attachment individually
            for (let i = 0; i < validAttachments.length; i++) {
                const attachment = validAttachments[i];
                try {
                    await createAttachment(createdAssignmentId, attachment);
                    results.successful++;
                    console.log(
                        `✓ Attachment ${i + 1}/${validAttachments.length}: "${attachment.title}"`
                    );
                } catch (attachmentError) {
                    results.failed++;
                    const errorMsg =
                        attachmentError instanceof AxiosError
                            ? attachmentError.response?.data?.message ||
                              attachmentError.message
                            : 'Unknown error';
                    results.errors.push({
                        title: attachment.title,
                        error: errorMsg,
                    });
                    console.error(
                        `✗ Attachment "${attachment.title}" failed:`,
                        errorMsg
                    );
                }
            }

            // Step 5: Show appropriate feedback
            if (results.failed === 0) {
                // All attachments created successfully
                onSuccess(
                    t('courseSectionModal.assignmentWithAttachmentsSuccess', {
                        count: validAttachments.length,
                    })
                );
            } else if (results.successful > 0) {
                // Partial success
                onSuccess(
                    t('courseSectionModal.assignmentPartialSuccess', {
                        successful: results.successful,
                        total: validAttachments.length,
                    })
                );
                const errorDetails = results.errors
                    .map(e => `"${e.title}": ${e.error}`)
                    .join('; ');
                onError(
                    t('courseSectionModal.someAttachmentsFailed', {
                        errors: errorDetails,
                    })
                );
            } else {
                // All attachments failed
                onSuccess(t('courseSectionModal.assignmentAttachmentsFailed'));
                const errorDetails = results.errors
                    .map(e => `"${e.title}": ${e.error}`)
                    .join('; ');
                onError(
                    t('courseSectionModal.attachmentErrors', {
                        errors: errorDetails,
                    })
                );
            }

            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (error: unknown) {
            console.error('Error creating assignment:', error);

            // Format error message for better UX
            let errorMessage = t('courseSectionModal.failedToCreateAssignment');
            if (error instanceof AxiosError && error.response?.data) {
                const responseData = error.response.data;
                if (typeof responseData === 'object') {
                    // Format validation errors nicely
                    const errors = Object.entries(responseData)
                        .map(([field, msgs]) => {
                            const message = Array.isArray(msgs)
                                ? msgs.join(', ')
                                : msgs;
                            return `${field}: ${message}`;
                        })
                        .join('; ');
                    errorMessage = errors || error.message;
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
            {/* Title Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courseSectionModal.titleRequired')}
                </label>
                <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={e =>
                        setAssignmentForm(prev => ({
                            ...prev,
                            title: e.target.value,
                        }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('courseSectionModal.enterAssignmentTitle')}
                />
            </div>

            {/* Description Textarea */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courseSectionModal.descriptionLabel')}
                </label>
                <textarea
                    value={assignmentForm.description}
                    onChange={e =>
                        setAssignmentForm(prev => ({
                            ...prev,
                            description: e.target.value,
                        }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t(
                        'courseSectionModal.enterAssignmentDescription'
                    )}
                />
            </div>

            {/* Due Date and Max Grade */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('courseSectionModal.dueDate')}
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="datetime-local"
                            value={assignmentForm.due_at}
                            onChange={e =>
                                setAssignmentForm(prev => ({
                                    ...prev,
                                    due_at: e.target.value,
                                }))
                            }
                            required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('courseSectionModal.maxGrade')}
                    </label>
                    <input
                        type="number"
                        value={assignmentForm.max_grade}
                        onChange={e =>
                            setAssignmentForm(prev => ({
                                ...prev,
                                max_grade: parseInt(e.target.value) || 100,
                            }))
                        }
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Attachments Section */}
            <AttachmentManager
                attachments={assignmentForm.attachments}
                onChange={attachments =>
                    setAssignmentForm(prev => ({ ...prev, attachments }))
                }
                attemptedSubmit={attemptedSubmit}
                onErrorClear={() => onError('')}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting
                        ? t('courseSectionModal.creating')
                        : t('courseSectionModal.createAssignment')}
                </button>
            </div>
        </form>
    );
}
