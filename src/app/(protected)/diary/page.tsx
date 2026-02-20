'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';
import {
    BookOpen,
    Calendar,
    Award,
    ChevronDown,
    User,
    FileQuestion,
    ClipboardList,
    Plus,
    ChevronRight,
    X,
    BarChart3,
} from 'lucide-react';
import AddManualGradeModal from './_components/AddManualGradeModal';

interface Classroom {
    id: number;
    grade: number;
    letter: string;
    school?: number;
}

interface SubjectGroup {
    id: number;
    course_name: string;
    course_code: string;
    classroom_display?: string;
    teacher_fullname?: string;
}

interface Student {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
}

interface GradeBookEntry {
    source_type: 'assignment' | 'test' | 'manual';
    source_id: number;
    student_id: number;
    student_username: string;
    title: string;
    value: number;
    max_value: number;
    graded_at: string | null;
    feedback: string | null;
    graded_by_username?: string | null;
    grade_type?: string;
}

interface StudentStats {
    student: Student;
    count: number;
    avgPercent: number | null;
    lastDate: string | null;
}

interface GradeWeightItem {
    id: number;
    subject_group: number;
    source_type: string;
    source_type_display?: string;
    weight: number;
}

interface SubjectSummary {
    subject_group_id: number;
    course_name: string;
    classroom_display?: string;
    avgPercent: number | null;
    count: number;
}

export default function DiaryPage() {
    const { user } = useUserState();
    const { t } = useLocale();
    const SOURCE_TYPES: { value: GradeBookEntry['source_type']; label: string }[] = useMemo(
        () => [
            { value: 'assignment', label: t('diary.sourceAssignment') },
            { value: 'test', label: t('diary.sourceTest') },
            { value: 'manual', label: t('diary.sourceManual') },
        ],
        [t]
    );
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [entries, setEntries] = useState<GradeBookEntry[]>([]);

    const [selectedClassroomId, setSelectedClassroomId] = useState<number | ''>('');
    const [selectedSubjectGroupId, setSelectedSubjectGroupId] = useState<number | ''>('');
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

    const [loadingClassrooms, setLoadingClassrooms] = useState(false);
    const [loadingSubjectGroups, setLoadingSubjectGroups] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingGradeBook, setLoadingGradeBook] = useState(false);
    const [showAddGradeModal, setShowAddGradeModal] = useState(false);
    const [gradeWeights, setGradeWeights] = useState<GradeWeightItem[]>([]);
    const [loadingWeights, setLoadingWeights] = useState(false);
    const [weightsDraft, setWeightsDraft] = useState<Record<string, number>>({ assignment: 34, test: 33, manual: 33 });
    const [savingWeights, setSavingWeights] = useState(false);
    const [weightsError, setWeightsError] = useState<string | null>(null);
    const [studentEntriesBySubject, setStudentEntriesBySubject] = useState<Record<number, GradeBookEntry[]>>({});
    const [loadingStudentSummaries, setLoadingStudentSummaries] = useState(false);

    const isAdmin = user?.role === 'superadmin' || user?.role === 'schooladmin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const canAddGrade = isAdmin || isTeacher;
    const showClassView = (isAdmin || isTeacher) && selectedSubjectGroupId && students.length > 0;

    // Fetch classrooms (admin only)
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        setLoadingClassrooms(true);
        axiosInstance
            .get('/classrooms/')
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                if (!cancelled) setClassrooms(list);
            })
            .catch(() => {
                if (!cancelled) setClassrooms([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingClassrooms(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    // Fetch subject groups
    const fetchSubjectGroups = useCallback(() => {
        if (!user?.id) return;
        setLoadingSubjectGroups(true);
        const params: Record<string, string | number> = {};
        if (isAdmin && selectedClassroomId) {
            params.classroom = selectedClassroomId as number;
        } else if (isTeacher) {
            params.teacher = user.id;
        } else if (isStudent) {
            const studentData = (user as { student_data?: { classrooms?: { id: number }[] } })?.student_data;
            const classroomId = studentData?.classrooms?.[0]?.id;
            if (classroomId) params.classroom = classroomId;
        }
        axiosInstance
            .get('/subject-groups/', { params: Object.keys(params).length ? params : undefined })
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                setSubjectGroups(list);
                // Для ученика не выбираем предмет по умолчанию — показываем сводную таблицу
                if (!isStudent && !selectedSubjectGroupId && list.length > 0) {
                    setSelectedSubjectGroupId(list[0].id);
                }
            })
            .catch(() => setSubjectGroups([]))
            .finally(() => setLoadingSubjectGroups(false));
    }, [user?.id, isAdmin, isTeacher, isStudent, selectedClassroomId, selectedSubjectGroupId]);

    useEffect(() => {
        if (isStudent) {
            fetchSubjectGroups();
        } else if (isTeacher) {
            fetchSubjectGroups();
        } else if (isAdmin && selectedClassroomId) {
            fetchSubjectGroups();
        } else {
            setSubjectGroups([]);
            setSelectedSubjectGroupId('');
        }
    }, [isAdmin, isTeacher, isStudent, selectedClassroomId, fetchSubjectGroups]);

    useEffect(() => {
        if (isAdmin && selectedClassroomId) {
            setSelectedSubjectGroupId('');
        }
    }, [isAdmin, selectedClassroomId]);

    // Fetch students for selected subject group (admin / teacher)
    useEffect(() => {
        if ((!isAdmin && !isTeacher) || !selectedSubjectGroupId) {
            setStudents([]);
            return;
        }
        setLoadingStudents(true);
        axiosInstance
            .get(`/subject-groups/${selectedSubjectGroupId}/members/`)
            .then((res) => {
                setStudents(res.data?.students ?? []);
            })
            .catch(() => setStudents([]))
            .finally(() => setLoadingStudents(false));
    }, [isAdmin, isTeacher, selectedSubjectGroupId]);

    // Fetch grade-book: admin/teacher = always ALL entries (for table + stats); student = only own
    useEffect(() => {
        if (!selectedSubjectGroupId) {
            setEntries([]);
            return;
        }
        setLoadingGradeBook(true);
        const params: Record<string, string | number> = { subject_group: selectedSubjectGroupId as number };
        if (isStudent) {
            params.student_id = user!.id;
        }
        // For admin/teacher we never pass student_id so we get all class entries for table and stats
        axiosInstance
            .get('/manual-grades/grade-book/', { params })
            .then((res) => {
                setEntries(res.data?.results ?? []);
            })
            .catch(() => setEntries([]))
            .finally(() => setLoadingGradeBook(false));
    }, [selectedSubjectGroupId, isAdmin, isTeacher, isStudent, user?.id]);

    // For student: fetch grade-book for all subjects to build summary table (средний по каждому предмету + общий)
    useEffect(() => {
        if (!isStudent || !user?.id || subjectGroups.length === 0) {
            setStudentEntriesBySubject({});
            return;
        }
        setLoadingStudentSummaries(true);
        const promises = subjectGroups.map((sg) =>
            axiosInstance
                .get('/manual-grades/grade-book/', { params: { subject_group: sg.id, student_id: user.id } })
                .then((res) => ({ sgId: sg.id, entries: (res.data?.results ?? []) as GradeBookEntry[] }))
                .catch(() => ({ sgId: 0, entries: [] as GradeBookEntry[] }))
        );
        Promise.all(promises).then((results) => {
            const bySubject: Record<number, GradeBookEntry[]> = {};
            results.forEach(({ sgId, entries }) => {
                if (sgId) bySubject[sgId] = entries;
            });
            setStudentEntriesBySubject(bySubject);
        }).finally(() => setLoadingStudentSummaries(false));
    }, [isStudent, user?.id, subjectGroups]);

    // Fetch grade weights for selected subject (all roles; student sees weights for their avg)
    useEffect(() => {
        if (!selectedSubjectGroupId) {
            setGradeWeights([]);
            setWeightsDraft({ assignment: 34, test: 33, manual: 33 });
            return;
        }
        setLoadingWeights(true);
        axiosInstance
            .get('/grade-weights/', { params: { subject_group: selectedSubjectGroupId } })
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                setGradeWeights(list);
                const draft: Record<string, number> = { assignment: 34, test: 33, manual: 33 };
                list.forEach((w: GradeWeightItem) => {
                    draft[w.source_type] = w.weight;
                });
                setWeightsDraft(draft);
            })
            .catch(() => {
                setGradeWeights([]);
                setWeightsDraft({ assignment: 34, test: 33, manual: 33 });
            })
            .finally(() => setLoadingWeights(false));
    }, [selectedSubjectGroupId]);

    const selectedSubject = subjectGroups.find((s) => s.id === selectedSubjectGroupId);

    const getWeight = (sourceType: string): number => weightsDraft[sourceType] ?? 1;

    // For student: сводка по каждому предмету и общий средний
    const studentSubjectSummaryList = useMemo((): SubjectSummary[] => {
        if (!isStudent || subjectGroups.length === 0) return [];
        return subjectGroups
            .map((sg) => {
                const list = studentEntriesBySubject[sg.id] ?? [];
                const count = list.length;
                const sumPct = list.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0);
                const avgPercent = count > 0 ? Math.round(sumPct / count) : null;
                return {
                    subject_group_id: sg.id,
                    course_name: sg.course_name,
                    classroom_display: sg.classroom_display,
                    avgPercent,
                    count,
                };
            })
            .sort((a, b) => a.course_name.localeCompare(b.course_name));
    }, [isStudent, subjectGroups, studentEntriesBySubject]);

    const studentOverallAvg = useMemo(() => {
        if (!isStudent) return null;
        const allEntries = Object.values(studentEntriesBySubject).flat();
        const count = allEntries.length;
        if (count === 0) return null;
        const sumPct = allEntries.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0);
        return Math.round(sumPct / count);
    }, [isStudent, studentEntriesBySubject]);
    const selectedStudent = students.find((s) => s.id === selectedStudentId);

    // Class stats: weighted average of each grade's percentage (weight by source_type).
    const classStats = useMemo(() => {
        if (!showClassView || entries.length === 0) {
            return { totalGrades: 0, avgPercent: null, studentsWithGrades: 0 };
        }
        let sumWeighted = 0;
        let sumWeights = 0;
        entries.forEach((e) => {
            const pct = e.max_value > 0 ? (e.value / e.max_value) * 100 : 0;
            const w = getWeight(e.source_type);
            sumWeighted += pct * w;
            sumWeights += w;
        });
        const uniqueStudents = new Set(entries.map((e) => e.student_id)).size;
        return {
            totalGrades: entries.length,
            avgPercent: sumWeights > 0 ? Math.round(sumWeighted / sumWeights) : null,
            studentsWithGrades: uniqueStudents,
        };
    }, [showClassView, entries, weightsDraft]);

    // Unique "works" (grade sources) from entries for table columns: assignment/test/manual by (source_type, source_id)
    interface WorkColumn {
        key: string;
        source_type: GradeBookEntry['source_type'];
        source_id: number;
        title: string;
        graded_at: string | null;
    }
    const gradeBookWorks = useMemo((): WorkColumn[] => {
        if (!showClassView || entries.length === 0) return [];
        const seen = new Map<string, { title: string; graded_at: string | null }>();
        entries.forEach((e) => {
            const key = `${e.source_type}-${e.source_id}`;
            const existing = seen.get(key);
            if (!existing || (e.graded_at && (!existing.graded_at || e.graded_at > existing.graded_at))) {
                seen.set(key, { title: e.title, graded_at: e.graded_at || null });
            }
        });
        return Array.from(seen.entries())
            .map(([key, { title, graded_at }]) => {
                const [source_type, idStr] = key.split('-');
                return {
                    key,
                    source_type: source_type as GradeBookEntry['source_type'],
                    source_id: parseInt(idStr, 10),
                    title,
                    graded_at,
                };
            })
            .sort((a, b) => {
                const typeOrder = { assignment: 0, test: 1, manual: 2 };
                const t = typeOrder[a.source_type] - typeOrder[b.source_type];
                if (t !== 0) return t;
                return (a.graded_at || '').localeCompare(b.graded_at || '');
            });
    }, [showClassView, entries]);

    // For each (student, work) take latest entry by graded_at
    const gradeBookCell = useMemo(() => {
        const map = new Map<string, GradeBookEntry>();
        entries
            .filter((e) => e.student_id != null)
            .sort((a, b) => new Date(b.graded_at || 0).getTime() - new Date(a.graded_at || 0).getTime())
            .forEach((e) => {
                const k = `${e.student_id}-${e.source_type}-${e.source_id}`;
                if (!map.has(k)) map.set(k, e);
            });
        return (studentId: number, work: WorkColumn) =>
            map.get(`${studentId}-${work.source_type}-${work.source_id}`) ?? null;
    }, [entries]);

    // Per-student stats for table (and for grid row average)
    const studentStatsList = useMemo((): StudentStats[] => {
        if (!showClassView) return [];
        return students
            .map((student) => {
                const studentEntries = entries.filter((e) => e.student_id === student.id);
                const count = studentEntries.length;
                let sumWeighted = 0;
                let sumWeights = 0;
                studentEntries.forEach((e) => {
                    const pct = e.max_value > 0 ? (e.value / e.max_value) * 100 : 0;
                    const w = getWeight(e.source_type);
                    sumWeighted += pct * w;
                    sumWeights += w;
                });
                const lastEntry = studentEntries.sort(
                    (a, b) => new Date(b.graded_at || 0).getTime() - new Date(a.graded_at || 0).getTime()
                )[0];
                return {
                    student,
                    count,
                    avgPercent: sumWeights > 0 ? Math.round(sumWeighted / sumWeights) : null,
                    lastDate: lastEntry?.graded_at || null,
                };
            })
            .sort((a, b) => {
                const nameA = `${a.student.last_name} ${a.student.first_name}`;
                const nameB = `${b.student.last_name} ${b.student.first_name}`;
                return nameA.localeCompare(nameB);
            });
    }, [showClassView, students, entries, weightsDraft]);

    // Entries for selected student (for class view) or all entries (student view / when one student filter)
    const displayedEntries = useMemo(() => {
        if (isStudent) return entries;
        if (selectedStudentId) return entries.filter((e) => e.student_id === selectedStudentId);
        return entries;
    }, [entries, selectedStudentId, isStudent]);

    const sourceTypeLabel = (source: GradeBookEntry['source_type']) => {
        if (source === 'assignment') return t('diary.sourceAssignment');
        if (source === 'test') return t('diary.sourceTest');
        return t('diary.sourceManual');
    };

    const sourceTypeIcon = (source: GradeBookEntry['source_type']) => {
        if (source === 'assignment') return <ClipboardList className="w-4 h-4 text-blue-600" />;
        if (source === 'test') return <FileQuestion className="w-4 h-4 text-green-600" />;
        return <Award className="w-4 h-4 text-amber-600" />;
    };

    const handleManualGradeAdded = () => {
        setShowAddGradeModal(false);
        if (!selectedSubjectGroupId) return;
        setLoadingGradeBook(true);
        const params: Record<string, string | number> = { subject_group: selectedSubjectGroupId as number };
        if (isStudent) params.student_id = user!.id;
        axiosInstance
            .get('/manual-grades/grade-book/', { params })
            .then((res) => setEntries(res.data?.results ?? []))
            .finally(() => setLoadingGradeBook(false));
    };

    const weightsSum = (weightsDraft.assignment ?? 0) + (weightsDraft.test ?? 0) + (weightsDraft.manual ?? 0);

    const handleDistributeWeights = () => {
        setWeightsDraft({ assignment: 34, test: 33, manual: 33 });
        setWeightsError(null);
    };

    const handleSaveWeights = async () => {
        if (!selectedSubjectGroupId || !(isAdmin || isTeacher)) return;
        if (weightsSum !== 100) {
            setWeightsError(t('diary.weightsSumError'));
            return;
        }
        setWeightsError(null);
        setSavingWeights(true);
        try {
            const res = await axiosInstance.post('/grade-weights/set-weights/', {
                subject_group: selectedSubjectGroupId,
                assignment: Math.max(0, Math.min(100, Math.round(weightsDraft.assignment ?? 0))),
                test: Math.max(0, Math.min(100, Math.round(weightsDraft.test ?? 0))),
                manual: Math.max(0, Math.min(100, Math.round(weightsDraft.manual ?? 0))),
            });
            const list = Array.isArray(res.data) ? res.data : [];
            setGradeWeights(list);
            const draft: Record<string, number> = { assignment: 34, test: 33, manual: 33 };
            list.forEach((w: GradeWeightItem) => {
                draft[w.source_type] = w.weight;
            });
            setWeightsDraft(draft);
        } catch (err: unknown) {
            const res = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
            const msg = res?.assignment?.[0] ?? res?.weight?.[0] ?? (err as { formattedMessage?: string })?.formattedMessage ?? t('diary.saveWeightsError');
            setWeightsError(msg);
        } finally {
            setSavingWeights(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('diary.title')}</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    {isStudent && t('diary.subtitleStudent')}
                    {isTeacher && t('diary.subtitleTeacher')}
                    {isAdmin && t('diary.subtitleAdmin')}
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-wrap sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                    {isAdmin && (
                        <div className="min-w-[160px] sm:min-w-[180px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('diary.class')}</label>
                            <div className="relative">
                                <select
                                    value={selectedClassroomId}
                                    onChange={(e) => setSelectedClassroomId(e.target.value ? Number(e.target.value) : '')}
                                    disabled={loadingClassrooms}
                                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">{t('diary.selectClass')}</option>
                                    {classrooms.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.grade}{c.letter}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    <div className="min-w-[180px] sm:min-w-[220px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('diary.subject')}</label>
                        <div className="relative">
                            <select
                                value={selectedSubjectGroupId}
                                onChange={(e) => {
                                    setSelectedSubjectGroupId(e.target.value ? Number(e.target.value) : '');
                                    setSelectedStudentId(null);
                                }}
                                disabled={loadingSubjectGroups || (isAdmin && !selectedClassroomId)}
                                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">{isStudent ? t('diary.allSubjects') : t('diary.selectSubject')}</option>
                                {subjectGroups.map((sg) => (
                                    <option key={sg.id} value={sg.id}>
                                        {sg.course_name} {sg.classroom_display ? `(${sg.classroom_display})` : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {canAddGrade && selectedSubjectGroupId && (
                        <div className="sm:ml-auto">
                            <button
                                type="button"
                                onClick={() => setShowAddGradeModal(true)}
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                {t('diary.addGrade')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Веса оценок (только для учителя/админа) */}
            {canAddGrade && selectedSubjectGroupId && (
                <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('diary.gradeWeightsTitle')}</h3>
                    <p className="text-xs text-gray-500 mb-3">
                        {t('diary.weightsHint')}
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[260px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">{t('diary.gradeType')}</th>
                                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 w-24">{t('diary.weightPercent')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SOURCE_TYPES.map(({ value, label }) => (
                                    <tr key={value} className="border-b border-gray-100">
                                        <td className="py-2 px-3 text-sm text-gray-900">{label}</td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={weightsDraft[value] ?? 0}
                                                onChange={(e) => {
                                                    const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                                                    setWeightsDraft((prev) => ({ ...prev, [value]: v }));
                                                    setWeightsError(null);
                                                }}
                                                className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <span className={`text-sm ${weightsSum === 100 ? 'text-gray-600' : 'text-amber-600'}`}>
                            {t('diary.weightsSum')} {weightsSum}%
                        </span>
                        <button
                            type="button"
                            onClick={handleDistributeWeights}
                            className="text-sm text-gray-600 hover:text-gray-900 underline"
                        >
                            {t('diary.distributeEvenly')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveWeights}
                            disabled={savingWeights || weightsSum !== 100}
                            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                        >
                            {savingWeights ? t('actions.saving') : t('profile.save')}
                        </button>
                    </div>
                    {weightsError && <p className="mt-2 text-sm text-red-600">{weightsError}</p>}
                </div>
            )}

            {!selectedSubjectGroupId ? (
                isStudent ? (
                    /* Ученик: сводная таблица по предметам + общий средний */
                    loadingStudentSummaries ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                        </div>
                    ) : subjectGroups.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>{t('diary.loadSubjectsError')}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4 sm:mb-6">
                            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                                <span className="font-medium text-gray-800">{t('diary.avgBySubject')}</span>
                                {studentOverallAvg != null && (
                                    <span className="text-sm font-semibold text-gray-900">{t('diary.overallAvg')}: {studentOverallAvg}%</span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[360px] text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">№</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('diary.subject')}</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{t('diary.avgGrade')}</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{t('diary.countGrades')}</th>
                                            <th className="w-10 py-3 px-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentSubjectSummaryList.map((row, idx) => (
                                            <tr
                                                key={row.subject_group_id}
                                                onClick={() => setSelectedSubjectGroupId(Number(row.subject_group_id))}
                                                className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="py-3 px-4 text-sm text-gray-500">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <span className="font-medium text-gray-900">
                                                        {row.course_name}
                                                        {row.classroom_display ? ` (${row.classroom_display})` : ''}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {row.avgPercent != null ? (
                                                        <span className="font-semibold text-gray-900">{row.avgPercent}%</span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-sm text-gray-600">{row.count}</td>
                                                <td className="py-3 px-2">
                                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                                {t('diary.clickRowToView')}
                            </p>
                        </div>
                    )
                ) : (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 sm:p-12 text-center text-gray-500">
                        <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                        <p>{t('diary.selectClassAndSubject')}</p>
                    </div>
                )
            ) : loadingGradeBook ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center py-12 sm:py-16">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600" />
                </div>
            ) : (
                <>
                    {/* Class view: grade-book table (students × works) */}
                    {showClassView && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4 sm:mb-6">
                            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                                <span className="font-medium text-gray-800">{selectedSubject?.course_name}</span>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <BarChart3 className="w-4 h-4" />
                                        {t('diary.studentsWithGrades')} {classStats.studentsWithGrades} / {students.length}
                                    </span>
                                    <span>{t('diary.totalGrades')}: {classStats.totalGrades}</span>
                                    {classStats.avgPercent != null && (
                                        <span className="font-medium text-gray-900">{t('diary.classAvg')}: {classStats.avgPercent}%</span>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse" style={{ minWidth: gradeBookWorks.length > 0 ? `${200 + gradeBookWorks.length * 72}px` : '460px' }}>
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-2.5 px-2 sm:px-3 text-xs font-semibold text-gray-700 sticky left-0 bg-gray-50/95 z-10 w-8">№</th>
                                            <th className="text-left py-2.5 px-2 sm:px-3 text-xs font-semibold text-gray-700 sticky left-8 bg-gray-50/95 z-10 min-w-[120px] sm:min-w-[140px]">{t('diary.student')}</th>
                                            {gradeBookWorks.map((work) => (
                                                <th
                                                    key={work.key}
                                                    className="text-left py-2.5 px-2 sm:px-3 text-xs font-semibold text-gray-600 max-w-[80px] sm:max-w-[100px] truncate align-bottom"
                                                    title={work.title}
                                                >
                                                    {work.title || work.key}
                                                </th>
                                            ))}
                                            <th className="text-right py-2.5 px-2 sm:px-3 text-xs font-semibold text-gray-700 bg-gray-100 min-w-[56px]">{t('diary.avgGrade')}</th>
                                            <th className="w-9 py-2.5 px-1" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentStatsList.map((row, idx) => {
                                            const isSelected = selectedStudentId === row.student.id;
                                            return (
                                                <tr
                                                    key={row.student.id}
                                                    onClick={() => setSelectedStudentId(isSelected ? null : row.student.id)}
                                                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <td className="py-2 px-2 sm:px-3 text-gray-500 sticky left-0 bg-inherit z-10">{idx + 1}</td>
                                                    <td className="py-2 px-2 sm:px-3 font-medium text-gray-900 sticky left-8 bg-inherit z-10 whitespace-nowrap">
                                                        {row.student.last_name} {row.student.first_name}
                                                    </td>
                                                    {gradeBookWorks.map((work) => {
                                                        const entry = gradeBookCell(row.student.id, work);
                                                        return (
                                                            <td key={work.key} className="py-2 px-2 sm:px-3 text-center text-gray-800">
                                                                {entry ? (
                                                                    <span className="font-medium" title={entry.feedback || undefined}>
                                                                        {entry.value}{entry.max_value > 0 ? `/${entry.max_value}` : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-2 px-2 sm:px-3 text-right bg-gray-50/80 font-semibold text-gray-900">
                                                        {row.avgPercent != null ? `${row.avgPercent}%` : '—'}
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-3 sm:px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                                {t('diary.clickRowToView')}
                            </p>
                        </div>
                    )}

                    {/* Student detail: list of grades (when student selected or student view) */}
                    {(selectedStudentId && (isAdmin || isTeacher)) && (
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentId(null)}
                                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                {t('diary.closeStudentCard')}
                            </button>
                        </div>
                    )}

                    {isStudent && selectedSubjectGroupId && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() => setSelectedSubjectGroupId('')}
                                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                                <ChevronRight className="w-4 h-4 -rotate-180" aria-hidden />
                                {t('diary.backToSubjects')}
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                            <span className="font-medium text-gray-800">
                                {isStudent
                                    ? selectedSubject?.course_name ?? t('diary.myGrades')
                                    : selectedStudentId && selectedStudent
                                        ? `${t('diary.gradesFor')}: ${selectedStudent.last_name} ${selectedStudent.first_name}`
                                        : showClassView
                                            ? t('diary.selectStudentInTable')
                                            : selectedSubject?.course_name}
                            </span>
                            {isStudent && displayedEntries.length > 0 && (() => {
                                let sumWeighted = 0;
                                let sumWeights = 0;
                                displayedEntries.forEach((e) => {
                                    const pct = e.max_value > 0 ? (e.value / e.max_value) * 100 : 0;
                                    const w = getWeight(e.source_type);
                                    sumWeighted += pct * w;
                                    sumWeights += w;
                                });
                                const avg = sumWeights > 0 ? Math.round(sumWeighted / sumWeights) : 0;
                                return (
                                    <span className="text-sm text-gray-600">
                                        {t('diary.totalGradesCount')} {displayedEntries.length}
                                        {` · ${t('diary.avgGrade')}: ${avg}%`}
                                    </span>
                                );
                            })()}
                        </div>

                        {displayedEntries.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>
                                    {selectedStudentId && (isAdmin || isTeacher)
                                        ? t('diary.noGradesForStudent')
                                        : t('diary.noGrades')}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm text-left text-gray-700">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">Дата</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Тип оценки</th>
                                            <th className="px-4 py-3">Название</th>
                                            {(isAdmin || isTeacher) && !selectedStudentId && (
                                                <th className="px-4 py-3">Ученик</th>
                                            )}
                                            <th className="px-4 py-3">Комментарий</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Оценка</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {displayedEntries.map((entry, idx) => (
                                            <tr 
                                                key={`${entry.source_type}-${entry.source_id}-${entry.student_id}-${idx}`}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                                    {entry.graded_at ? new Date(entry.graded_at).toLocaleDateString('ru-RU') : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {sourceTypeIcon(entry.source_type)}
                                                        <span className="text-xs text-gray-500">{sourceTypeLabel(entry.source_type)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {entry.title}
                                                </td>
                                                {(isAdmin || isTeacher) && !selectedStudentId && (
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="text-xs text-gray-600 flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {entry.student_username}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={entry.feedback || ''}>
                                                    {entry.feedback || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                                    {entry.value} / {entry.max_value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {showAddGradeModal && selectedSubjectGroupId && (
                <AddManualGradeModal
                    subjectGroupId={selectedSubjectGroupId as number}
                    subjectName={selectedSubject?.course_name}
                    students={students}
                    defaultStudentId={selectedStudentId ?? undefined}
                    onClose={() => setShowAddGradeModal(false)}
                    onSuccess={handleManualGradeAdded}
                />
            )}
        </div>
    );
}
