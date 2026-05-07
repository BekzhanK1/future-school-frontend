'use client';

import { useCallback, useRef, useState } from 'react';
import { CloudUpload, FileCheck, Loader2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

const ACCEPT =
    'image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,application/*';

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StudentFileUploadProps {
    selectedFile: File | null;
    onOpenPicker: () => void;
    onFileSelected: (file: File) => void;
    onFileRemove: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    deadlinePassed: boolean;
}

export default function StudentFileUpload({
    selectedFile,
    onOpenPicker,
    onFileSelected,
    onFileRemove,
    onSubmit,
    isSubmitting,
    deadlinePassed,
}: StudentFileUploadProps) {
    const { t } = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const canSubmit = !!selectedFile && !deadlinePassed && !isSubmitting;

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!deadlinePassed) setIsDragging(true);
    }, [deadlinePassed]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (deadlinePassed) return;
            const f = e.dataTransfer.files?.[0];
            if (f) onFileSelected(f);
        },
        [deadlinePassed, onFileSelected]
    );

    const handleKeyActivate = (e: React.KeyboardEvent) => {
        if (deadlinePassed) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
        }
    };

    return (
        <section
            aria-labelledby="submit-work-heading"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03]"
        >
            <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-600/95 to-teal-600/95 px-5 py-4 text-white">
                <h2
                    id="submit-work-heading"
                    className="text-lg font-semibold tracking-tight"
                >
                    {t('assignmentPage.submitWorkTitle')}
                </h2>
                <p className="mt-1 text-sm text-white/90">
                    {deadlinePassed
                        ? t('assignmentPage.deadlinePassedHint')
                        : t('assignmentPage.submitHint')}
                </p>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
                {deadlinePassed ? (
                    <div
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                        role="status"
                    >
                        {t('assignmentPage.deadlinePassedBanner')}
                    </div>
                ) : null}

                <div
                    role="button"
                    tabIndex={deadlinePassed ? -1 : 0}
                    onKeyDown={handleKeyActivate}
                    onClick={() => !deadlinePassed && inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    aria-disabled={deadlinePassed}
                    className={`rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
                        deadlinePassed
                            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                            : isDragging
                              ? 'cursor-pointer border-emerald-400 bg-emerald-50/80'
                              : 'cursor-pointer border-gray-200 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        disabled={deadlinePassed}
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) onFileSelected(f);
                            e.target.value = '';
                        }}
                    />
                    <CloudUpload
                        className="mx-auto h-10 w-10 text-gray-400"
                        aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-gray-800">
                        {t('assignmentPage.dropOrChoose')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {t('assignmentPage.fileTypesHint')}
                    </p>
                    <button
                        type="button"
                        disabled={deadlinePassed}
                        onClick={e => {
                            e.stopPropagation();
                            onOpenPicker();
                        }}
                        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        {t('assignmentPage.openFilePicker')}
                    </button>
                </div>

                {selectedFile ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                <FileCheck className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={onFileRemove}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                            >
                                {t('assignmentPage.remove')}
                            </button>
                        </div>
                    </div>
                ) : null}

                <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={onSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                            />
                            {t('assignmentPage.submitting')}
                        </>
                    ) : (
                        t('assignmentPage.submit')
                    )}
                </button>
            </div>
        </section>
    );
}
