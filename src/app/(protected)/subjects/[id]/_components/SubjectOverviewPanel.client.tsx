'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, Info, Plus } from 'lucide-react';
import type { SubjectOverviewData } from './SubjectOverviewCard';
import { useUserState } from '@/contexts/UserContext';
import { modalController } from '@/lib/modalController';
import { SharedLinkItem } from './SharedLinkItem';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';

interface SubjectOverviewPanelProps {
    data: SubjectOverviewData;
    courseSectionId?: number;
    onRefresh?: () => void;
}

export function handleFileView(
    fileData: {
        file: string;
        title: string;
        type: string;
        id?: number | string;
    },
    filename: string,
    courseSectionId?: number
) {
    if (fileData.type === 'directory') {
        // Fetch directory contents from API
        const resourceId =
            typeof fileData.id === 'string'
                ? parseInt(fileData.id)
                : fileData.id || 0;
        fetchDirectoryContents(resourceId, filename, courseSectionId);
    } else {
        const fileUrl = fileData.file;

        modalController.open('file-viewer', {
            file: {
                url: fileUrl,
                title: filename,
                type: fileData.type,
            },
        });
    }
}

async function fetchDirectoryContents(
    resourceId: number,
    directoryTitle: string,
    courseSectionId?: number
) {
    // Validate resourceId
    if (!resourceId || resourceId === 0) {
        console.error('Invalid resource ID for directory:', resourceId);
        modalController.open('directory-viewer', {
            directory: {
                title: directoryTitle,
                files: [],
                parent_id: resourceId,
            },
            onFileClick: (file: {
                id: number;
                title: string;
                type: string;
                file_url?: string;
                file?: string;
                is_directory?: boolean;
            }) => {
                handleFileView(
                    {
                        file: file.file_url || file.file || '',
                        title: file.title,
                        type: file.is_directory ? 'directory' : 'file',
                        id: file.id,
                    },
                    file.title
                );
            },
            onAddFile: (parentId: number) => {
                console.log('Add file to directory:', parentId);
            },
            onDownloadFolder: () => {
                console.log('Download entire folder');
            },
        });
        return;
    }

    try {
        const response = await axiosInstance.get(`/resources/${resourceId}/`);
        const resource = response.data;

        // Transform children data to match DirectoryModal format
        const files =
            resource.children?.map(
                (child: {
                    id: number;
                    title: string;
                    type: string;
                    file?: string;
                    size?: number;
                }) => ({
                    id: child.id,
                    title: child.title,
                    type: child.type,
                    file_url: child.file,
                    file: child.file,
                    size: child.size,
                    is_directory: child.type === 'directory',
                })
            ) || [];

        const directoryData = {
            title: directoryTitle,
            files: files,
            parent_id: resourceId,
        };

        modalController.open('directory-viewer', {
            directory: directoryData,
            onFileClick: (file: {
                id: number;
                title: string;
                type: string;
                file_url?: string;
                file?: string;
                is_directory?: boolean;
            }) => {
                // Handle individual file clicks within directory
                handleFileView(
                    {
                        file: file.file_url || file.file || '',
                        title: file.title,
                        type: file.is_directory ? 'directory' : 'file',
                        id: file.id,
                    },
                    file.title,
                    courseSectionId
                );
            },
            onAddFile: (parentId: number) => {
                console.log('Add file to directory:', parentId);
                if (courseSectionId) {
                    handleAddFileToDirectory(
                        parentId,
                        directoryTitle,
                        courseSectionId,
                        () => {
                            // Refresh directory contents after adding files
                            fetchDirectoryContents(
                                resourceId,
                                directoryTitle,
                                courseSectionId
                            );
                        }
                    );
                }
            },
            onDownloadFolder: () => {
                console.log('Download entire folder');
                handleDownloadFolder(resourceId, directoryTitle);
            },
        });
    } catch (error) {
        console.error('Error fetching directory contents:', error);
        // Fallback to empty directory
        modalController.open('directory-viewer', {
            directory: {
                title: directoryTitle,
                files: [],
                parent_id: resourceId,
            },
            onFileClick: (file: {
                id: number;
                title: string;
                type: string;
                file_url?: string;
                file?: string;
                is_directory?: boolean;
            }) => {
                handleFileView(
                    {
                        file: file.file_url || file.file || '',
                        title: file.title,
                        type: file.is_directory ? 'directory' : 'file',
                        id: file.id,
                    },
                    file.title,
                    courseSectionId
                );
            },
            onAddFile: (parentId: number) => {
                console.log('Add file to directory:', parentId);
                if (courseSectionId) {
                    handleAddFileToDirectory(
                        parentId,
                        directoryTitle,
                        courseSectionId,
                        () => {
                            // Refresh directory contents after adding files
                            fetchDirectoryContents(
                                resourceId,
                                directoryTitle,
                                courseSectionId
                            );
                        }
                    );
                }
            },
            onDownloadFolder: () => {
                console.log('Download entire folder');
                handleDownloadFolder(resourceId, directoryTitle);
            },
        });
    }
}

export function handleDirectoryView(
    directoryData: {
        title: string;
        files: Array<{
            id: number;
            title: string;
            type: string;
            file_url?: string;
            file?: string;
            size?: number;
            is_directory?: boolean;
        }>;
        parent_id?: number;
    },
    onFileClick?: (file: {
        id: number;
        title: string;
        type: string;
        file_url?: string;
        file?: string;
        is_directory?: boolean;
    }) => void,
    onAddFile?: (parentId: number) => void,
    onDownloadFolder?: () => void
) {
    console.log('Opening directory in modal:', directoryData);

    modalController.open('directory-viewer', {
        directory: directoryData,
        onFileClick,
        onAddFile,
        onDownloadFolder,
    });
}

export function handleAddFileToDirectory(
    directoryId: number,
    directoryTitle: string,
    courseSectionId: number,
    onSuccess?: () => void
) {
    console.log('Opening add file to directory modal:', {
        directoryId,
        directoryTitle,
        courseSectionId,
    });

    modalController.open('add-file-to-directory', {
        directoryId,
        directoryTitle,
        courseSectionId,
        onSuccess,
    });
}

export async function handleDownloadFolder(
    directoryId: number,
    directoryTitle: string
) {
    console.log('Downloading folder as ZIP:', { directoryId, directoryTitle });

    try {
        const { default: axiosInstance } = await import('@/lib/axios');

        // Make request to download ZIP
        const response = await axiosInstance.get(
            `/resources/${directoryId}/download-zip/`,
            {
                responseType: 'blob', // Important for binary data
            }
        );

        // Create blob URL and trigger download
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);

        // Create temporary link element to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${directoryTitle}.zip`;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('Folder download completed successfully');
    } catch (error) {
        console.error('Error downloading folder:', error);

        // Show user-friendly error message
        const errorMessage =
            error instanceof Error
                ? error.message
                : 'Failed to download folder';
        alert(`Error downloading folder: ${errorMessage}`);
    }
}

export default function SubjectOverviewPanel({
    data,
    courseSectionId,
    onRefresh,
}: SubjectOverviewPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { user } = useUserState();
    const { t } = useLocale();
    const isTeacher = user?.role === 'teacher';

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleExpanded();
            }
        },
        [toggleExpanded]
    );

    const handleAddItem = useCallback(() => {
        if (courseSectionId) {
            modalController.open('course-section-add-item', {
                courseSectionId,
                onItemCreated: (
                    itemType: 'resource' | 'assignment' | 'test'
                ) => {
                    console.log(
                        `${itemType} created in overview, refreshing...`
                    );
                    onRefresh?.();
                },
            });
        }
    }, [courseSectionId, onRefresh]);

    const handleDeleteItem = useCallback(
        async (
            itemId: string,
            itemType: 'resource' | 'assignment' | 'test'
        ) => {
            const itemTypeLabel =
                itemType === 'assignment'
                    ? 'задание'
                    : itemType === 'test'
                      ? 'тест'
                      : 'ресурс';

            modalController.open('confirmation', {
                title: 'Подтверждение удаления',
                message: `Вы уверены, что хотите удалить этот ${itemTypeLabel}? Это действие нельзя отменить.`,
                confirmText: 'Удалить',
                cancelText: 'Отмена',
                confirmVariant: 'danger',
                onConfirm: async () => {
                    const endpoint =
                        itemType === 'assignment'
                            ? `/assignments/${itemId}/`
                            : itemType === 'test'
                              ? `/tests/${itemId}/`
                              : `/resources/${itemId}/`;
                    await axiosInstance.delete(endpoint);
                    console.log(
                        `${itemType} deleted successfully from overview`
                    );
                },
                onSuccess: () => {
                    console.log(
                        `${itemType} deleted from overview, refreshing...`
                    );
                    onRefresh?.();
                },
            });
        },
        [onRefresh]
    );

    return (
        <section
            className="rounded-2xl border border-gray-100 bg-white shadow-sm w-full overflow-hidden"
            aria-labelledby="subject-overview-title"
        >
            {/* Header */}
            <button
                type="button"
                onClick={toggleExpanded}
                onKeyDown={handleKeyDown}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-violet-600" />
                    </div>
                    <h2
                        id="subject-overview-title"
                        className="text-base font-bold text-gray-900"
                    >
                        {data.title}
                    </h2>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {isTeacher && (
                        <button
                            onClick={handleAddItem}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
                            title="Добавить материал"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Добавить
                        </button>
                    )}
                    <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                    />
                </div>
            </button>

            {/* Content */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-5 pb-5 space-y-2 border-t border-gray-100 pt-4">
                    {/* Description */}
                    {data.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {data.description}
                        </p>
                    )}

                    {data.resources && data.resources.length > 0 && (
                        <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            {data.resources.map((resource) => (
                                <SharedLinkItem
                                    key={resource.id}
                                    item={resource}
                                    isTeacher={isTeacher}
                                    onFileView={(fileData, filename) =>
                                        handleFileView(fileData, filename, courseSectionId)
                                    }
                                    onDelete={handleDeleteItem}
                                />
                            ))}
                        </div>
                    )}

                    {!data.description && (!data.resources || data.resources.length === 0) && (
                        <p className="text-sm text-gray-400 italic">Нет материалов</p>
                    )}
                </div>
            </div>
        </section>
    );
}
