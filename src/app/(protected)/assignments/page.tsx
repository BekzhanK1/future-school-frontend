'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FileText,
    Clock,
    BarChart3,
    CheckCircle,
    AlertCircle,
    Calendar,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';

interface Assignment {
    id: number;
    course_section: number;
    teacher: number;
    title: string;
    description: string;
    due_at: string;
    max_grade: number;
    file: string;
    course_section_title: string;
    subject_group_course_name: string;
    subject_group_course_code: string;
    teacher_username: string;
    submission_count: string;
    attachments: {
        id: number;
        type: string;
        title: string;
        content: string;
        file_url: string;
        file: string;
        position: number;
        assignment: number;
    }[];
    is_available: string;
    is_deadline_passed: boolean;
    is_submitted: boolean;
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAssignments();
    }, []);

    console.log(assignments, 'assignments');

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/assignments/');
            setAssignments(response.data);
        } catch (error) {
            console.error('Error fetching assignments:', error);
            const errorMessage =
                error instanceof AxiosError
                    ? error.response?.data?.message || error.message
                    : 'Failed to fetch assignments';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return formatSchoolDate(dateString, 'ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const getStatusColor = (assignment: Assignment) => {
        if (assignment.is_submitted === true) {
            return 'bg-green-100 text-green-800 border-green-200';
        } else if (assignment.is_deadline_passed === true) {
            return 'bg-red-100 text-red-800 border-red-200';
        } else {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getStatusText = (assignment: Assignment) => {
        if (assignment.is_submitted === true) {
            return 'Сдано';
        } else if (assignment.is_deadline_passed === true) {
            return 'Просрочено';
        } else {
            return 'В ожидании';
        }
    };

    const getStatusIcon = (assignment: Assignment) => {
        if (assignment.is_submitted === true) {
            return <CheckCircle className="w-4 h-4" />;
        } else if (assignment.is_deadline_passed === true) {
            return <AlertCircle className="w-4 h-4" />;
        } else {
            return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-lg shadow-sm p-6"
                            >
                                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Ошибка загрузки
                        </h2>
                        <p className="text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Задания
                    </h1>
                    <p className="text-gray-600">
                        Управляйте своими заданиями и отслеживайте прогресс
                    </p>
                </div>

                {assignments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Нет заданий
                        </h3>
                        <p className="text-gray-500">
                            У вас пока нет назначенных заданий
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {assignments.map(assignment => (
                            <Link
                                key={assignment.id}
                                href={`/assignments/${assignment.id}`}
                                className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {assignment.title}
                                            </h3>
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(assignment)}`}
                                            >
                                                {getStatusIcon(assignment)}
                                                <span className="ml-1">
                                                    {getStatusText(assignment)}
                                                </span>
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            {assignment.course_section_title} •{' '}
                                            {assignment.teacher_username}
                                        </p>
                                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    Срок:{' '}
                                                    {formatDate(
                                                        assignment.due_at
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <BarChart3 className="w-4 h-4" />
                                                <span>
                                                    Макс. оценка:{' '}
                                                    {assignment.max_grade}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
