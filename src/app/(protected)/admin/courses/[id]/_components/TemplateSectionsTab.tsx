'use client';

import { useState } from 'react';
import { 
    Plus, Edit, Trash2, FileText, Calendar, FolderPlus, 
    File, ClipboardCheck, Image as ImageIcon, Film, 
    Link as LinkIcon, AlignLeft, Folder, ExternalLink 
} from 'lucide-react';
import { courseService } from '@/services/courseService';
import { resourceService } from '@/services/resourceService';
import type { CourseSection, Resource } from '@/types/course';
import CreateTemplateSectionModal from './CreateTemplateSectionModal';
import CourseSectionAddItemModal from '@/components/modals/CourseSectionAddItemModal';
import EditResourceModal from '@/components/modals/EditResourceModal';

interface TemplateSectionsTabProps {
    courseId: number;
    sections: CourseSection[];
    onSectionsChange: () => void;
}

export default function TemplateSectionsTab({
    courseId,
    sections,
    onSectionsChange,
}: TemplateSectionsTabProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [addItemSectionId, setAddItemSectionId] = useState<number | null>(null);
    const [editingResource, setEditingResource] = useState<{ resource: Resource; sectionId: number } | null>(null);
    const [deletingResourceId, setDeletingResourceId] = useState<number | null>(null);

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту секцию? Это может повлиять на синхронизацию.')) {
            return;
        }

        try {
            setDeletingId(id);
            await courseService.deleteCourseSection(id);
            onSectionsChange();
        } catch (error) {
            console.error('Error deleting section:', error);
            alert('Не удалось удалить секцию');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditResource = (resource: Resource, sectionId: number) => {
        setEditingResource({ resource, sectionId });
    };

    const handleDeleteResource = async (resourceId: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот ресурс? Это действие нельзя отменить.')) {
            return;
        }

        try {
            setDeletingResourceId(resourceId);
            await resourceService.deleteResource(resourceId);
            onSectionsChange();
        } catch (error: any) {
            console.error('Error deleting resource:', error);
            const errorMessage = error?.formattedMessage || 'Не удалось удалить ресурс';
            alert(errorMessage);
        } finally {
            setDeletingResourceId(null);
        }
    };

    const formatTemplateParams = (section: CourseSection) => {
        if (section.template_week_index !== null && section.template_week_index !== undefined) {
            return `Неделя ${section.template_week_index + 1}`;
        }
        if (section.template_start_offset_days !== null && section.template_start_offset_days !== undefined) {
            return `Смещение: ${section.template_start_offset_days} дней`;
        }
        return 'Не указано';
    };

    const getResourceIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'image': return <ImageIcon className="w-4 h-4" />;
            case 'video': return <Film className="w-4 h-4" />;
            case 'link': return <LinkIcon className="w-4 h-4" />;
            case 'text': return <AlignLeft className="w-4 h-4" />;
            case 'directory': return <Folder className="w-4 h-4" />;
            case 'lesson_link': return <ExternalLink className="w-4 h-4" />;
            case 'file':
            default:
                return <File className="w-4 h-4" />;
        }
    };

    const getResourceColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'image': return { bg: 'bg-pink-100/50', text: 'text-pink-600', hover: 'hover:bg-pink-50/40' };
            case 'video': return { bg: 'bg-red-100/50', text: 'text-red-600', hover: 'hover:bg-red-50/40' };
            case 'link': return { bg: 'bg-emerald-100/50', text: 'text-emerald-600', hover: 'hover:bg-emerald-50/40' };
            case 'text': return { bg: 'bg-amber-100/50', text: 'text-amber-600', hover: 'hover:bg-amber-50/40' };
            case 'directory': return { bg: 'bg-indigo-100/50', text: 'text-indigo-600', hover: 'hover:bg-indigo-50/40' };
            case 'lesson_link': return { bg: 'bg-teal-100/50', text: 'text-teal-600', hover: 'hover:bg-teal-50/40' };
            case 'file':
            default:
                return { bg: 'bg-blue-100/50', text: 'text-blue-600', hover: 'hover:bg-blue-50/40' };
        }
    };

    const handleOpenResource = (resource: Resource) => {
        if (resource.url) {
            window.open(resource.url, '_blank', 'noopener,noreferrer');
        } else if (resource.file) {
            window.open(resource.file, '_blank', 'noopener,noreferrer');
        } else {
            console.log('Resource has no URL or file to open');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                    Шаблонные секции
                </h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Добавить секцию</span>
                </button>
            </div>

            {sections.length === 0 ? (
                <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Нет шаблонных секций</h4>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Создайте структуру курса с темами, ресурсами и заданиями, чтобы затем легко переносить их в классы.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm transition-colors"
                    >
                        Создать первую секцию
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section) => (
                        <div
                            key={section.id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                        >
                            {/* Card Header */}
                            <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wider">
                                            Позиция {section.position}
                                        </span>
                                        {section.is_general && (
                                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold uppercase tracking-wider">
                                                Общая
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                                        {section.title}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{formatTemplateParams(section)}</span>
                                        </div>
                                        {section.template_duration_days && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span>
                                                    Длительность: {section.template_duration_days} дн.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 ml-4">
                                    <button
                                        onClick={() => setEditingSection(section)}
                                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                                        title="Редактировать секцию"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(section.id)}
                                        disabled={deletingId === section.id}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                                        title="Удалить секцию"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Card Body - Resources and Assignments */}
                            <div className="p-5">
                                {(section.resources && section.resources.length > 0) ||
                                (section.assignments && section.assignments.length > 0) ? (
                                    <div className="flex flex-col border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                        {section.resources && section.resources.map((resource) => {
                                            const colors = getResourceColor(resource.type);
                                            return (
                                            <div
                                                key={`res-${resource.id}`}
                                                onClick={() => handleOpenResource(resource)}
                                                className={`flex items-center justify-between p-3.5 bg-white ${colors.hover} border-b border-gray-100 last:border-b-0 group transition-colors cursor-pointer`}
                                            >
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className={`p-2 ${colors.bg} ${colors.text} rounded-md shrink-0`}>
                                                        {getResourceIcon(resource.type)}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-sm font-semibold text-gray-700 truncate">
                                                            {resource.title || `Ресурс #${resource.id}`}
                                                        </span>
                                                        {resource.url && (
                                                            <span className="text-xs text-blue-500 font-medium truncate">
                                                                {resource.url}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div 
                                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditResource(resource, section.id);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                                        title="Редактировать ресурс"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteResource(resource.id);
                                                        }}
                                                        disabled={deletingResourceId === resource.id}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                                                        title="Удалить ресурс"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )})}
                                        {section.assignments && section.assignments.map((assignment) => (
                                            <div
                                                key={`assign-${assignment.id}`}
                                                className="flex items-center justify-between p-3.5 bg-white hover:bg-green-50/40 border-b border-gray-100 last:border-b-0 group transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-100/50 text-green-600 rounded-md">
                                                        <ClipboardCheck className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        {assignment.title || `Задание #${assignment.id}`}
                                                    </span>
                                                </div>
                                                {/* Edit/Delete for assignments can be added here later */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-sm font-medium text-gray-500">
                                            В этой секции пока нет материалов
                                        </p>
                                    </div>
                                )}
                                
                                <button
                                    onClick={() => setAddItemSectionId(section.id)}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors font-semibold text-sm shadow-sm"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    <span>Добавить материал</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || editingSection) && (
                <CreateTemplateSectionModal
                    isOpen={isCreateModalOpen || !!editingSection}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingSection(null);
                    }}
                    courseId={courseId}
                    section={editingSection}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setEditingSection(null);
                        onSectionsChange();
                    }}
                />
            )}

            {/* Add Item Modal */}
            {addItemSectionId && (
                <CourseSectionAddItemModal
                    isOpen={!!addItemSectionId}
                    onClose={() => setAddItemSectionId(null)}
                    courseSectionId={addItemSectionId}
                    onItemCreated={() => {
                        setAddItemSectionId(null);
                        onSectionsChange(); // Refresh sections to show new items
                    }}
                />
            )}

            {/* Edit Resource Modal */}
            {editingResource && (
                <EditResourceModal
                    isOpen={!!editingResource}
                    onClose={() => setEditingResource(null)}
                    resource={editingResource.resource}
                    courseSectionId={editingResource.sectionId}
                    onSuccess={() => {
                        setEditingResource(null);
                        onSectionsChange();
                    }}
                />
            )}
        </div>
    );
}

