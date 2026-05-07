'use client';

import { FileText, FolderOpen } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { AssignmentAttachment } from './types';
import { isProbablyImageUrl } from '@/lib/attachmentPreview';
import { isAssignmentFileAttachment } from '@/lib/assignmentAttachmentFilters';

interface AssignmentAttachmentsListProps {
    attachments: AssignmentAttachment[];
    file?: string;
    onFileView: (
        attachment: { file: string; title: string; type: string },
        fileUrl: string
    ) => void;
}

export default function AssignmentAttachmentsList({
    attachments,
    file,
    onFileView,
}: AssignmentAttachmentsListProps) {
    const { t } = useLocale();

    const fileRows =
        attachments?.filter(
            a => isAssignmentFileAttachment(a.type) && !!a.file?.trim()
        ) ?? [];

    const hasLegacyMainFile = Boolean(file?.trim());
    const hasAnyFiles = hasLegacyMainFile || fileRows.length > 0;

    function renderThumb(url: string) {
        if (!isProbablyImageUrl(url)) return null;
        return (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={e => {
                        e.currentTarget.parentElement!.style.display = 'none';
                    }}
                />
            </div>
        );
    }

    function fileRowLabel(url: string, title?: string) {
        const base = title?.trim() || url.split('/').pop() || url;
        return base.length > 56 ? `${base.slice(0, 56)}…` : base;
    }

    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
            <div className="mb-3 flex items-start gap-2">
                <FolderOpen
                    className="mt-0.5 h-5 w-5 shrink-0 text-gray-500"
                    aria-hidden
                />
                <div>
                    <h3
                        id="assignment-materials-heading"
                        className="text-base font-semibold text-gray-900"
                    >
                        {t('assignmentPage.materialsTitle')}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-600">
                        {t('assignmentPage.materialsHint')}
                    </p>
                </div>
            </div>

            {!hasAnyFiles ? (
                <div
                    className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center"
                    role="status"
                >
                    <p className="text-sm text-gray-600">
                        {t('assignmentPage.noMaterials')}
                    </p>
                </div>
            ) : (
                <ul className="space-y-2" aria-labelledby="assignment-materials-heading">
                    {hasLegacyMainFile && file ? (
                        <li key="__legacy_file">
                            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300 md:flex-nowrap">
                                {(isProbablyImageUrl(file) &&
                                    renderThumb(file)) || (
                                    <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-900">
                                        {fileRowLabel(file)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {t('assignmentPage.fileType')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onFileView(
                                            {
                                                file,
                                                title: fileRowLabel(file),
                                                type: 'file',
                                            },
                                            file
                                        )
                                    }
                                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {t('assignmentPage.open')}
                                </button>
                            </div>
                        </li>
                    ) : null}

                    {fileRows.map(attachment => {
                        const url = attachment.file.trim();
                        const display = fileRowLabel(url, attachment.title);
                        const thumb = isProbablyImageUrl(url)
                            ? renderThumb(url)
                            : null;
                        return (
                            <li key={attachment.id}>
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300 md:flex-nowrap">
                                    {thumb || (
                                        <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900">
                                            {attachment.title || display}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t('assignmentPage.fileType')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onFileView(
                                                {
                                                    file: url,
                                                    title: attachment.title,
                                                    type: 'file',
                                                },
                                                url
                                            )
                                        }
                                        className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        {t('assignmentPage.open')}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
