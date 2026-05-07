'use client';

import { Download, FileText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { StudentSubmission } from './types';
import { isProbablyImageUrl } from '@/lib/attachmentPreview';
import { isAssignmentFileAttachment } from '@/lib/assignmentAttachmentFilters';

interface StudentSubmissionDisplayProps {
    submission: StudentSubmission;
    maxGrade: number;
    onFileView: (
        attachment: { file: string; title: string; type: string },
        fileUrl: string
    ) => void;
    onDownload: (fileUrl: string, filename: string) => void;
}

export default function StudentSubmissionDisplay({
    submission,
    maxGrade,
    onFileView,
    onDownload,
}: StudentSubmissionDisplayProps) {
    const { t, locale } = useLocale();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);

        if (locale === 'en') {
            return formatSchoolDateTime(date, 'en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }

        return formatSchoolDateTime(date, 'ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const fileAttachments =
        submission.attachments?.filter(
            a => isAssignmentFileAttachment(a.type) && !!a.file?.trim()
        ) ?? [];

    const mainFile = submission.file?.trim();

    const filenameFromUrl = (url: string) => {
        try {
            const seg = url.split('/').pop() ?? url;
            return decodeURIComponent(seg);
        } catch {
            return url;
        }
    };

    return (
        <section
            aria-labelledby="submitted-work-heading"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03]"
        >
            <div className="border-b border-gray-100 px-5 py-4">
                <h2
                    id="submitted-work-heading"
                    className="text-lg font-semibold text-gray-900"
                >
                    {t('assignmentPage.submittedWork')}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                    {t('assignmentPage.submittedOn')}:{' '}
                    {formatDate(submission.submitted_at)}
                </p>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
                {mainFile ? (
                    <div className="rounded-xl border border-gray-100 bg-slate-50/80 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                <div className="min-w-0">
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        {t('assignmentPage.mainFile')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onFileView(
                                                {
                                                    file: mainFile,
                                                    title: filenameFromUrl(
                                                        mainFile
                                                    ),
                                                    type: 'file',
                                                },
                                                mainFile
                                            )
                                        }
                                        className="mt-1 rounded text-left text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        <span className="break-all">
                                            {filenameFromUrl(mainFile)}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    onDownload(
                                        mainFile,
                                        filenameFromUrl(mainFile)
                                    )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <Download className="h-4 w-4" aria-hidden />
                                {t('assignmentPage.download')}
                            </button>
                        </div>

                        {isProbablyImageUrl(mainFile) && (
                            <div className="mt-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={mainFile}
                                    alt=""
                                    className="max-h-48 max-w-full rounded-lg border border-gray-200 object-contain"
                                    onError={e => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">
                        {t('assignmentPage.noMainFile')}
                    </p>
                )}

                {fileAttachments.length > 0 ? (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            {t('assignmentPage.submissionAttachments')}
                        </h3>
                        <ul className="mt-2 space-y-2">
                            {fileAttachments.map(attachment => {
                                const url = attachment.file.trim();
                                return (
                                    <li
                                        key={attachment.id}
                                        className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white p-3"
                                    >
                                        {isProbablyImageUrl(url) ? (
                                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={url}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ) : (
                                            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                                            {attachment.title}
                                        </span>
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
                                            className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            {t('assignmentPage.open')}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null}

                {submission.grade_value !== null &&
                    submission.grade_value !== undefined && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-900">
                                {t('assignmentPage.grade')}:{' '}
                                {submission.grade_value} / {maxGrade}
                            </p>
                            {submission.grade_feedback ? (
                                <p className="mt-2 text-sm text-amber-900/90">
                                    {submission.grade_feedback}
                                </p>
                            ) : null}
                        </div>
                    )}
            </div>
        </section>
    );
}
