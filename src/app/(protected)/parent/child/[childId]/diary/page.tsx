'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, BookOpen, Award } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';

interface Grade {
    id: number;
    grade_value: number;
    max_grade: number;
    submission?: {
        assignment?: {
            id: number;
            title?: string;
            course_section_title?: string;
            course_name?: string;
        } | null;
    } | null;
    graded_at: string;
}

export default function ParentChildDiaryPage() {
    const params = useParams();
    const router = useRouter();
    const childId = params.childId as string;
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [childName, setChildName] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Get child info
                const childResponse = await axiosInstance.get(`/users/${childId}/`);
                setChildName(`${childResponse.data.first_name} ${childResponse.data.last_name}`);

                // Get grades for the child
                const submissionsResponse = await axiosInstance.get('/submissions/', {
                    params: { student: childId }
                });
                const submissions = submissionsResponse.data.results || submissionsResponse.data;
                
                // Get grades for all submissions
                const allGrades: Grade[] = [];
                for (const submission of submissions) {
                    try {
                        const gradesResponse = await axiosInstance.get('/grades/', {
                            params: { submission: submission.id }
                        });
                        const submissionGrades = gradesResponse.data.results || gradesResponse.data;
                        allGrades.push(...submissionGrades);
                    } catch (error) {
                        console.error(`Failed to fetch grades for submission ${submission.id}:`, error);
                    }
                }
                
                setGrades(allGrades);
            } catch (error) {
                console.error('Failed to fetch diary data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (childId) {
            fetchData();
        }
    }, [childId]);

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
                    Дневник {childName}
                </h1>
                <p className="text-gray-600">
                    Просмотр оценок и успеваемости
                </p>
            </div>

            {grades.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Нет оценок</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {grades.map((grade) => (
                        <div
                            key={grade.id}
                            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {grade.submission?.assignment?.title ?? 'Оценка'}
                                    </h3>
                                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span>
                                                {grade.submission?.assignment?.course_name ?? '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>
                                                {grade.submission?.assignment?.course_section_title ?? '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {formatSchoolDate(grade.graded_at, 'ru-RU')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-blue-600">
                                            {grade.grade_value}/{grade.max_grade}
                                        </span>
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
