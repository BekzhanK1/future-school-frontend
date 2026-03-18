'use client';

import { useState } from 'react';
import {
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useLocale } from '@/contexts/LocaleContext';

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

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.title;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.title;
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={file?.title || t('modals.fileViewer.documentViewer')}
            maxWidth="max-w-7xl"
        >
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isImage ? (
                            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
                        ) : (
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                {file?.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
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
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">
                                {t('modals.fileViewer.open')}
                            </span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                <div className="bg-white rounded-lg border overflow-hidden">
                    <div
                        className="w-full overflow-auto"
                        style={{
                            height: 'calc(100vh - 300px)',
                            minHeight: '400px',
                            maxHeight: '80vh',
                        }}
                    >
                        {isImage ? (
                            <div className="flex items-center justify-center h-full w-full p-4">
                                <img
                                    src={file.url}
                                    alt={file.title}
                                    className="w-full h-full object-contain"
                                    onError={e => {
                                        console.error(
                                            'Image failed to load:',
                                            e
                                        );
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        ) : isPdf ? (
                            <iframe
                                src={file.url}
                                className="w-full h-full border-0"
                                title={file.title}
                                style={{ minHeight: '500px' }}
                            />
                        ) : isVideo ? (
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
                                    title={file.title}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500 p-4">
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
                                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                        >
                                            {t(
                                                'modals.fileViewer.openInNewTab'
                                            )}
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                                        >
                                            {t('modals.fileViewer.download')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-sm sm:text-base"
                    >
                        {t('modals.fileViewer.close')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
