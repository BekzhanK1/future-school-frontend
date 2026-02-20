'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';

interface SummaryItem {
    subject_group_id: number;
    course_name: string;
    classroom_name: string;
    average: number | null;
    manual_count: number;
    assignment_grades_count: number;
    test_attempts_count: number;
}

export default function AverageGradeBlock() {
    const { user } = useUserState();
    const { t } = useLocale();
    const isStudent = user?.role === 'student';
    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isStudent) return;
        let cancelled = false;
        axiosInstance
            .get<{ results: SummaryItem[] }>('/manual-grades/student-summary/')
            .then((res) => {
                if (!cancelled) setSummary(res.data.results || []);
            })
            .catch(() => {
                if (!cancelled) setSummary([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isStudent]);

    // Same formula as parent overview: overall = average of subject averages
    const rawAverageGrade = useMemo(() => {
        if (summary.length === 0) return undefined;
        const vals = summary.map((g) => g.average).filter((v): v is number => v !== null);
        if (vals.length === 0) return undefined;
        return (vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [summary]);

    const [scale, setScale] = useState<'percent' | '5' | '10'>('percent');

    const averageGradeDisplay = useMemo(() => {
        if (!isStudent) return null;
        if (loading) return '…';
        if (rawAverageGrade == null) return null;
        const percent = Math.round(rawAverageGrade);
        if (scale === 'percent') return `${percent}%`;
        if (scale === '5') return `${((rawAverageGrade / 100) * 5).toFixed(1)}/5`;
        return `${((rawAverageGrade / 100) * 10).toFixed(1)}/10`;
    }, [isStudent, rawAverageGrade, scale, loading]);

    if (!isStudent || averageGradeDisplay == null) return null;

    return (
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    {t('profile.averageGrade')}
                </h2>
                <div className="flex items-center gap-3 text-gray-700">
                    {scale === '10' && rawAverageGrade != null ? (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-2xl sm:text-3xl font-bold tabular-nums">{averageGradeDisplay}</span>
                            <div className="flex gap-1 mt-1">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-2 w-3 sm:w-4 rounded-sm transition-colors ${
                                            i < Math.round((rawAverageGrade / 100) * 10)
                                                ? 'bg-purple-600'
                                                : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <span className="text-2xl sm:text-3xl font-bold tabular-nums">{averageGradeDisplay}</span>
                    )}
                    <select
                        value={scale}
                        onChange={e => setScale(e.target.value as 'percent' | '5' | '10')}
                        className="border border-gray-300 rounded px-2 py-1.5 text-base bg-white ml-2 self-start sm:self-auto"
                    >
                        <option value="percent">%</option>
                        <option value="5">/5</option>
                        <option value="10">/10</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
