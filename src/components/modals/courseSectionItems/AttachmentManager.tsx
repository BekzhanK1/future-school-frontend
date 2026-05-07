'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { AssignmentAttachment } from './types';
import { makeEmptyAssignmentAttachment } from './utils';
import { isProbablyImageUrl } from '@/lib/attachmentPreview';

const FILE_ACCEPT =
    'image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,application/*';

interface AttachmentManagerProps {
    attachments: AssignmentAttachment[];
    onChange: (attachments: AssignmentAttachment[]) => void;
    attemptedSubmit: boolean;
    onErrorClear: () => void;
}

export default function AttachmentManager({
    attachments,
    onChange,
    attemptedSubmit,
    onErrorClear,
}: AttachmentManagerProps) {
    const { t } = useLocale();
    const multiInputRef = useRef<HTMLInputElement>(null);

    const appendAttachments = (newRows: AssignmentAttachment[]) => {
        onChange([...attachments, ...newRows]);
    };

    const handleMultiFilesChosen = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const list = e.target.files;
        if (!list?.length) return;
        const newRows = Array.from(list).map(file => {
            const base = file.name.replace(/\.[^/.]+$/, '') || file.name;
            return {
                ...makeEmptyAssignmentAttachment(),
                type: 'file' as const,
                title: base,
                file,
            };
        });
        appendAttachments(newRows);
        e.target.value = '';
        onErrorClear();
    };

    const handleRemoveAttachment = (clientKey: string) => {
        onChange(attachments.filter(a => a.clientKey !== clientKey));
    };

    const handleUpdateAttachment = (
        clientKey: string,
        updates: Partial<AssignmentAttachment>
    ) => {
        onChange(
            attachments.map(a =>
                a.clientKey === clientKey ? { ...a, ...updates } : a
            )
        );
    };

    const fileInvalid = (a: AssignmentAttachment) =>
        attemptedSubmit &&
        !a.file &&
        !a.existingFileUrl?.trim();

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div className="flex flex-col gap-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-800">
                        {t('courseSectionModal.attachments')}
                    </label>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {t('courseSectionModal.attachmentRequirement')}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {t('courseSectionModal.attachmentFilesOnlyHint')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => multiInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 transition-colors hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
                    >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        {t('courseSectionModal.addMultipleFiles')}
                    </button>
                    <input
                        ref={multiInputRef}
                        type="file"
                        multiple
                        accept={FILE_ACCEPT}
                        className="hidden"
                        onChange={handleMultiFilesChosen}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            appendAttachments([makeEmptyAssignmentAttachment()])
                        }
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                        {t('courseSectionModal.addEmptyFileRow')}
                    </button>
                </div>
            </div>

            {attachments.length > 0 && (
                <div className="mt-4 space-y-3">
                    {attachments.map(attachment => {
                        const showExistingImageThumb =
                            !attachment.file &&
                            !!attachment.existingFileUrl?.trim() &&
                            isProbablyImageUrl(attachment.existingFileUrl);

                        return (
                            <div
                                key={attachment.clientKey}
                                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        {t('courseSectionModal.file')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleRemoveAttachment(
                                                attachment.clientKey
                                            )
                                        }
                                        className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded"
                                    >
                                        {t('courseSectionModal.remove')}
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={attachment.title}
                                    onChange={e => {
                                        handleUpdateAttachment(
                                            attachment.clientKey,
                                            {
                                                title: e.target.value,
                                            }
                                        );
                                        onErrorClear();
                                    }}
                                    placeholder={t(
                                        'courseSectionModal.attachmentTitle'
                                    )}
                                    aria-label={t(
                                        'courseSectionModal.attachmentTitle'
                                    )}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                                        attemptedSubmit &&
                                        !attachment.title?.trim()
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-200 focus:ring-violet-400'
                                    }`}
                                />

                                <div className="space-y-2">
                                    {showExistingImageThumb &&
                                        attachment.existingFileUrl ? (
                                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={attachment.existingFileUrl}
                                                alt=""
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2">
                                            <input
                                                type="file"
                                                accept={FILE_ACCEPT}
                                                onChange={ev => {
                                                    handleUpdateAttachment(
                                                        attachment.clientKey,
                                                        {
                                                            file:
                                                                ev.target
                                                                    .files?.[0] ||
                                                                null,
                                                        }
                                                    );
                                                    onErrorClear();
                                                }}
                                                className="sr-only"
                                            />
                                            {t('courseSectionModal.chooseFile')}
                                        </label>
                                        <span className="min-w-0 flex-1 truncate text-sm text-gray-600">
                                            {attachment.file
                                                ? attachment.file.name
                                                : attachment.existingFileUrl
                                                  ? (() => {
                                                        try {
                                                            const u =
                                                                attachment.existingFileUrl.split(
                                                                    '/'
                                                                );
                                                            return decodeURIComponent(
                                                                u[
                                                                    u.length -
                                                                        1
                                                                ] ?? ''
                                                            );
                                                        } catch {
                                                            return attachment.existingFileUrl;
                                                        }
                                                    })()
                                                  : t(
                                                        'courseSectionModal.noFileChosen'
                                                    )}
                                        </span>
                                    </div>
                                    {attachment.existingFileUrl &&
                                        !attachment.file && (
                                            <p className="text-xs text-gray-500">
                                                {t(
                                                    'courseSectionModal.replaceFileHint'
                                                )}
                                            </p>
                                        )}
                                    {fileInvalid(attachment) && (
                                        <p className="text-xs text-red-600">
                                            {t(
                                                'courseSectionModal.noFileSelected'
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
