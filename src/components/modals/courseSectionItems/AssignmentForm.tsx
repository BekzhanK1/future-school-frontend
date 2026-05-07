'use client';

import { useMemo, useRef, useState } from 'react';
import { Calendar, Hash } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { datetimeLocalValueToUtcIso, utcIsoToDatetimeLocalValue } from '@/lib/datetimeLocal';
import { AxiosError } from 'axios';
import { useLocale } from '@/contexts/LocaleContext';
import { AssignmentFormData, AssignmentAttachment, FormCallbacks } from './types';
import { isAttachmentValid } from './utils';
import AttachmentManager from './AttachmentManager';
import AppZoneDateTimePicker from '@/components/ui/AppZoneDateTimePicker';
import type { AssignmentEditBootstrap } from './AssignmentForm.types';

interface AssignmentCreateProps extends FormCallbacks {
    variant?: 'create';
    courseSectionId: number;
    assignmentId?: never;
    editBootstrap?: never;
}

interface AssignmentEditProps extends FormCallbacks {
    variant: 'edit';
    editBootstrap: AssignmentEditBootstrap;
    assignmentId?: never;
    courseSectionId?: never;
}

type AssignmentFormProps = (AssignmentCreateProps | AssignmentEditProps) & {
    userId: number;
    defaultDueAt?: string;
};

const inputCls =
    'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-gray-400 transition';

function initialFormFromProps(props: AssignmentFormProps): AssignmentFormData {
    if (props.variant === 'edit' && props.editBootstrap) {
        const b = props.editBootstrap;
        return {
            title: b.title,
            description: b.description,
            due_at: b.due_at
                ? utcIsoToDatetimeLocalValue(b.due_at)
                : '',
            max_grade: b.max_grade,
            teacher: b.teacher,
            attachments:
                b.attachments.length > 0
                    ? b.attachments
                    : ([] as AssignmentAttachment[]),
        };
    }

    return {
        title: '',
        description: '',
        due_at: props.defaultDueAt || '',
        max_grade: 100,
        teacher: props.userId,
        attachments: [],
    };
}

export default function AssignmentForm(props: AssignmentFormProps) {
    const {
        userId,
        onSuccess,
        onError,
        onComplete,
    } = props;
    const variant = props.variant === 'edit' ? 'edit' : 'create';
    const editBootstrap =
        variant === 'edit'
            ? (props as AssignmentEditProps).editBootstrap
            : undefined;
    const courseSectionId =
        variant === 'create'
            ? (props as AssignmentCreateProps).courseSectionId
            : undefined;

    const { t, locale } = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);

    const snapshotsRef = useRef(editBootstrap?.snapshots ?? {});
    const initialAttachmentIdsRef = useRef(
        new Set(
            editBootstrap
                ? Object.keys(editBootstrap.snapshots).map(Number)
                : []
        )
    );

    /** Legacy link/text rows hidden in UI but kept on server unless explicitly removed */
    const preservedLegacyAttachmentIds = useMemo(() => {
        if (variant !== 'edit' || !editBootstrap) return new Set<number>();
        return new Set(
            Object.entries(editBootstrap.snapshots)
                .filter(([, s]) => s.type === 'link' || s.type === 'text')
                .map(([id]) => Number(id))
        );
    }, [variant, editBootstrap]);

    const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>(
        () => initialFormFromProps(props)
    );

    const multipartHeaders = {
        headers: { 'Content-Type': 'multipart/form-data' },
    } as const;

    const createAttachment = async (
        assignmentId: number,
        attachment: AssignmentAttachment
    ): Promise<void> => {
        const formData = new FormData();
        formData.append('assignment', assignmentId.toString());
        formData.append('type', 'file');
        formData.append('title', attachment.title);
        if (attachment.file) {
            formData.append('file', attachment.file);
        }
        await axiosInstance.post(
            '/assignment-attachments/',
            formData,
            multipartHeaders
        );
    };

    const handleSubmitEdit = async () => {
        if (!editBootstrap) return;
        const assignmentId = editBootstrap.assignmentId;

        const dueAtIso = datetimeLocalValueToUtcIso(assignmentForm.due_at);
        if (!dueAtIso) {
            onError(t('courseSectionModal.failedToCreateAssignment'));
            return;
        }

        await axiosInstance.patch(`/assignments/${assignmentId}/`, {
            title: assignmentForm.title,
            description: assignmentForm.description,
            due_at: dueAtIso,
            max_grade: assignmentForm.max_grade,
            teacher: assignmentForm.teacher || userId,
        });

        const currentIds = new Set<number>([
            ...assignmentForm.attachments
                .filter((a): a is AssignmentAttachment & { id: number } =>
                    typeof a.id === 'number'
                )
                .map(a => a.id),
            ...preservedLegacyAttachmentIds,
        ]);

        for (const id of initialAttachmentIdsRef.current) {
            if (!currentIds.has(id)) {
                await axiosInstance.delete(`/assignment-attachments/${id}/`);
            }
        }

        for (const att of assignmentForm.attachments) {
            if (!att.id) {
                await createAttachment(assignmentId, att);
                continue;
            }

            const orig = snapshotsRef.current[att.id];
            if (!orig || orig.type !== 'file') continue;

            const titleChanged = att.title !== orig.title;
            if (att.file) {
                const fd = new FormData();
                fd.append('title', att.title);
                fd.append('type', 'file');
                fd.append('file', att.file);
                await axiosInstance.patch(
                    `/assignment-attachments/${att.id}/`,
                    fd,
                    multipartHeaders
                );
            } else if (titleChanged) {
                await axiosInstance.patch(`/assignment-attachments/${att.id}/`, {
                    title: att.title,
                });
            }
        }

        onSuccess(t('assignmentEditModal.saveSuccess'));
        setTimeout(() => onComplete(), 1200);
    };

    const handleSubmitCreate = async (
        validAttachments: AssignmentAttachment[]
    ) => {
        if (!courseSectionId) {
            onError(t('courseSectionModal.failedToCreateAssignment'));
            return;
        }

        const dueAtIso = datetimeLocalValueToUtcIso(assignmentForm.due_at);
        if (!dueAtIso) {
            onError(t('courseSectionModal.failedToCreateAssignment'));
            return;
        }

        const assignmentResponse = await axiosInstance.post('/assignments/', {
            course_section: courseSectionId,
            teacher: assignmentForm.teacher || userId,
            title: assignmentForm.title,
            description: assignmentForm.description,
            due_at: dueAtIso,
            max_grade: assignmentForm.max_grade,
        });

        const createdAssignmentId = assignmentResponse.data.id;

        if (validAttachments.length === 0) {
            onSuccess(t('courseSectionModal.assignmentCreatedSuccess'));
            setTimeout(() => onComplete(), 1500);
            return;
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: [] as Array<{ title: string; error: string }>,
        };

        for (const attachment of validAttachments) {
            try {
                await createAttachment(createdAssignmentId, attachment);
                results.successful++;
            } catch (attachmentError) {
                results.failed++;
                const errorMsg =
                    attachmentError instanceof AxiosError
                        ? String(
                              attachmentError.response?.data?.detail ||
                                  attachmentError.response?.data?.message ||
                                  attachmentError.message
                          )
                        : 'Unknown error';
                results.errors.push({ title: attachment.title, error: errorMsg });
            }
        }

        if (results.failed === 0) {
            onSuccess(
                t('courseSectionModal.assignmentWithAttachmentsSuccess', {
                    count: validAttachments.length,
                })
            );
        } else if (results.successful > 0) {
            onSuccess(
                t('courseSectionModal.assignmentPartialSuccess', {
                    successful: results.successful,
                    total: validAttachments.length,
                })
            );
            onError(
                t('courseSectionModal.someAttachmentsFailed', {
                    errors: results.errors.map(e => `"${e.title}": ${e.error}`).join('; '),
                })
            );
        } else {
            onSuccess(t('courseSectionModal.assignmentAttachmentsFailed'));
            onError(
                t('courseSectionModal.attachmentErrors', {
                    errors: results.errors.map(e => `"${e.title}": ${e.error}`).join('; '),
                })
            );
        }

        setTimeout(() => onComplete(), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onError('');
        setAttemptedSubmit(true);

        const validationErrors: string[] = [];
        assignmentForm.attachments.forEach((attachment, index) => {
            const num = index + 1;
            if (!attachment.title?.trim()) {
                validationErrors.push(
                    t('courseSectionModal.validationAttachmentTitle', { num })
                );
            } else if (
                !attachment.file &&
                !attachment.existingFileUrl?.trim()
            ) {
                validationErrors.push(
                    t('courseSectionModal.validationAttachmentFile', {
                        num,
                        title: attachment.title,
                    })
                );
            }
        });

        if (validationErrors.length > 0) {
            onError(validationErrors.join('; '));
            return;
        }

        setIsSubmitting(true);

        try {
            const validAttachments =
                assignmentForm.attachments.filter(isAttachmentValid);

            if (variant === 'edit') {
                await handleSubmitEdit();
            } else {
                await handleSubmitCreate(validAttachments);
            }
        } catch (error: unknown) {
            let errorMessage =
                variant === 'edit'
                    ? t('assignmentEditModal.saveFailed')
                    : t('courseSectionModal.failedToCreateAssignment');
            if (error instanceof AxiosError && error.response?.data) {
                const responseData = error.response.data;
                if (typeof responseData === 'object') {
                    errorMessage =
                        Object.entries(responseData)
                            .map(
                                ([field, msgs]) =>
                                    `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
                            )
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
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                    className={inputCls}
                    placeholder={t('courseSectionModal.enterAssignmentTitle')}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                    className={inputCls}
                    placeholder={t('courseSectionModal.enterAssignmentDescription')}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('courseSectionModal.dueDate')}
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                        <AppZoneDateTimePicker
                            value={assignmentForm.due_at}
                            onChange={v =>
                                setAssignmentForm(prev => ({
                                    ...prev,
                                    due_at: v,
                                }))
                            }
                            uiLocale={locale}
                            required
                            className={`${inputCls} pl-10`}
                            popperClassName="z-[400]"
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
                            onChange={e =>
                                setAssignmentForm(prev => ({
                                    ...prev,
                                    max_grade: Number.parseInt(
                                        e.target.value,
                                        10
                                    ) || 100,
                                }))
                            }
                            min={1}
                            max={1000}
                            className={`${inputCls} pl-10`}
                        />
                    </div>
                </div>
            </div>

            <AttachmentManager
                attachments={
                    assignmentForm.attachments?.length
                        ? assignmentForm.attachments
                        : []
                }
                onChange={attachments =>
                    setAssignmentForm(prev => ({
                        ...prev,
                        attachments,
                    }))
                }
                attemptedSubmit={attemptedSubmit}
                onErrorClear={() => onError('')}
            />

            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    {isSubmitting
                        ? variant === 'edit'
                            ? t('assignmentEditModal.saving')
                            : t('courseSectionModal.creating')
                        : variant === 'edit'
                          ? t('assignmentEditModal.save')
                          : t('courseSectionModal.createAssignment')}
                </button>
            </div>
        </form>
    );
}
