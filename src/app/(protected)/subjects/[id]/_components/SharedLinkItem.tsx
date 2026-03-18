'use client';

import { useState, useEffect } from 'react';
import { getIconByType, IconType } from './IconUtils';
import { DeleteButton } from './WeekMaterialsPanel.client';
import { modalController } from '@/lib/modalController';
import axiosInstance from '@/lib/axios';
import TemplateLinkIndicator from '@/components/courseTemplates/TemplateLinkIndicator';
import { resourceService } from '@/services/resourceService';
import { useUser } from '@/contexts/UserContext';
import { RefreshCw } from 'lucide-react';

interface SharedLinkItemProps {
    item: {
        id: string;
        file?: string;
        url?: string;
        lesson_link?: string;
        document?: string;
        test?: string;
        video?: string;
        image?: string;
        recording?: string;
        title: string;
        type?: string;
        template_resource?: number | null;
        is_unlinked_from_template?: boolean;
    };
    isTeacher: boolean;
    onFileView?: (
        fileData: { file: string; title: string; type: string; id?: string },
        title: string
    ) => void;
    onDelete?: (
        itemId: string,
        itemType: 'resource' | 'assignment' | 'test'
    ) => void;
    onRefresh?: () => void;
}

export function SharedLinkItem({
    item,
    isTeacher,
    onFileView,
    onDelete,
    onRefresh,
}: SharedLinkItemProps) {
    const { state } = useUser();
    const isAdmin = state.user?.role === 'superadmin' || state.user?.role === 'schooladmin';
    const isSuperAdmin = state.user?.role === 'superadmin';
    const [syncStatus, setSyncStatus] = useState<{
        isOutdated: boolean;
        isLoading: boolean;
    }>({ isOutdated: false, isLoading: false });

    const isLink = item.type === 'link' && item.url;
    const isDirectory = item.type === 'directory';
    const isLessonLink = item.type === 'lesson_link';
    const isDocument = item.type === 'document';
    const isTest = item.type === 'test';
    const isVideo = item.type === 'video';
    const isImage = item.type === 'image';
    const isRecording = item.type === 'recording';
    const isText = item.type === 'text';

    // Load sync status for teachers and admins
    useEffect(() => {
        if ((isTeacher || isAdmin) && item.template_resource && !item.is_unlinked_from_template) {
            setSyncStatus({ isOutdated: false, isLoading: true });
            resourceService
                .getSyncStatus(Number(item.id))
                .then((status) => {
                    setSyncStatus({ isOutdated: status.is_outdated, isLoading: false });
                })
                .catch((error) => {
                    console.error('Error loading sync status:', error);
                    setSyncStatus({ isOutdated: false, isLoading: false });
                });
        }
    }, [isTeacher, isAdmin, item.id, item.template_resource, item.is_unlinked_from_template]);

    function handleDelete() {
        if (onDelete) {
            onDelete(item.id, 'resource');
        } else {
            // Fallback to old behavior if no onDelete prop
            modalController.open('confirmation', {
                title: 'Delete Confirmation',
                message: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmVariant: 'danger',
                onConfirm: async () => {
                    try {
                        await axiosInstance.delete(`/resources/${item.id}/`);
                        console.log('Resource deleted successfully');
                    } catch (error) {
                        console.error('Error deleting resource:', error);
                    }
                },
            });
        }
    }

    async function handleUnlink() {
        if (!item.template_resource || item.is_unlinked_from_template) {
            return;
        }

        modalController.open('confirmation', {
            title: 'Отвязать от шаблона',
            message: `Вы уверены, что хотите отвязать "${item.title}" от шаблона? После отвязки этот ресурс больше не будет автоматически синхронизироваться с шаблоном.`,
            confirmText: 'Отвязать',
            cancelText: 'Отмена',
            confirmVariant: 'warning',
            onConfirm: async () => {
                try {
                    await resourceService.unlinkFromTemplate(Number(item.id));
                    setSyncStatus({ isOutdated: false, isLoading: false });
                    onRefresh?.();
                } catch (error: any) {
                    console.error('Error unlinking resource:', error);
                    const errorMessage = error?.formattedMessage || 'Не удалось отвязать ресурс от шаблона';
                    alert(errorMessage);
                }
            },
        });
    }

    async function handleRelink() {
        if (!item.template_resource || !item.is_unlinked_from_template) {
            return;
        }

        modalController.open('confirmation', {
            title: 'Привязать к шаблону',
            message: `Вы уверены, что хотите привязать "${item.title}" к шаблону? После привязки этот ресурс будет автоматически синхронизироваться с шаблоном при следующей синхронизации.`,
            confirmText: 'Привязать',
            cancelText: 'Отмена',
            confirmVariant: 'default',
            onConfirm: async () => {
                try {
                    await resourceService.relinkToTemplate(Number(item.id));
                    // Reload sync status after relinking
                    if (isTeacher || isAdmin) {
                        const status = await resourceService.getSyncStatus(Number(item.id));
                        setSyncStatus({ isOutdated: status.is_outdated, isLoading: false });
                    }
                    onRefresh?.();
                } catch (error: any) {
                    console.error('Error relinking resource:', error);
                    const errorMessage = error?.formattedMessage || 'Не удалось привязать ресурс к шаблону';
                    alert(errorMessage);
                }
            },
        });
    }

    async function handleSync() {
        if (!item.template_resource || item.is_unlinked_from_template) {
            return;
        }

        modalController.open('confirmation', {
            title: 'Синхронизировать с шаблоном',
            message: `Вы уверены, что хотите синхронизировать "${item.title}" с шаблоном? Все изменения в шаблоне будут применены к этому ресурсу.`,
            confirmText: 'Синхронизировать',
            cancelText: 'Отмена',
            confirmVariant: 'default',
            onConfirm: async () => {
                try {
                    await resourceService.syncFromTemplate(Number(item.id));
                    // Reload sync status after syncing
                    if (isTeacher || isAdmin) {
                        const status = await resourceService.getSyncStatus(Number(item.id));
                        setSyncStatus({ isOutdated: status.is_outdated, isLoading: false });
                    }
                    onRefresh?.();
                    alert('Ресурс успешно синхронизирован с шаблоном');
                } catch (error: any) {
                    console.error('Error syncing resource:', error);
                    const errorMessage = error?.response?.data?.error || error?.formattedMessage || 'Не удалось синхронизировать ресурс';
                    alert(errorMessage);
                }
            },
        });
    }

    function handleClick() {
        console.log(item, 'item inside handleClick');
        if (item.file && onFileView) {
            onFileView(
                {
                    file: item.file,
                    title: item.title,
                    type: item.type || 'file',
                    id: item.id,
                },
                item.title
            );
        } else if ((isLink || isLessonLink) && item.url) {
            window.open(item.url, '_blank');
        } else if (isDirectory && onFileView) {
            onFileView(
                {
                    file: item.file || '',
                    title: item.title,
                    type: item.type || 'directory',
                    id: item.id,
                },
                item.title
            );
        }
    }

    return (
        <div className="p-2 w-full max-w-full">
            <div className="flex items-start gap-4 py-3 w-full max-w-full">
                <div className="flex-shrink-0 flex items-center justify-center">
                    {getIconByType(item.type as IconType, 32, item.file)}
                </div>

                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                    {!isText && (
                        <button
                            onClick={handleClick}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full text-left hover:shadow-sm block max-w-full"
                        >
                            <span className="block break-all">
                                {item.title}
                            </span>
                        </button>
                    )}
                    {isText && (
                        <span className="block break-all">{item.title}</span>
                    )}
                    {isImage && item.file && (
                        <button
                            type="button"
                            onClick={handleClick}
                            className="mt-2 block max-w-fit rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            title="Открыть изображение"
                        >
                            {/* Use plain <img> instead of next/image because presigned URLs
                            come from an external domain and can include long querystrings. */}
                            <img
                                src={item.file}
                                alt={item.title}
                                className="max-h-48 w-auto rounded-md border border-gray-100 object-contain bg-gray-50 transition-opacity hover:opacity-90"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    // Hide broken thumbnails; preview still works via title click.
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </button>
                    )}
                    {(isTeacher || isAdmin) && (
                        <div className="mt-1">
                            <TemplateLinkIndicator
                                isLinked={!!item.template_resource}
                                isUnlinked={!!item.is_unlinked_from_template}
                                isOutdated={syncStatus.isOutdated}
                                onUnlink={handleUnlink}
                                onRelink={handleRelink}
                                showButton={!!item.template_resource}
                                type="resource"
                                itemId={Number(item.id)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isSuperAdmin && item.template_resource && !item.is_unlinked_from_template && (
                        <button
                            onClick={handleSync}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            title="Синхронизировать с шаблоном"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Синхронизировать</span>
                        </button>
                    )}
                    {isTeacher && (
                        <DeleteButton
                            onDelete={handleDelete}
                            itemName={item.title}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
