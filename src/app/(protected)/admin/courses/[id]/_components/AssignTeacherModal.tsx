'use client';

import { useState, useEffect } from 'react';
import { courseService } from '@/services/courseService';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import type { SubjectGroup } from '@/types/course';

interface Teacher {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface AssignTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjectGroup: SubjectGroup | null;
    onSuccess: () => void;
}

export default function AssignTeacherModal({
    isOpen,
    onClose,
    subjectGroup,
    onSuccess,
}: AssignTeacherModalProps) {
    const [teacher, setTeacher] = useState<string>('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTeachers();
            if (subjectGroup) {
                setTeacher(subjectGroup.teacher?.toString() || '');
            } else {
                setTeacher('');
            }
            setErrors({});
        }
    }, [isOpen, subjectGroup]);

    const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const response = await axiosInstance.get('/users/', {
                params: { role: 'teacher' },
            });
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!subjectGroup) return;

        try {
            setSubmitting(true);
            await courseService.updateSubjectGroup(subjectGroup.id, {
                teacher: teacher ? parseInt(teacher) : null,
            });
            
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error assigning teacher:', error);
            if (error.response?.data) {
                const apiErrors = error.response.data;
                if (apiErrors.non_field_errors) {
                    setErrors({
                        general: Array.isArray(apiErrors.non_field_errors)
                            ? apiErrors.non_field_errors[0]
                            : apiErrors.non_field_errors,
                    });
                } else {
                    setErrors({
                        general: 'Не удалось назначить учителя',
                    });
                }
            } else {
                setErrors({
                    general: 'Не удалось назначить учителя',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Назначить учителя"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{errors.general}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Класс
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                        {subjectGroup?.classroom_display || `Класс #${subjectGroup?.classroom}`}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Учитель
                    </label>
                    {loadingTeachers ? (
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        </div>
                    ) : (
                        <select
                            value={teacher}
                            onChange={(e) => setTeacher(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Не назначен</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name} ({t.username})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={submitting}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
