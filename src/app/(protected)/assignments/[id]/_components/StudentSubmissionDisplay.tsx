'use client';

import { FileText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { StudentSubmission } from './types';

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
            // English: 12-hour format with AM/PM
            return date.toLocaleString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } else {
            // Russian/Kazakh: 24-hour format
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('assignmentPage.submittedWork')}
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                            <p
                                onClick={() => {
                                    onFileView(
                                        {
                                            file: submission.file,
                                            title: submission.file,
                                            type: 'file',
                                        },
                                        submission.file
                                    );
                                }}
                                className="font-medium text-blue-900 cursor-pointer"
                            >
                                {submission.file.length > 60
                                    ? submission.file.slice(0, 60) + '...'
                                    : submission.file}
                            </p>
                            <p className="text-sm text-blue-700">
                                {t('assignmentPage.submittedOn')}:{' '}
                                {formatDate(submission.submitted_at)}
                            </p>
                        </div>
                    </div>
                    {submission.file && (
                        <button
                            onClick={() => {
                                const filename =
                                    submission.file.length > 60
                                        ? submission.file.slice(0, 60) + '...'
                                        : submission.file || 'submission';
                                onDownload(submission.file, filename);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            {t('assignmentPage.download')}
                        </button>
                    )}
                </div>

                {/* Render image if the submitted file is an image */}
                {submission.file &&
                    submission.file.match(
                        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i
                    ) && (
                        <div className="mt-4">
                            <img
                                src={submission.file}
                                alt="Submitted work"
                                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                                style={{ maxHeight: '400px' }}
                                onError={e => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                {submission.text && (
                    <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm text-gray-700">
                            <strong>{t('assignmentPage.textPart')}:</strong>
                        </p>
                        <p className="mt-1 text-gray-900">{submission.text}</p>
                    </div>
                )}

                {/* Student Submission Attachments */}
                {submission.attachments &&
                    submission.attachments.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                {t('assignmentPage.submissionAttachments')}:
                            </p>
                            <div className="space-y-2">
                                {submission.attachments.map(attachment => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                                    >
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-gray-700 flex-1 truncate">
                                            {attachment.title}
                                        </span>
                                        {attachment.type === 'file' &&
                                        attachment.file ? (
                                            <button
                                                onClick={() =>
                                                    onFileView(
                                                        {
                                                            file: attachment.file,
                                                            title: attachment.title,
                                                            type: 'file',
                                                        },
                                                        attachment.file
                                                    )
                                                }
                                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                {t('assignmentPage.open')}
                                            </button>
                                        ) : attachment.type === 'link' &&
                                          attachment.file_url ? (
                                            <a
                                                href={attachment.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                {t('assignmentPage.open')}
                                            </a>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                {submission.grade_value !== null && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-sm font-medium text-yellow-800">
                            {t('assignmentPage.grade')}:{' '}
                            {submission.grade_value} / {maxGrade}
                        </p>
                        {submission.grade_feedback && (
                            <p className="mt-1 text-sm text-yellow-700">
                                {submission.grade_feedback}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
