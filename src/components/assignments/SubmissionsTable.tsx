'use client';

import { useState } from 'react';
import { X, Edit3, FileText, Download, Check } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { handleFileView } from '@/app/(protected)/subjects/[id]/_components/SubjectOverviewPanel.client';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';

interface Submission {
    id: number;
    submitted_at: string;
    text: string;
    file: string;
    student_username: string;
    student_first_name: string;
    student_last_name: string;
    grade_id?: number;
    grade_value?: number;
    grade_feedback?: string;
    graded_at?: string;
    attachments: {
        id: number;
        type: string;
        title: string;
        content: string;
        file_url: string;
        file: string;
        position: number;
    }[];
}

interface SubmissionsTableProps {
    submissions: Submission[];
    maxGrade: number;
    onGradeUpdate: () => void;
}

export default function SubmissionsTable({
    submissions,
    maxGrade,
    onGradeUpdate,
}: SubmissionsTableProps) {
    const { user } = useUserState();
    const { t, locale } = useLocale();
    const [editingGrade, setEditingGrade] = useState<number | null>(null);
    const [gradeValues, setGradeValues] = useState<{ [key: number]: number }>(
        {}
    );
    const [gradeFeedback, setGradeFeedback] = useState<{
        [key: number]: string;
    }>({});
    const [updating, setUpdating] = useState<number | null>(null);

    const downloadFile = async (fileUrl: string, filename: string) => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(fileUrl, '_blank');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (locale === 'en') {
            return formatSchoolDateTime(date, 'en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        return formatSchoolDateTime(date, 'ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStudentName = (submission: Submission) => {
        return (
            `${submission.student_first_name} ${submission.student_last_name}`.trim() ||
            submission.student_username
        );
    };

    const handleGradeClick = (
        submissionId: number,
        currentGrade?: number,
        currentFeedback?: string
    ) => {
        setEditingGrade(submissionId);
        setGradeValues(prev => ({
            ...prev,
            [submissionId]: currentGrade ?? 0,
        }));
        setGradeFeedback(prev => ({
            ...prev,
            [submissionId]: currentFeedback ?? '',
        }));
    };

    const handleGradeChange = (submissionId: number, value: string) => {
        const numericValue = Number.parseInt(value, 10) || 0;
        setGradeValues(prev => ({
            ...prev,
            [submissionId]: Math.max(0, Math.min(maxGrade, numericValue)),
        }));
    };

    const handleFeedbackChange = (submissionId: number, value: string) => {
        setGradeFeedback(prev => ({
            ...prev,
            [submissionId]: value,
        }));
    };

    const handleGradeSave = async (submissionId: number) => {
        const gradeValue = gradeValues[submissionId];
        const feedback = gradeFeedback[submissionId] || '';
        if (gradeValue === undefined) return;

        try {
            setUpdating(submissionId);

            const submission = submissions.find(s => s.id === submissionId);
            const gradeExists =
                submission &&
                submission.grade_id !== null &&
                submission.grade_id !== undefined;

            if (gradeExists && submission!.grade_id !== undefined) {
                await axiosInstance.patch(`/grades/${submission.grade_id}/`, {
                    grade_value: gradeValue,
                    feedback: feedback,
                });
            } else {
                await axiosInstance.post('/grades/', {
                    submission: submissionId,
                    grade_value: gradeValue,
                    feedback: feedback,
                    graded_by: user?.id,
                });
            }

            setEditingGrade(null);
            setGradeValues({});
            setGradeFeedback({});
            onGradeUpdate();
        } catch (error) {
            console.error('Error updating grade:', error);
        } finally {
            setUpdating(null);
        }
    };

    const handleGradeCancel = () => {
        setEditingGrade(null);
        setGradeValues({});
        setGradeFeedback({});
    };

    if (!submissions || submissions.length === 0) {
        return (
            <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-gray-900">
                    {t('assignmentPage.submissions.title')}
                </h2>
                <div className="py-12 text-center text-sm text-gray-500">
                    {t('assignmentPage.submissions.empty')}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                    {t('assignmentPage.submissions.title')}
                </h2>
                <p className="text-sm text-gray-500">
                    {t('assignmentPage.submissions.count', {
                        count: submissions.length,
                    })}
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/90">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.student')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.file')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.grade')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.feedback')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.submittedAt')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                {t('assignmentPage.submissions.actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {submissions.map(submission => (
                            <tr key={submission.id} className="hover:bg-gray-50/80">
                                <td className="whitespace-nowrap px-4 py-4">
                                    <div className="text-sm font-medium text-gray-900">
                                        {getStudentName(submission)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        @{submission.student_username}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    {submission.file ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const filename =
                                                        submission.file
                                                            .split('/')
                                                            .pop() ||
                                                        'submission';
                                                    handleFileView(
                                                        {
                                                            file: submission.file,
                                                            title: filename,
                                                            type: 'file',
                                                        },
                                                        submission.file
                                                    );
                                                }}
                                                className="max-w-[12rem] truncate rounded-md text-left text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                {submission.file
                                                    .split('/')
                                                    .pop()}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const filename =
                                                        submission.file
                                                            .split('/')
                                                            .pop() ||
                                                        'submission';
                                                    downloadFile(
                                                        submission.file,
                                                        filename
                                                    );
                                                }}
                                                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                aria-label={t(
                                                    'assignmentPage.submissions.downloadFile'
                                                )}
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : submission.text ? (
                                        <div className="text-sm italic text-gray-500">
                                            {t(
                                                'assignmentPage.submissions.textSubmission'
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400">
                                            {t('assignmentPage.submissions.noFile')}
                                        </div>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4">
                                    {editingGrade === submission.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={maxGrade}
                                                value={
                                                    gradeValues[submission.id] ??
                                                    ''
                                                }
                                                onChange={e =>
                                                    handleGradeChange(
                                                        submission.id,
                                                        e.target.value
                                                    )
                                                }
                                                className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-center text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="0"
                                                autoFocus
                                            />
                                            <span className="text-sm text-gray-500">
                                                / {maxGrade}
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="group flex items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-blue-50"
                                            onClick={() =>
                                                handleGradeClick(
                                                    submission.id,
                                                    submission.grade_value,
                                                    submission.grade_feedback
                                                )
                                            }
                                        >
                                            <span
                                                className={`text-sm font-semibold ${
                                                    submission.grade_value !==
                                                        null &&
                                                    submission.grade_value !==
                                                        undefined
                                                        ? 'text-green-700'
                                                        : 'text-gray-900'
                                                }`}
                                            >
                                                {submission.grade_value ?? '—'}
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                / {maxGrade}
                                            </span>
                                            <Edit3 className="h-3 w-3 text-gray-400 opacity-0 transition group-hover:opacity-100" />
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-4">
                                    {editingGrade === submission.id ? (
                                        <textarea
                                            placeholder={t(
                                                'assignmentPage.submissions.feedbackPlaceholder'
                                            )}
                                            value={
                                                gradeFeedback[submission.id] ||
                                                ''
                                            }
                                            onChange={e =>
                                                handleFeedbackChange(
                                                    submission.id,
                                                    e.target.value
                                                )
                                            }
                                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={2}
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            {submission.grade_feedback ? (
                                                submission.grade_feedback
                                            ) : (
                                                <span className="italic text-gray-400">
                                                    {t(
                                                        'assignmentPage.submissions.noComment'
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                    {formatDate(submission.submitted_at)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                                    {editingGrade === submission.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleGradeSave(
                                                        submission.id
                                                    )
                                                }
                                                disabled={
                                                    updating === submission.id
                                                }
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white transition hover:bg-green-700 disabled:bg-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                title={t(
                                                    'assignmentPage.submissions.save'
                                                )}
                                            >
                                                {updating === submission.id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleGradeCancel}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-500 text-white transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                                title={t(
                                                    'assignmentPage.submissions.cancel'
                                                )}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
