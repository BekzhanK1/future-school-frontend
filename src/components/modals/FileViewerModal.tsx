'use client';

import { useEffect, useState } from 'react';
import {
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useLocale } from '@/contexts/LocaleContext';
import { getDisplayFileName } from '@/lib/fileDisplayName';

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: {
        url: string;
        title: string;
        type?: string;
        size?: number;
    };
}

export default function FileViewerModal({
    isOpen,
    onClose,
    file,
}: FileViewerModalProps) {
    const { t } = useLocale();
    const [isDownloading, setIsDownloading] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);

    const displayTitle = getDisplayFileName(file.url, file.title);

    useEffect(() => {
        setPreviewFailed(false);
    }, [file?.url]);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(file.url);
            if (!response.ok) {
                throw new Error(`Download failed with status ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = displayTitle;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            const link = document.createElement('a');
            link.href = file.url;
            link.download = displayTitle;
            link.click();
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenInNewTab = () => {
        window.open(file.url, '_blank', 'noopener,noreferrer');
    };

    const getFileType = () => {
        try {
            const parsed = new URL(file.url, window.location.origin);
            const pathname = parsed.pathname;
            const lastSegment = pathname.split('/').pop() || '';
            const extension = lastSegment.includes('.')
                ? lastSegment.split('.').pop()?.toLowerCase()
                : undefined;
            return extension || 'unknown';
        } catch {
            // Fallback for unexpected/relative URLs
            const withoutQuery = file.url.split('?')[0] || '';
            const lastSegment = withoutQuery.split('/').pop() || '';
            const extension = lastSegment.includes('.')
                ? lastSegment.split('.').pop()?.toLowerCase()
                : undefined;
            return extension || 'unknown';
        }
    };

    const fileType = getFileType();
    const isImage = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'svg',
        'bmp',
    ].includes(fileType);
    const isPdf = fileType === 'pdf';
    const isVideo = ['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileType);
    const canInlinePreview = (isImage || isPdf || isVideo) && !previewFailed;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={displayTitle || t('modals.fileViewer.documentViewer')}
            maxWidth="max-w-7xl"
        >
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-violet-50/40 p-3 sm:p-4 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isImage ? (
                            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 flex-shrink-0" />
                        ) : (
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                {t('modals.fileViewer.fileType', {
                                    type: fileType.toUpperCase(),
                                })}
                                {file?.size &&
                                    ` • ${(file.size / 1024 / 1024).toFixed(1)} MB`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleOpenInNewTab}
                            className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100"
                        >
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">
                                {t('modals.fileViewer.open')}
                            </span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-violet-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                            ) : (
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden sm:inline">
                                {isDownloading
                                    ? t('modals.fileViewer.downloading')
                                    : t('modals.fileViewer.download')}
                            </span>
                        </button>
                    </div>
                </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div
                        className="w-full overflow-auto bg-white"
                        style={{
                            height: 'calc(100vh - 300px)',
                            minHeight: '400px',
                            maxHeight: '80vh',
                        }}
                    >
                        {canInlinePreview && isImage ? (
                            <div className="flex items-center justify-center h-full w-full p-4">
                                <img
                                    src={file.url}
                                    alt={displayTitle}
                                    className="w-full h-full object-contain"
                                    onError={e => {
                                        console.error('Image failed to load:', e);
                                        setPreviewFailed(true);
                                    }}
                                />
                            </div>
                        ) : canInlinePreview && isPdf ? (
                            <iframe
                                src={file.url}
                                className="w-full h-full border-0"
                                title={displayTitle}
                                style={{ minHeight: '500px' }}
                                onError={() => setPreviewFailed(true)}
                            />
                        ) : canInlinePreview && isVideo ? (
                            <div className="flex items-center justify-center p-4 h-full">
                                <video
                                    src={file.url}
                                    controls
                                    className="max-w-full max-h-full"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        width: 'auto',
                                        height: 'auto',
                                    }}
                                    title={displayTitle}
                                    onError={() => setPreviewFailed(true)}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500 p-4 bg-gray-50/40">
                                <div className="text-center">
                                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
                                    <p className="text-base sm:text-lg font-medium">
                                        {t(
                                            'modals.fileViewer.previewNotAvailable'
                                        )}
                                    </p>
                                    <p className="text-sm">
                                        {t('modals.fileViewer.cannotPreview')}
                                    </p>
                                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                                        <button
                                            onClick={handleOpenInNewTab}
                                            className="px-3 sm:px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-semibold"
                                        >
                                            {t(
                                                'modals.fileViewer.openInNewTab'
                                            )}
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                                        >
                                            {t('modals.fileViewer.download')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto rounded-lg px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm sm:text-base font-medium"
                    >
                        {t('modals.fileViewer.close')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
