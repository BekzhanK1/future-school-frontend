'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Award, CheckCircle, Clock, Eye, Filter } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';

interface Test {
    id: number;
    title: string;
    description: string;
    total_points: number;
    course_section_title: string;
    course_name: string;
    start_date: string | null;
    end_date: string | null;
    has_attempted: boolean;
    last_submitted_attempt_id: number | null;
    my_latest_attempt_can_view_results: boolean;
}

export default function ParentChildTestsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const childId = params.childId as string;
    const subjectGroupId = searchParams.get('subject_group');
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [childName, setChildName] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'attempted' | 'not_attempted'>('all');

    useEffect(() => {
        if (!childId) return;
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [childResponse, testsResponse, attemptsResponse] = await Promise.all([
                    axiosInstance.get(`/users/${childId}/`),
                    axiosInstance.get('/tests/', { params: { student: childId } }),
                    axiosInstance.get('/attempts/', { params: { student: childId } }),
                ]);
                if (cancelled) return;

                setChildName(`${childResponse.data.first_name} ${childResponse.data.last_name}`);
                let allTests = testsResponse.data.results || testsResponse.data;
                const sgId = subjectGroupId ? parseInt(subjectGroupId, 10) : null;
                if (sgId != null) {
                    allTests = allTests.filter((t: { subject_group?: number }) => t.subject_group === sgId);
                }

                const attempts = attemptsResponse.data.results || attemptsResponse.data;
                const attemptsMap = new Map(attempts.map((a: any) => [a.test, a]));

                const testsWithStatus = allTests.map((test: any) => {
                    const attempt = attemptsMap.get(test.id);
                    return {
                        ...test,
                        has_attempted: !!attempt,
                        last_submitted_attempt_id: attempt?.id || null,
                        my_latest_attempt_can_view_results: attempt?.can_view_results ?? false,
                    };
                });

                setTests(testsWithStatus);
            } catch (error) {
                if (!cancelled) console.error('Failed to fetch tests:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => {
            cancelled = true;
        };
    }, [childId, subjectGroupId]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Не указано';
        return formatSchoolDateTime(dateString, 'ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const testDisplayTitle = (test: Test) => {
        const t = (test.title || '').trim();
        if (t && t.toLowerCase() !== 'test') return test.title;
        return `${test.course_name} — ${test.course_section_title}`;
    };

    const filteredTests = tests.filter((t) => {
        if (statusFilter === 'attempted') return t.has_attempted;
        if (statusFilter === 'not_attempted') return !t.has_attempted;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <button
                onClick={() => router.push('/parent/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Назад</span>
            </button>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Тесты {childName}
                    {subjectGroupId ? ' (по предмету)' : ''}
                </h1>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-gray-600">
                        {subjectGroupId
                            ? 'Тесты только по выбранному предмету'
                            : 'Просмотр тестов и результатов'}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                            <option value="all">Все</option>
                            <option value="attempted">Пройденные</option>
                            <option value="not_attempted">Не пройденные</option>
                        </select>
                    </div>
                </div>
            </div>

            {filteredTests.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Нет тестов по выбранному фильтру</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTests.map((test) => (
                        <div
                            key={test.id}
                            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {testDisplayTitle(test)}
                                    </h3>
                                    {test.description && (
                                        <p className="text-gray-600 mb-4">
                                            {test.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span>Макс. балл: {test.total_points}</span>
                                        </div>
                                        {test.start_date && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>Начало: {formatDate(test.start_date)}</span>
                                            </div>
                                        )}
                                        {test.end_date && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>Окончание: {formatDate(test.end_date)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {test.has_attempted && test.last_submitted_attempt_id && (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <span className="text-green-600 font-medium">
                                                    Тест пройден
                                                </span>
                                            </div>
                                        )}
                                        {test.has_attempted && test.my_latest_attempt_can_view_results && test.last_submitted_attempt_id && (
                                            <button
                                                onClick={() => router.push(`/tests/${test.id}/student-results?attempt=${test.last_submitted_attempt_id}`)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>Посмотреть результаты</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500">
                                        {test.course_name} • {test.course_section_title}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
