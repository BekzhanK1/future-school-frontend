'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { handleFileView } from '../../subjects/[id]/_components/SubjectOverviewPanel.client';
import { modalController } from '@/lib/modalController';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import SubmissionsTable from '@/components/assignments/SubmissionsTable';
import AssignmentHeader from './_components/AssignmentHeader';
import AssignmentMetadata from './_components/AssignmentMetadata';
import AssignmentAttachmentsList from './_components/AssignmentAttachmentsList';
import StudentFileUpload from './_components/StudentFileUpload';
import StudentSubmissionDisplay from './_components/StudentSubmissionDisplay';
import { Assignment } from './_components/types';

export default function AssignmentPage() {
    const params = useParams();
    const assignmentId = params.id as string;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { user } = useUserState();
    const { t } = useLocale();

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
        } catch (err) {
            console.error('Download failed:', err);
            window.open(fileUrl, '_blank');
        }
    };

    const fetchAssignment = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(
                `/assignments/${assignmentId}/`
            );
            setAssignment(response.data);
        } catch (err) {
            console.error('Error fetching assignment:', err);
            const errorMessage =
                err instanceof AxiosError
                    ? err.response?.data?.message || err.message
                    : 'Failed to fetch assignment';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [assignmentId]);

    useEffect(() => {
        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId, fetchAssignment]);

    const handleSubmit = async () => {
        if (!selectedFile || !assignment) return;

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('student', user?.id.toString() || '');
            formData.append('assignment', assignmentId.toString());
            formData.append('file', selectedFile);

            await axiosInstance.post('submissions/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSelectedFile(null);
            await fetchAssignment();
        } catch (err) {
            console.error('Error submitting assignment:', err);
            const errorMessage =
                err instanceof AxiosError
                    ? err.response?.data?.message || err.message
                    : 'Failed to submit assignment';
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenUploadModal = () => {
        modalController.open('file-upload', {
            title: t('assignmentPage.attachFile'),
            onFileSelect: (file: File) => {
                setSelectedFile(file);
            },
        });
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
                <div className="animate-pulse space-y-6">
                    <div className="h-40 rounded-2xl bg-gray-200/80" />
                    <div className="h-32 rounded-2xl bg-gray-200/60" />
                    <div className="h-48 rounded-2xl bg-gray-200/50" />
                </div>
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
                <div
                    className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"
                    role="alert"
                >
                    <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                    <h2 className="text-xl font-semibold text-gray-900">
                        {t('assignmentPage.loadingError')}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {error || t('assignmentPage.assignmentNotFound')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
            <div className="space-y-8">
                <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03]">
                    <div className="p-6 sm:p-8">
                        <AssignmentHeader
                            assignment={assignment}
                            userRole={user?.role}
                        />
                        <AssignmentMetadata assignment={assignment} />
                    </div>
                    <div className="border-t border-gray-100 px-6 py-6 sm:px-8">
                        <AssignmentAttachmentsList
                            attachments={assignment.attachments}
                            file={assignment.file}
                            onFileView={handleFileView}
                        />
                    </div>
                </article>

                {user?.role === 'student' && !assignment.is_submitted && (
                    <StudentFileUpload
                        selectedFile={selectedFile}
                        onOpenPicker={handleOpenUploadModal}
                        onFileSelected={setSelectedFile}
                        onFileRemove={() => setSelectedFile(null)}
                        onSubmit={handleSubmit}
                        isSubmitting={submitting}
                        deadlinePassed={assignment.is_deadline_passed}
                    />
                )}

                {user?.role === 'student' &&
                    assignment.is_submitted &&
                    assignment.student_submission && (
                        <StudentSubmissionDisplay
                            submission={assignment.student_submission}
                            maxGrade={assignment.max_grade}
                            onFileView={handleFileView}
                            onDownload={downloadFile}
                        />
                    )}

                {user?.role === 'teacher' &&
                    assignment.all_submissions != null && (
                        <section
                            id="assignment-submissions"
                            tabIndex={-1}
                            className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03]"
                        >
                            <SubmissionsTable
                                submissions={assignment.all_submissions}
                                maxGrade={assignment.max_grade}
                                onGradeUpdate={fetchAssignment}
                            />
                        </section>
                    )}
            </div>
        </div>
    );
}
