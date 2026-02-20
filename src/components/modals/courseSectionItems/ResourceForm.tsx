'use client';

import { useState, useEffect } from 'react';
import { FileText, Link, Upload } from 'lucide-react';
import Image from 'next/image';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { useLocale } from '@/contexts/LocaleContext';
import { ResourceFormData, FormCallbacks, ResourceType } from './types';
import { fileTypes, getFileAcceptTypes } from './utils';

interface ResourceFormProps extends FormCallbacks {
    courseSectionId: number;
    resourceId?: number | null; // For edit mode
    initialData?: {
        title?: string;
        url?: string;
        type?: ResourceType;
        is_visible_to_students?: boolean;
    };
}

export default function ResourceForm({
    courseSectionId,
    resourceId,
    initialData,
    onSuccess,
    onError,
    onComplete,
}: ResourceFormProps) {
    const { t } = useLocale();
    const isEditMode = !!resourceId;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resourceForm, setResourceForm] = useState<ResourceFormData>({
        title: initialData?.title || '',
        url: initialData?.url || '',
        type: initialData?.type || 'file',
        is_visible_to_students: initialData?.is_visible_to_students ?? true,
        file: null,
        files: [],
    });

    // Load resource data if editing
    useEffect(() => {
        if (isEditMode && resourceId) {
            loadResourceData();
        }
    }, [resourceId, isEditMode]);

    const loadResourceData = async () => {
        if (!resourceId) return;
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(
                `/resources/${resourceId}/`
            );
            const resource = response.data;
            setResourceForm({
                title: resource.title || '',
                url: resource.url || '',
                type: resource.type || 'file',
                is_visible_to_students: resource.is_visible_to_students ?? true,
                file: null,
                files: [],
            });
        } catch (error) {
            console.error('Error loading resource:', error);
            onError('Не удалось загрузить данные ресурса');
        } finally {
            setIsLoading(false);
        }
    };

    // Reset file/files when type changes (only for create mode)
    useEffect(() => {
        if (!isEditMode) {
            setResourceForm(prev => ({
                ...prev,
                file: null,
                files: [],
            }));
        }
    }, [resourceForm.type, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let response;

            if (isEditMode && resourceId) {
                // Edit mode
                if (
                    fileTypes.includes(resourceForm.type) &&
                    resourceForm.file
                ) {
                    // Update with new file
                    const formData = new FormData();
                    formData.append('type', resourceForm.type);
                    formData.append('title', resourceForm.title);
                    formData.append(
                        'is_visible_to_students',
                        String(resourceForm.is_visible_to_students)
                    );
                    formData.append('file', resourceForm.file);
                    if (resourceForm.url) {
                        formData.append('url', resourceForm.url);
                    }

                    response = await axiosInstance.patch(
                        `/resources/${resourceId}/`,
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );
                } else {
                    // Update without file change
                    const resourceData: any = {
                        type: resourceForm.type,
                        title: resourceForm.title,
                        is_visible_to_students:
                            resourceForm.is_visible_to_students,
                    };
                    if (resourceForm.url) {
                        resourceData.url = resourceForm.url;
                    }

                    response = await axiosInstance.patch(
                        `/resources/${resourceId}/`,
                        resourceData
                    );
                }
            } else {
                // Create mode
                if (
                    resourceForm.type === 'directory' &&
                    resourceForm.files &&
                    resourceForm.files.length > 0
                ) {
                    // Handle directory with multiple files
                    const formData = new FormData();
                    formData.append(
                        'course_section',
                        courseSectionId.toString()
                    );
                    formData.append('title', resourceForm.title);
                    formData.append(
                        'is_visible_to_students',
                        String(resourceForm.is_visible_to_students)
                    );

                    resourceForm.files.forEach(file => {
                        formData.append('files', file);
                    });

                    response = await axiosInstance.post(
                        '/resources/create-directory-with-files/',
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );
                } else if (
                    fileTypes.includes(resourceForm.type) &&
                    resourceForm.file
                ) {
                    // Handle single file upload
                    const formData = new FormData();
                    formData.append(
                        'course_section',
                        courseSectionId.toString()
                    );
                    formData.append('type', resourceForm.type);
                    formData.append('title', resourceForm.title);
                    formData.append(
                        'is_visible_to_students',
                        String(resourceForm.is_visible_to_students)
                    );
                    formData.append('file', resourceForm.file);

                    response = await axiosInstance.post(
                        '/resources/',
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );
                } else {
                    // Handle regular resource (link, text, directory without files)
                    const resourceData = {
                        course_section: courseSectionId,
                        type: resourceForm.type,
                        title: resourceForm.title,
                        url: resourceForm.url,
                        is_visible_to_students:
                            resourceForm.is_visible_to_students,
                    };

                    response = await axiosInstance.post(
                        '/resources/',
                        resourceData
                    );
                }
            }

            console.log(
                `Resource ${isEditMode ? 'updated' : 'created'} successfully:`,
                response.data
            );
            onSuccess(
                isEditMode
                    ? t('courseSectionModal.resourceUpdatedSuccess') ||
                          'Ресурс успешно обновлен'
                    : t('courseSectionModal.resourceCreatedSuccess')
            );
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error: unknown) {
            console.error(
                `Error ${isEditMode ? 'updating' : 'creating'} resource:`,
                error
            );
            const errorMessage =
                error instanceof AxiosError
                    ? error.response?.data?.message ||
                      error.response?.data?.error ||
                      error.message
                    : isEditMode
                      ? 'Не удалось обновить ресурс'
                      : t('courseSectionModal.failedToCreateResource');
            onError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resource Type Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courseSectionModal.resourceType')}
                </label>
                <ul className="w-full flex items-center gap-2">
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'file',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'file'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Image
                                src="/document-icons/document.png"
                                alt="File"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'image',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'image'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Image
                                src="/document-icons/image.png"
                                alt="Image"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'video',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'video'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Image
                                src="/document-icons/video.png"
                                alt="Video"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'link',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'link'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Image
                                src="/document-icons/link.png"
                                alt="Link"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'text',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'text'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Image
                                src="/document-icons/info.png"
                                alt="Text"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'directory',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'directory'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50 focus:ring-offset-2'
                            }`}
                        >
                            <Image
                                src="/document-icons/folder.png"
                                alt="Directory"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    type: 'lesson_link',
                                }))
                            }
                            className={`rounded-md transition-all duration-200 ${
                                resourceForm.type === 'lesson_link'
                                    ? 'ring-2 ring-blue-500 bg-blue-50 focus:ring-offset-2'
                                    : 'hover:bg-gray-50 focus:ring-offset-2'
                            }`}
                        >
                            <Image
                                src="/document-icons/lesson-link.png"
                                alt="Lesson Link"
                                width={40}
                                height={40}
                            />
                        </button>
                    </li>
                </ul>
            </div>

            {/* Title Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courseSectionModal.titleRequired')}
                </label>
                <input
                    type="text"
                    value={resourceForm.title}
                    onChange={e =>
                        setResourceForm(prev => ({
                            ...prev,
                            title: e.target.value,
                        }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('courseSectionModal.enterResourceTitle')}
                />
            </div>

            {/* File Upload or URL Input */}
            {fileTypes.includes(resourceForm.type) && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {resourceForm.type === 'directory'
                            ? `${t('courseSectionModal.attachFilesOptional')} - ${resourceForm.files?.length || 0}/10`
                            : `${t('forms.file')} *`}
                    </label>

                    {/* Multiple file input for directories */}
                    {resourceForm.type === 'directory' ? (
                        <div>
                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    onChange={e => {
                                        const selectedFiles = Array.from(
                                            e.target.files || []
                                        );
                                        const currentFiles =
                                            resourceForm.files || [];
                                        const totalFiles =
                                            currentFiles.length +
                                            selectedFiles.length;

                                        if (totalFiles > 10) {
                                            onError(
                                                t(
                                                    'courseSectionModal.maxFilesAllowed'
                                                )
                                            );
                                            return;
                                        }

                                        setResourceForm(prev => ({
                                            ...prev,
                                            files: [
                                                ...(prev.files || []),
                                                ...selectedFiles,
                                            ],
                                        }));
                                    }}
                                    className="absolute inset-0 w-full h-32 opacity-0 cursor-pointer"
                                    accept={getFileAcceptTypes(
                                        resourceForm.type
                                    )}
                                />
                                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            {t(
                                                'courseSectionModal.clickToAttach'
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {t(
                                                'courseSectionModal.dragAndDrop'
                                            )}{' '}
                                            ({t('courseSectionModal.maxFiles')})
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Display selected files */}
                            {resourceForm.files &&
                                resourceForm.files.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-sm font-medium text-gray-700">
                                            {t(
                                                'courseSectionModal.selectedFiles'
                                            )}
                                        </p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {resourceForm.files.map(
                                                (file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <FileText className="w-4 h-4 text-blue-500" />
                                                            <span className="text-sm text-gray-700 truncate max-w-48">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {(
                                                                    file.size /
                                                                    1024
                                                                ).toFixed(
                                                                    1
                                                                )}{' '}
                                                                KB
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setResourceForm(
                                                                    prev => ({
                                                                        ...prev,
                                                                        files:
                                                                            prev.files?.filter(
                                                                                (
                                                                                    _,
                                                                                    i
                                                                                ) =>
                                                                                    i !==
                                                                                    index
                                                                            ) ||
                                                                            [],
                                                                    })
                                                                );
                                                            }}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            {t(
                                                                'courseSectionModal.remove'
                                                            )}
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>
                    ) : (
                        /* Single file input for other types */
                        <div className="relative">
                            <input
                                type="file"
                                onChange={e =>
                                    setResourceForm(prev => ({
                                        ...prev,
                                        file: e.target.files?.[0] || null,
                                    }))
                                }
                                className="absolute inset-0 w-32 h-32 opacity-0 cursor-pointer"
                                accept={getFileAcceptTypes(resourceForm.type)}
                            />
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                                {resourceForm.file ? (
                                    <div className="text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <FileText className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium truncate max-w-48">
                                            {resourceForm.file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {(
                                                resourceForm.file.size / 1024
                                            ).toFixed(1)}{' '}
                                            KB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            {t(
                                                'courseSectionModal.clickToUpload'
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {t(
                                                'courseSectionModal.dragAndDrop'
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {resourceForm.file && (
                        <p className="mt-1 text-sm text-gray-600">
                            {t('courseSectionModal.selected')}:{' '}
                            {resourceForm.file.name}
                        </p>
                    )}
                </div>
            )}
            {(resourceForm.type === 'link' ||
                resourceForm.type === 'lesson_link') && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('courseSectionModal.urlLabel')}
                    </label>
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="url"
                            value={resourceForm.url}
                            onChange={e =>
                                setResourceForm(prev => ({
                                    ...prev,
                                    url: e.target.value,
                                }))
                            }
                            required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={
                                resourceForm.type === 'lesson_link'
                                    ? t('courseSectionModal.urlPlaceholder')
                                    : t('courseSectionModal.meetPlaceholder')
                            }
                        />
                    </div>
                </div>
            )}

            {/* Visibility Toggle */}
            <div className="flex items-center mt-4">
                <input
                    type="checkbox"
                    id="is_visible_to_students"
                    checked={resourceForm.is_visible_to_students !== false}
                    onChange={e =>
                        setResourceForm(prev => ({
                            ...prev,
                            is_visible_to_students: e.target.checked,
                        }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                    htmlFor="is_visible_to_students"
                    className="ml-2 block text-sm text-gray-900"
                >
                    Видимо для учеников
                </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading
                        ? 'Загрузка...'
                        : isSubmitting
                          ? isEditMode
                              ? 'Сохранение...'
                              : t('courseSectionModal.creating')
                          : isEditMode
                            ? 'Сохранить'
                            : t('courseSectionModal.createResource')}
                </button>
            </div>
        </form>
    );
}
