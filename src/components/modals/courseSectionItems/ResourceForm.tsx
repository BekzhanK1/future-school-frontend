'use client';

import { useState, useEffect } from 'react';
import {
    FileText, Image as ImageIcon, Video, Link2, AlignLeft,
    Folder, MonitorPlay, Upload, X, Eye, EyeOff,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { useLocale } from '@/contexts/LocaleContext';
import { ResourceFormData, FormCallbacks, ResourceType } from './types';
import { fileTypes, getFileAcceptTypes } from './utils';

interface ResourceFormProps extends FormCallbacks {
    courseSectionId: number;
    resourceId?: number | null;
    initialData?: {
        title?: string;
        url?: string;
        type?: ResourceType;
        is_visible_to_students?: boolean;
    };
    weekDay?: number;
}

const TYPE_OPTIONS: { type: ResourceType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'file',         label: 'Файл',    icon: <FileText className="w-5 h-5" />,    color: 'text-blue-600 bg-blue-50' },
    { type: 'image',        label: 'Фото',    icon: <ImageIcon className="w-5 h-5" />,   color: 'text-emerald-600 bg-emerald-50' },
    { type: 'video',        label: 'Видео',   icon: <Video className="w-5 h-5" />,       color: 'text-rose-600 bg-rose-50' },
    { type: 'link',         label: 'Ссылка',  icon: <Link2 className="w-5 h-5" />,       color: 'text-violet-600 bg-violet-50' },
    { type: 'text',         label: 'Текст',   icon: <AlignLeft className="w-5 h-5" />,   color: 'text-amber-600 bg-amber-50' },
    { type: 'directory',    label: 'Папка',   icon: <Folder className="w-5 h-5" />,      color: 'text-orange-600 bg-orange-50' },
    { type: 'lesson_link',  label: 'Занятие', icon: <MonitorPlay className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50' },
];

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-gray-400 transition';

export default function ResourceForm({
    courseSectionId,
    resourceId,
    initialData,
    weekDay,
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
        week_day: typeof weekDay === 'number' ? weekDay : undefined,
    });

    useEffect(() => {
        if (isEditMode && resourceId) loadResourceData();
    }, [resourceId, isEditMode]);

    const loadResourceData = async () => {
        if (!resourceId) return;
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/resources/${resourceId}/`);
            const resource = response.data;
            setResourceForm({
                title: resource.title || '',
                url: resource.url || '',
                type: resource.type || 'file',
                is_visible_to_students: resource.is_visible_to_students ?? true,
                file: null,
                files: [],
            });
        } catch {
            onError('Не удалось загрузить данные ресурса');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isEditMode) {
            setResourceForm(prev => ({ ...prev, file: null, files: [] }));
        }
    }, [resourceForm.type, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let response;

            if (isEditMode && resourceId) {
                if (fileTypes.includes(resourceForm.type) && resourceForm.file) {
                    const formData = new FormData();
                    formData.append('type', resourceForm.type);
                    formData.append('title', resourceForm.title);
                    formData.append('is_visible_to_students', String(resourceForm.is_visible_to_students));
                    formData.append('file', resourceForm.file);
                    if (resourceForm.url) formData.append('url', resourceForm.url);
                    response = await axiosInstance.patch(`/resources/${resourceId}/`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } else {
                    const resourceData: Record<string, unknown> = {
                        type: resourceForm.type,
                        title: resourceForm.title,
                        is_visible_to_students: resourceForm.is_visible_to_students,
                    };
                    if (resourceForm.url) resourceData.url = resourceForm.url;
                    response = await axiosInstance.patch(`/resources/${resourceId}/`, resourceData);
                }
            } else {
                if (resourceForm.type === 'directory' && resourceForm.files && resourceForm.files.length > 0) {
                    const formData = new FormData();
                    formData.append('course_section', courseSectionId.toString());
                    formData.append('title', resourceForm.title);
                    formData.append('is_visible_to_students', String(resourceForm.is_visible_to_students));
                    resourceForm.files.forEach(file => formData.append('files', file));
                    response = await axiosInstance.post('/resources/create-directory-with-files/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } else if (fileTypes.includes(resourceForm.type) && resourceForm.file) {
                    const formData = new FormData();
                    formData.append('course_section', courseSectionId.toString());
                    formData.append('type', resourceForm.type);
                    formData.append('title', resourceForm.title);
                    formData.append('is_visible_to_students', String(resourceForm.is_visible_to_students));
                    if (typeof weekDay === 'number') formData.append('week_day', String(weekDay));
                    formData.append('file', resourceForm.file);
                    response = await axiosInstance.post('/resources/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } else {
                    const resourceData: Record<string, unknown> = {
                        course_section: courseSectionId,
                        type: resourceForm.type,
                        title: resourceForm.title,
                        url: resourceForm.url,
                        is_visible_to_students: resourceForm.is_visible_to_students,
                    };
                    if (typeof weekDay === 'number') resourceData.week_day = weekDay;
                    response = await axiosInstance.post('/resources/', resourceData);
                }
            }

            void response;
            onSuccess(
                isEditMode
                    ? t('courseSectionModal.resourceUpdatedSuccess') || 'Ресурс успешно обновлён'
                    : t('courseSectionModal.resourceCreatedSuccess')
            );
            setTimeout(() => onComplete(), 1500);
        } catch (error: unknown) {
            const errorMessage =
                error instanceof AxiosError
                    ? error.response?.data?.message || error.response?.data?.error || error.message
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
            <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
        );
    }

    const selectedType = TYPE_OPTIONS.find(o => o.type === resourceForm.type);

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type picker */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t('courseSectionModal.resourceType')}
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                    {TYPE_OPTIONS.map(opt => (
                        <button
                            key={opt.type}
                            type="button"
                            onClick={() => setResourceForm(prev => ({ ...prev, type: opt.type }))}
                            className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all ${
                                resourceForm.type === opt.type
                                    ? 'border-violet-400 bg-violet-50 shadow-sm'
                                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                            <span className={`p-1.5 rounded-lg ${opt.color}`}>{opt.icon}</span>
                            <span className={`text-[10px] font-semibold leading-tight ${
                                resourceForm.type === opt.type ? 'text-violet-700' : 'text-gray-500'
                            }`}>{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('courseSectionModal.titleRequired')}
                </label>
                <input
                    type="text"
                    value={resourceForm.title}
                    onChange={e => setResourceForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className={inputCls}
                    placeholder={t('courseSectionModal.enterResourceTitle')}
                />
            </div>

            {/* File upload */}
            {fileTypes.includes(resourceForm.type) && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {resourceForm.type === 'directory'
                            ? `Файлы (${resourceForm.files?.length || 0}/10, необязательно)`
                            : 'Файл *'}
                    </label>

                    {resourceForm.type === 'directory' ? (
                        <div className="space-y-2">
                            <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all group">
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept={getFileAcceptTypes(resourceForm.type)}
                                    onChange={e => {
                                        const selected = Array.from(e.target.files || []);
                                        const current = resourceForm.files || [];
                                        if (current.length + selected.length > 10) {
                                            onError(t('courseSectionModal.maxFilesAllowed'));
                                            return;
                                        }
                                        setResourceForm(prev => ({ ...prev, files: [...(prev.files || []), ...selected] }));
                                    }}
                                />
                                <Upload className="w-7 h-7 text-gray-300 group-hover:text-violet-400 mb-1.5 transition-colors" />
                                <p className="text-sm text-gray-400 group-hover:text-violet-500 transition-colors">
                                    {t('courseSectionModal.clickToAttach')}
                                </p>
                                <p className="text-xs text-gray-300 mt-0.5">{t('courseSectionModal.maxFiles')}</p>
                            </label>

                            {resourceForm.files && resourceForm.files.length > 0 && (
                                <div className="space-y-1 max-h-36 overflow-y-auto rounded-xl border border-gray-100 p-2">
                                    {resourceForm.files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                                <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                                <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setResourceForm(prev => ({
                                                    ...prev,
                                                    files: prev.files?.filter((_, idx) => idx !== i) || [],
                                                }))}
                                                className="p-0.5 rounded hover:bg-red-50 transition-colors ml-2 shrink-0"
                                            >
                                                <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all group">
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept={getFileAcceptTypes(resourceForm.type)}
                                onChange={e => setResourceForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                            />
                            {resourceForm.file ? (
                                <>
                                    <div className={`p-2 rounded-lg mb-1.5 ${selectedType?.color}`}>{selectedType?.icon}</div>
                                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs px-4">{resourceForm.file.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{(resourceForm.file.size / 1024).toFixed(1)} KB · нажмите для замены</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-7 h-7 text-gray-300 group-hover:text-violet-400 mb-1.5 transition-colors" />
                                    <p className="text-sm text-gray-400 group-hover:text-violet-500 transition-colors">
                                        {t('courseSectionModal.clickToUpload')}
                                    </p>
                                    <p className="text-xs text-gray-300 mt-0.5">{t('courseSectionModal.dragAndDrop')}</p>
                                </>
                            )}
                        </label>
                    )}
                </div>
            )}

            {/* URL input */}
            {(resourceForm.type === 'link' || resourceForm.type === 'lesson_link') && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('courseSectionModal.urlLabel')}
                    </label>
                    <div className="relative">
                        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="url"
                            value={resourceForm.url}
                            onChange={e => setResourceForm(prev => ({ ...prev, url: e.target.value }))}
                            required
                            className={`${inputCls} pl-10`}
                            placeholder={
                                resourceForm.type === 'lesson_link'
                                    ? t('courseSectionModal.urlPlaceholder')
                                    : t('courseSectionModal.meetPlaceholder')
                            }
                        />
                    </div>
                </div>
            )}

            {/* Visibility toggle */}
            <button
                type="button"
                onClick={() => setResourceForm(prev => ({ ...prev, is_visible_to_students: !prev.is_visible_to_students }))}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all ${
                    resourceForm.is_visible_to_students
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-gray-200 bg-gray-50'
                }`}
            >
                {resourceForm.is_visible_to_students
                    ? <Eye className="w-4 h-4 text-violet-600 shrink-0" />
                    : <EyeOff className="w-4 h-4 text-gray-400 shrink-0" />}
                <div className="text-left">
                    <p className={`text-sm font-semibold ${resourceForm.is_visible_to_students ? 'text-violet-700' : 'text-gray-500'}`}>
                        {resourceForm.is_visible_to_students ? 'Видимо для учеников' : 'Скрыто от учеников'}
                    </p>
                    <p className="text-xs text-gray-400">
                        {resourceForm.is_visible_to_students ? 'Ученики увидят этот материал' : 'Материал будет скрыт'}
                    </p>
                </div>
                <div className={`ml-auto w-10 h-5.5 rounded-full relative transition-colors ${
                    resourceForm.is_visible_to_students ? 'bg-violet-500' : 'bg-gray-300'
                }`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        resourceForm.is_visible_to_students ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                </div>
            </button>

            {/* Submit */}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    {isLoading
                        ? 'Загрузка...'
                        : isSubmitting
                            ? 'Сохранение...'
                            : isEditMode
                                ? 'Сохранить'
                                : t('courseSectionModal.createResource')}
                </button>
            </div>
        </form>
    );
}
