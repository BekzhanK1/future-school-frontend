'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ExternalLink, Plus, User, UserPlus, Edit, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { SubjectGroup } from '@/types/course';
import CreateSubjectGroupModal from './CreateSubjectGroupModal';
import AssignTeacherModal from './AssignTeacherModal';
import { courseService } from '@/services/courseService';

interface SubjectGroupsTabProps {
    courseId: number;
    courseLanguage?: string;
    subjectGroups: SubjectGroup[];
    onSubjectGroupsChange: () => void;
}

interface SyncStatus {
    is_synced: boolean;
    missing_count: number;
    outdated_count: number;
    message: string;
}

export default function SubjectGroupsTab({
    courseId,
    courseLanguage,
    subjectGroups,
    onSubjectGroupsChange,
}: SubjectGroupsTabProps) {
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<SubjectGroup | null>(null);
    const [assigningTeacherGroup, setAssigningTeacherGroup] = useState<SubjectGroup | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [syncStatuses, setSyncStatuses] = useState<Record<number, SyncStatus>>({});
    const [loadingStatuses, setLoadingStatuses] = useState<Record<number, boolean>>({});
    const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

    // Fetch sync statuses for all subject groups
    useEffect(() => {
        const fetchSyncStatuses = async () => {
            const statuses: Record<number, SyncStatus> = {};
            const loading: Record<number, boolean> = {};
            
            for (const group of subjectGroups) {
                loading[group.id] = true;
                try {
                    const status = await courseService.getSubjectGroupSyncStatus(group.id);
                    statuses[group.id] = {
                        is_synced: status.is_synced,
                        missing_count: status.missing_count,
                        outdated_count: status.outdated_count,
                        message: status.message,
                    };
                } catch (error) {
                    console.error(`Error fetching sync status for group ${group.id}:`, error);
                    statuses[group.id] = {
                        is_synced: false,
                        missing_count: 0,
                        outdated_count: 0,
                        message: 'Ошибка загрузки статуса',
                    };
                } finally {
                    loading[group.id] = false;
                }
            }
            
            setSyncStatuses(statuses);
            setLoadingStatuses(loading);
        };

        if (subjectGroups.length > 0) {
            fetchSyncStatuses();
        }
    }, [subjectGroups]);

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту связь? Это удалит все секции и материалы предмета.')) {
            return;
        }

        try {
            setDeletingId(id);
            await courseService.deleteSubjectGroup(id);
            onSubjectGroupsChange();
        } catch (error) {
            console.error('Error deleting subject group:', error);
            alert('Не удалось удалить связь');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSync = async (groupId: number) => {
        if (!confirm('Синхронизировать контент из шаблона курса в этот класс?')) {
            return;
        }

        try {
            setSyncingIds(prev => new Set(prev).add(groupId));
            await courseService.syncSubjectGroup(groupId);
            alert('Синхронизация завершена успешно');
            
            // Refresh sync status
            const status = await courseService.getSubjectGroupSyncStatus(groupId);
            setSyncStatuses(prev => ({
                ...prev,
                [groupId]: {
                    is_synced: status.is_synced,
                    missing_count: status.missing_count,
                    outdated_count: status.outdated_count,
                    message: status.message,
                },
            }));
        } catch (error) {
            console.error('Error syncing subject group:', error);
            alert('Не удалось синхронизировать класс');
        } finally {
            setSyncingIds(prev => {
                const next = new Set(prev);
                next.delete(groupId);
                return next;
            });
        }
    };

    const getSyncStatusIcon = (groupId: number) => {
        const status = syncStatuses[groupId];
        if (!status) {
            return loadingStatuses[groupId] ? (
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            ) : null;
        }
        
        if (status.is_synced) {
            return <CheckCircle2 className="w-4 h-4 text-green-600" />;
        } else if (status.missing_count > 0 || status.outdated_count > 0) {
            return <AlertCircle className="w-4 h-4 text-yellow-600" />;
        } else {
            return <XCircle className="w-4 h-4 text-red-600" />;
        }
    };

    const getSyncStatusText = (groupId: number) => {
        const status = syncStatuses[groupId];
        if (!status) {
            return loadingStatuses[groupId] ? 'Загрузка...' : 'Неизвестно';
        }
        
        if (status.is_synced) {
            return 'Синхронизировано';
        } else if (status.missing_count > 0 || status.outdated_count > 0) {
            return `Требуется синхронизация (${status.missing_count + status.outdated_count})`;
        } else {
            return 'Не синхронизировано';
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    Классы, использующие этот курс
                </h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Добавить класс</span>
                </button>
            </div>

            {subjectGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Нет классов, использующих этот курс</p>
                    <p className="text-sm mt-2">
                        Нажмите "Добавить класс" чтобы связать курс с классом и учителем
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjectGroups.map((group) => (
                        <div
                            key={group.id}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => router.push(`/subjects/${group.id}`)}
                                >
                                    <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {group.classroom_display || `Класс #${group.classroom}`}
                                        </p>
                                        {group.teacher_username && (
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 flex-wrap">
                                                <User className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">
                                                    {group.teacher_fullname || group.teacher_username}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAssigningTeacherGroup(group);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0"
                                                >
                                                    Изменить учителя
                                                </button>
                                            </div>
                                        )}
                                        {!group.teacher_username && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-400">
                                                    Учитель не назначен
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAssigningTeacherGroup(group);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 rounded transition-colors"
                                                >
                                                    Назначить учителя
                                                </button>
                                            </div>
                                        )}
                                        {/* Sync Status */}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            {getSyncStatusIcon(group.id)}
                                            <span className="text-xs text-gray-600">
                                                {getSyncStatusText(group.id)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSync(group.id);
                                        }}
                                        disabled={syncingIds.has(group.id)}
                                        className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                        title="Синхронизировать класс"
                                    >
                                        {syncingIds.has(group.id) ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingGroup(group);
                                        }}
                                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Редактировать"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(group.id);
                                        }}
                                        disabled={deletingId === group.id}
                                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                        title="Удалить"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => router.push(`/subjects/${group.id}`)}
                                        className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                                        title="Открыть предмет"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Subject Group Modal */}
            {(isCreateModalOpen || editingGroup) && (
                <CreateSubjectGroupModal
                    isOpen={isCreateModalOpen || !!editingGroup}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingGroup(null);
                    }}
                    courseId={courseId}
                    courseLanguage={courseLanguage}
                    subjectGroup={editingGroup}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setEditingGroup(null);
                        onSubjectGroupsChange();
                    }}
                />
            )}

            {/* Assign Teacher Modal */}
            {assigningTeacherGroup && (
                <AssignTeacherModal
                    isOpen={!!assigningTeacherGroup}
                    onClose={() => setAssigningTeacherGroup(null)}
                    subjectGroup={assigningTeacherGroup}
                    onSuccess={() => {
                        setAssigningTeacherGroup(null);
                        onSubjectGroupsChange();
                    }}
                />
            )}
        </div>
    );
}

