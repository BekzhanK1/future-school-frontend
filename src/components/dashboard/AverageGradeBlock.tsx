'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUserState } from '@/contexts/UserContext';
import axiosInstance from '@/lib/axios';
import { BookOpen, ChevronDown } from 'lucide-react';

interface SummaryItem {
    subject_group_id: number;
    course_name: string;
    classroom_name: string;
}

interface GradeCategory {
    id: number;
    name: string;
    is_formative: boolean;
    weight: number;
}

interface ManualGrade {
    id: number;
    value: number;
    max_value: number;
    category: number | null;
    weight_in_category: number;
    title?: string;
}

function gradeColor(score: number) {
    if (score >= 8.5) return { bar: '#22c55e', text: '#15803d', bg: '#f0fdf4' };
    if (score >= 6.5) return { bar: '#f59e0b', text: '#b45309', bg: '#fffbeb' };
    return { bar: '#ef4444', text: '#b91c1c', bg: '#fef2f2' };
}

export default function AverageGradeBlock() {
    const { user } = useUserState();
    const isStudent = user?.role === 'student';

    const [subjects, setSubjects] = useState<SummaryItem[]>([]);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Per-subject formative data
    const [formativeScore, setFormativeScore] = useState<number | null | 'loading'>('loading');
    const [gradeCount, setGradeCount] = useState(0);

    // Load subject list
    useEffect(() => {
        if (!isStudent) return;
        let cancelled = false;
        axiosInstance
            .get<{ results: SummaryItem[] }>('/manual-grades/student-summary/')
            .then(res => {
                if (!cancelled) {
                    const items = res.data.results || [];
                    setSubjects(items);
                    if (items.length > 0) setSelectedId(items[0].subject_group_id);
                }
            })
            .catch(() => { if (!cancelled) setSubjects([]); })
            .finally(() => { if (!cancelled) setSubjectsLoading(false); });
        return () => { cancelled = true; };
    }, [isStudent]);

    // Load formative grades whenever subject changes
    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;
        setFormativeScore('loading');
        setGradeCount(0);

        Promise.all([
            axiosInstance.get<{ results: GradeCategory[] }>(
                `/grade-categories/?subject_group=${selectedId}&is_formative=true`
            ),
            axiosInstance.get<{ results: ManualGrade[] } | ManualGrade[]>(
                `/manual-grades/?subject_group=${selectedId}`
            ),
        ])
            .then(([catRes, gradesRes]) => {
                if (cancelled) return;

                const categories: GradeCategory[] = catRes.data.results || (catRes.data as any) || [];
                const formativeCatIds = new Set(categories.map(c => c.id));

                const rawGrades = (gradesRes.data as any).results ?? gradesRes.data ?? [];
                const grades: ManualGrade[] = Array.isArray(rawGrades) ? rawGrades : [];

                const formativeGrades = grades.filter(
                    g => g.category !== null && formativeCatIds.has(g.category as number) && g.max_value > 0
                );

                if (formativeGrades.length === 0) {
                    setFormativeScore(null);
                    setGradeCount(0);
                    return;
                }

                // Weighted average: each grade contributes (value/max_value * 10) with its weight_in_category
                const totalWeight = formativeGrades.reduce((s, g) => s + (g.weight_in_category || 1), 0);
                const weightedSum = formativeGrades.reduce(
                    (s, g) => s + (g.value / g.max_value) * 10 * (g.weight_in_category || 1),
                    0
                );
                const avg = totalWeight > 0 ? weightedSum / totalWeight : null;

                setFormativeScore(avg != null ? Math.round(avg * 10) / 10 : null);
                setGradeCount(formativeGrades.length);
            })
            .catch(() => {
                if (!cancelled) { setFormativeScore(null); setGradeCount(0); }
            });

        return () => { cancelled = true; };
    }, [selectedId]);

    if (!isStudent) return null;

    const selectedSubject = useMemo(
        () => subjects.find(s => s.subject_group_id === selectedId) ?? subjects[0] ?? null,
        [subjects, selectedId]
    );

    const score = formativeScore === 'loading' ? null : formativeScore;
    const isLoading = subjectsLoading || formativeScore === 'loading';
    const pct = score != null ? (score / 10) * 100 : 0;
    const colors = score != null ? gradeColor(score) : null;

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700">ФО по предмету</span>
            </div>

            {/* Subject dropdown */}
            <div className="px-4 pb-3">
                {subjectsLoading ? (
                    <div className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                ) : subjects.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1">Нет предметов</p>
                ) : (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(v => !v)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium hover:bg-gray-100 transition-colors"
                        >
                            <span className="truncate">{selectedSubject?.course_name ?? '—'}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                                {subjects.map(s => (
                                    <button
                                        key={s.subject_group_id}
                                        type="button"
                                        onClick={() => { setSelectedId(s.subject_group_id); setDropdownOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                            selectedId === s.subject_group_id
                                                ? 'bg-violet-50 text-violet-700 font-semibold'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s.course_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Score */}
            <div className="px-4 pb-4">
                {isLoading ? (
                    <div className="space-y-2">
                        <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                ) : score == null ? (
                    <div className="py-2">
                        <p className="text-2xl font-bold text-gray-300">—</p>
                        <p className="text-xs text-gray-400 mt-1">Нет оценок ФО</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-end gap-1 mb-3">
                            <span
                                className="text-4xl font-bold tabular-nums leading-none"
                                style={{ color: colors!.text }}
                            >
                                {score.toFixed(1)}
                            </span>
                            <span className="text-lg font-medium text-gray-400 mb-0.5">/10</span>
                        </div>

                        <div className="space-y-1">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%`, background: colors!.bar }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>0</span>
                                <span className="font-medium" style={{ color: colors!.text }}>
                                    {pct.toFixed(0)}%
                                </span>
                                <span>10</span>
                            </div>
                        </div>

                        <p className="mt-2 text-[11px] text-gray-400">
                            {gradeCount} {gradeCount === 1 ? 'оценка' : gradeCount < 5 ? 'оценки' : 'оценок'} ФО
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
