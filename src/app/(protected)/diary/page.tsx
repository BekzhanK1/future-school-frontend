'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';
import {
    BookOpen, ChevronDown, FileQuestion, ClipboardList, Award, Plus,
    ChevronRight, X, ChevronLeft,
} from 'lucide-react';
import AddManualGradeModal from './_components/AddManualGradeModal';
import GradeCategoriesManager from './_components/GradeCategoriesManager';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';

interface Classroom { id: number; grade: number; letter: string; school?: number; }
interface SubjectGroup { id: number; course_name: string; course_code: string; classroom_display?: string; teacher_fullname?: string; }
interface Student { id: number; username: string; first_name: string; last_name: string; }
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
    category_name?: string | null;
}
interface StudentStats { student: Student; count: number; avgPercent: number | null; lastDate: string | null; }
interface SubjectSummary { subject_group_id: number; course_name: string; classroom_display?: string; avgPercent: number | null; count: number; }

interface WorkColumn {
    key: string;
    source_type: GradeBookEntry['source_type'];
    source_id: number;
    title: string;
    graded_at: string | null;
}

// Excel-style grade coloring
function gradeColor(pct: number): string {
    if (pct >= 85) return '#d4edda'; // green
    if (pct >= 65) return '#fff3cd'; // yellow
    return '#f8d7da';               // red
}
function gradeTextColor(pct: number): string {
    if (pct >= 85) return '#1a6b35';
    if (pct >= 65) return '#856404';
    return '#842029';
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
    assignment: <ClipboardList className="w-3 h-3 text-blue-600" />,
    test:       <FileQuestion className="w-3 h-3 text-green-600" />,
    manual:     <Award className="w-3 h-3 text-amber-600" />,
};
const SOURCE_ABBR: Record<string, string> = { assignment: 'Д', test: 'Т', manual: 'Р' };

export default function DiaryPage() {
    const { user } = useUserState();
    const { t } = useLocale();

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
    const [studentEntriesBySubject, setStudentEntriesBySubject] = useState<Record<number, GradeBookEntry[]>>({});
    const [loadingStudentSummaries, setLoadingStudentSummaries] = useState(false);

    const isAdmin = user?.role === 'superadmin' || user?.role === 'schooladmin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const canAddGrade = isAdmin || isTeacher;
    const showClassView = (isAdmin || isTeacher) && !!selectedSubjectGroupId && students.length > 0;

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        setLoadingClassrooms(true);
        axiosInstance.get('/classrooms/')
            .then(res => { if (!cancelled) setClassrooms(Array.isArray(res.data) ? res.data : res.data?.results ?? []); })
            .catch(() => { if (!cancelled) setClassrooms([]); })
            .finally(() => { if (!cancelled) setLoadingClassrooms(false); });
        return () => { cancelled = true; };
    }, [isAdmin]);

    const fetchSubjectGroups = useCallback(() => {
        if (!user?.id) return;
        setLoadingSubjectGroups(true);
        const params: Record<string, string | number> = {};
        if (isAdmin && selectedClassroomId) params.classroom = selectedClassroomId as number;
        else if (isTeacher) params.teacher = user.id;
        else if (isStudent) {
            const cid = (user as any)?.student_data?.classrooms?.[0]?.id;
            if (cid) params.classroom = cid;
        }
        axiosInstance.get('/subject-groups/', { params: Object.keys(params).length ? params : undefined })
            .then(res => {
                const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                setSubjectGroups(list);
                if (!isStudent && !selectedSubjectGroupId && list.length > 0) setSelectedSubjectGroupId(list[0].id);
            })
            .catch(() => setSubjectGroups([]))
            .finally(() => setLoadingSubjectGroups(false));
    }, [user?.id, isAdmin, isTeacher, isStudent, selectedClassroomId, selectedSubjectGroupId]);

    useEffect(() => {
        if (isStudent || isTeacher || (isAdmin && selectedClassroomId)) fetchSubjectGroups();
        else { setSubjectGroups([]); setSelectedSubjectGroupId(''); }
    }, [isAdmin, isTeacher, isStudent, selectedClassroomId]);

    useEffect(() => {
        if (isAdmin && selectedClassroomId) setSelectedSubjectGroupId('');
    }, [isAdmin, selectedClassroomId]);

    useEffect(() => {
        if ((!isAdmin && !isTeacher) || !selectedSubjectGroupId) { setStudents([]); return; }
        setLoadingStudents(true);
        axiosInstance.get(`/subject-groups/${selectedSubjectGroupId}/members/`)
            .then(res => setStudents(res.data?.students ?? []))
            .catch(() => setStudents([]))
            .finally(() => setLoadingStudents(false));
    }, [isAdmin, isTeacher, selectedSubjectGroupId]);

    useEffect(() => {
        if (!selectedSubjectGroupId) { setEntries([]); return; }
        setLoadingGradeBook(true);
        const params: Record<string, string | number> = { subject_group: selectedSubjectGroupId as number };
        if (isStudent) params.student_id = user!.id;
        axiosInstance.get('/manual-grades/grade-book/', { params })
            .then(res => setEntries(res.data?.results ?? []))
            .catch(() => setEntries([]))
            .finally(() => setLoadingGradeBook(false));
    }, [selectedSubjectGroupId, isAdmin, isTeacher, isStudent, user?.id]);

    useEffect(() => {
        if (!isStudent || !user?.id || subjectGroups.length === 0) { setStudentEntriesBySubject({}); return; }
        setLoadingStudentSummaries(true);
        Promise.all(
            subjectGroups.map(sg =>
                axiosInstance.get('/manual-grades/grade-book/', { params: { subject_group: sg.id, student_id: user.id } })
                    .then(res => ({ sgId: sg.id, entries: (res.data?.results ?? []) as GradeBookEntry[] }))
                    .catch(() => ({ sgId: 0, entries: [] as GradeBookEntry[] }))
            )
        ).then(results => {
            const by: Record<number, GradeBookEntry[]> = {};
            results.forEach(({ sgId, entries }) => { if (sgId) by[sgId] = entries; });
            setStudentEntriesBySubject(by);
        }).finally(() => setLoadingStudentSummaries(false));
    }, [isStudent, user?.id, subjectGroups]);

    const selectedSubject = subjectGroups.find(s => s.id === selectedSubjectGroupId);
    const getWeight = (_: string) => 1;

    const studentSubjectSummaryList = useMemo((): SubjectSummary[] => {
        if (!isStudent) return [];
        return subjectGroups.map(sg => {
            const list = studentEntriesBySubject[sg.id] ?? [];
            const sumPct = list.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0);
            return { subject_group_id: sg.id, course_name: sg.course_name, classroom_display: sg.classroom_display, avgPercent: list.length > 0 ? Math.round(sumPct / list.length) : null, count: list.length };
        }).sort((a, b) => a.course_name.localeCompare(b.course_name));
    }, [isStudent, subjectGroups, studentEntriesBySubject]);

    const studentOverallAvg = useMemo(() => {
        if (!isStudent) return null;
        const all = Object.values(studentEntriesBySubject).flat();
        if (!all.length) return null;
        return Math.round(all.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0) / all.length);
    }, [isStudent, studentEntriesBySubject]);

    const gradeBookWorks = useMemo((): WorkColumn[] => {
        if (!showClassView || !entries.length) return [];
        const seen = new Map<string, { title: string; graded_at: string | null }>();
        entries.forEach(e => {
            const key = `${e.source_type}-${e.source_id}`;
            const ex = seen.get(key);
            if (!ex || (e.graded_at && (!ex.graded_at || e.graded_at > ex.graded_at))) seen.set(key, { title: e.title, graded_at: e.graded_at || null });
        });
        return Array.from(seen.entries()).map(([key, { title, graded_at }]) => {
            const [source_type, idStr] = key.split('-');
            return { key, source_type: source_type as GradeBookEntry['source_type'], source_id: parseInt(idStr, 10), title, graded_at };
        }).sort((a, b) => {
            const order = { assignment: 0, test: 1, manual: 2 };
            const t = order[a.source_type] - order[b.source_type];
            return t !== 0 ? t : (a.graded_at || '').localeCompare(b.graded_at || '');
        });
    }, [showClassView, entries]);

    const gradeBookCell = useMemo(() => {
        const map = new Map<string, GradeBookEntry>();
        entries.filter(e => e.student_id != null)
            .sort((a, b) => new Date(b.graded_at || 0).getTime() - new Date(a.graded_at || 0).getTime())
            .forEach(e => { const k = `${e.student_id}-${e.source_type}-${e.source_id}`; if (!map.has(k)) map.set(k, e); });
        return (studentId: number, work: WorkColumn) => map.get(`${studentId}-${work.source_type}-${work.source_id}`) ?? null;
    }, [entries]);

    const studentStatsList = useMemo((): StudentStats[] => {
        if (!showClassView) return [];
        return students.map(student => {
            const se = entries.filter(e => e.student_id === student.id);
            let sw = 0, ss = 0;
            se.forEach(e => { const pct = e.max_value > 0 ? (e.value / e.max_value) * 100 : 0; sw += pct; ss++; });
            const last = [...se].sort((a, b) => new Date(b.graded_at || 0).getTime() - new Date(a.graded_at || 0).getTime())[0];
            return { student, count: se.length, avgPercent: ss > 0 ? Math.round(sw / ss) : null, lastDate: last?.graded_at || null };
        }).sort((a, b) => `${a.student.last_name} ${a.student.first_name}`.localeCompare(`${b.student.last_name} ${b.student.first_name}`));
    }, [showClassView, students, entries]);

    const displayedEntries = useMemo(() => {
        if (isStudent) return entries;
        if (selectedStudentId) return entries.filter(e => e.student_id === selectedStudentId);
        return entries;
    }, [entries, selectedStudentId, isStudent]);

    const classStats = useMemo(() => {
        if (!showClassView || !entries.length) return { totalGrades: 0, avgPercent: null, studentsWithGrades: 0 };
        let sw = 0, ss = 0;
        entries.forEach(e => { const pct = e.max_value > 0 ? (e.value / e.max_value) * 100 : 0; sw += pct; ss++; });
        return { totalGrades: entries.length, avgPercent: ss > 0 ? Math.round(sw / ss) : null, studentsWithGrades: new Set(entries.map(e => e.student_id)).size };
    }, [showClassView, entries]);

    const handleManualGradeAdded = () => {
        setShowAddGradeModal(false);
        if (!selectedSubjectGroupId) return;
        setLoadingGradeBook(true);
        const params: Record<string, string | number> = { subject_group: selectedSubjectGroupId as number };
        if (isStudent) params.student_id = user!.id;
        axiosInstance.get('/manual-grades/grade-book/', { params })
            .then(res => setEntries(res.data?.results ?? []))
            .finally(() => setLoadingGradeBook(false));
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    if (!user) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" /></div>;

    // ─── EXCEL TABLE STYLES ───
    const cellBase = 'border border-gray-300 text-xs';
    const hCell = `${cellBase} bg-gray-100 font-bold text-gray-700 text-center py-1.5 px-2`;
    const dataCell = `${cellBase} py-1 px-2`;

    return (
        <div className="max-w-full px-3 sm:px-4 py-4">
            {/* Title */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{t('diary.title')}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {isStudent && t('diary.subtitleStudent')}
                        {isTeacher && t('diary.subtitleTeacher')}
                        {isAdmin && t('diary.subtitleAdmin')}
                    </p>
                </div>
                {canAddGrade && selectedSubjectGroupId && (
                    <button
                        onClick={() => setShowAddGradeModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('diary.addGrade')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-wrap gap-3 items-end">
                {isAdmin && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{t('diary.class')}</label>
                        <div className="relative">
                            <select
                                value={selectedClassroomId}
                                onChange={e => setSelectedClassroomId(e.target.value ? Number(e.target.value) : '')}
                                disabled={loadingClassrooms}
                                className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none bg-white min-w-[120px]"
                            >
                                <option value="">{t('diary.selectClass')}</option>
                                {classrooms.map(c => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('diary.subject')}</label>
                    <div className="relative">
                        <select
                            value={selectedSubjectGroupId}
                            onChange={e => { setSelectedSubjectGroupId(e.target.value ? Number(e.target.value) : ''); setSelectedStudentId(null); }}
                            disabled={loadingSubjectGroups || (isAdmin && !selectedClassroomId)}
                            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none bg-white min-w-[180px]"
                        >
                            <option value="">{isStudent ? t('diary.allSubjects') : t('diary.selectSubject')}</option>
                            {subjectGroups.map(sg => (
                                <option key={sg.id} value={sg.id}>{sg.course_name}{sg.classroom_display ? ` (${sg.classroom_display})` : ''}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Grade categories (teacher/admin) */}
            {canAddGrade && selectedSubjectGroupId && (
                <div className="mb-4">
                    <GradeCategoriesManager subjectGroupId={Number(selectedSubjectGroupId)} />
                </div>
            )}

            {/* ─── CONTENT ─── */}
            {!selectedSubjectGroupId ? (
                isStudent ? (
                    loadingStudentSummaries ? (
                        <div className="bg-white rounded-2xl border border-gray-100 flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        /* Student summary: Excel table */
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-800">{t('diary.avgBySubject')}</span>
                                {studentOverallAvg != null && (
                                    <span className="text-xs font-semibold text-gray-600">{t('diary.overallAvg')}: {studentOverallAvg}%</span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse" style={{ minWidth: 360 }}>
                                    <thead>
                                        <tr>
                                            <th className={hCell + ' w-10'}>№</th>
                                            <th className={hCell + ' text-left'} style={{ minWidth: 160 }}>{t('diary.subject')}</th>
                                            <th className={hCell + ' w-24'}>{t('diary.avgGrade')}</th>
                                            <th className={hCell + ' w-20'}>{t('diary.countGrades')}</th>
                                            <th className={hCell + ' w-8'}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentSubjectSummaryList.map((row, idx) => (
                                            <tr key={row.subject_group_id} onClick={() => setSelectedSubjectGroupId(Number(row.subject_group_id))}
                                                className="cursor-pointer hover:bg-violet-50/30 transition-colors"
                                                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td className={`${dataCell} text-center text-gray-400`}>{idx + 1}</td>
                                                <td className={`${dataCell} font-medium text-gray-900`}>{row.course_name}{row.classroom_display ? ` (${row.classroom_display})` : ''}</td>
                                                <td className={`${dataCell} text-center font-bold`}
                                                    style={row.avgPercent != null ? { background: gradeColor(row.avgPercent), color: gradeTextColor(row.avgPercent) } : {}}>
                                                    {row.avgPercent != null ? `${row.avgPercent}%` : '—'}
                                                </td>
                                                <td className={`${dataCell} text-center text-gray-600`}>{row.count}</td>
                                                <td className={`${dataCell} text-center`}><ChevronRight className="w-3.5 h-3.5 text-gray-400 mx-auto" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">{t('diary.selectClassAndSubject')}</p>
                    </div>
                )
            ) : loadingGradeBook ? (
                <div className="bg-white rounded-2xl border border-gray-100 flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ─── CLASS GRADE BOOK TABLE (Excel style) ─── */}
                    {showClassView && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                            {/* Table header bar */}
                            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50">
                                <span className="text-sm font-bold text-gray-800">{selectedSubject?.course_name}</span>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Учеников с оценками: <strong className="text-gray-800">{classStats.studentsWithGrades}/{students.length}</strong></span>
                                    <span>Всего оценок: <strong className="text-gray-800">{classStats.totalGrades}</strong></span>
                                    {classStats.avgPercent != null && (
                                        <span className="font-bold text-gray-800">Средний: {classStats.avgPercent}%</span>
                                    )}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 px-4 py-1.5 border-b border-gray-100 bg-white text-[10px] text-gray-400">
                                <span className="flex items-center gap-1">{SOURCE_ICON.assignment} Д — задание</span>
                                <span className="flex items-center gap-1">{SOURCE_ICON.test} Т — тест</span>
                                <span className="flex items-center gap-1">{SOURCE_ICON.manual} Р — ручная</span>
                                <span className="ml-4 flex items-center gap-1"><span style={{ background: '#d4edda', border: '1px solid #b8dfc8', padding: '0 4px', borderRadius: 2 }}>85%+</span></span>
                                <span className="flex items-center gap-1"><span style={{ background: '#fff3cd', border: '1px solid #ffe08a', padding: '0 4px', borderRadius: 2 }}>65%+</span></span>
                                <span className="flex items-center gap-1"><span style={{ background: '#f8d7da', border: '1px solid #f5c2c7', padding: '0 4px', borderRadius: 2 }}>&lt;65%</span></span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="border-collapse text-xs"
                                    style={{ minWidth: gradeBookWorks.length > 0 ? `${240 + gradeBookWorks.length * 64}px` : '400px' }}>
                                    <thead>
                                        <tr style={{ background: '#e8e8e8' }}>
                                            {/* Sticky № */}
                                            <th className="border border-gray-300 py-2 px-2 font-bold text-gray-700 text-center sticky left-0 z-20 bg-gray-200 w-9" style={{ background: '#d4d4d4' }}>№</th>
                                            {/* Sticky name */}
                                            <th className="border border-gray-300 py-2 px-3 font-bold text-gray-700 text-left sticky left-9 z-20 min-w-[150px]" style={{ background: '#d4d4d4' }}>
                                                {t('diary.student')}
                                            </th>
                                            {/* Work columns */}
                                            {gradeBookWorks.map((work, wi) => (
                                                <th key={work.key} className="border border-gray-300 py-1 px-1 font-semibold text-gray-700 text-center w-16 align-bottom"
                                                    title={`${work.title} — ${work.graded_at ? formatSchoolDate(work.graded_at, 'ru-RU') : ''}`}>
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[9px] text-gray-400">{SOURCE_ABBR[work.source_type]}{wi + 1}</span>
                                                        <span className="truncate text-[10px] max-w-[56px]" title={work.title}>{work.title.length > 8 ? work.title.slice(0, 8) + '…' : work.title}</span>
                                                        {work.graded_at && <span className="text-[9px] text-gray-400">{formatSchoolDate(work.graded_at, 'ru-RU', { day: '2-digit', month: '2-digit' })}</span>}
                                                    </div>
                                                </th>
                                            ))}
                                            {/* Avg column */}
                                            <th className="border border-gray-300 py-2 px-2 font-bold text-gray-700 text-center w-16 bg-gray-200 sticky right-0 z-20" style={{ background: '#d4d4d4' }}>
                                                Средн.
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentStatsList.map((row, idx) => {
                                            const isSelected = selectedStudentId === row.student.id;
                                            return (
                                                <tr key={row.student.id}
                                                    onClick={() => setSelectedStudentId(isSelected ? null : row.student.id)}
                                                    className="cursor-pointer transition-colors"
                                                    style={{ background: isSelected ? '#ede9fe' : idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                                                    <td className="border border-gray-300 py-1.5 px-2 text-center text-gray-400 sticky left-0 z-10"
                                                        style={{ background: isSelected ? '#ddd6fe' : idx % 2 === 0 ? '#f0f0f0' : '#e8e8e8' }}>{idx + 1}</td>
                                                    <td className="border border-gray-300 py-1.5 px-3 font-semibold text-gray-900 sticky left-9 z-10 whitespace-nowrap"
                                                        style={{ background: isSelected ? '#ddd6fe' : idx % 2 === 0 ? '#f0f0f0' : '#e8e8e8' }}>
                                                        {row.student.last_name} {row.student.first_name}
                                                    </td>
                                                    {gradeBookWorks.map(work => {
                                                        const entry = gradeBookCell(row.student.id, work);
                                                        const pct = entry && entry.max_value > 0 ? (entry.value / entry.max_value) * 100 : null;
                                                        return (
                                                            <td key={work.key} className="border border-gray-300 py-1.5 px-1 text-center font-bold"
                                                                style={pct != null ? { background: gradeColor(pct), color: gradeTextColor(pct) } : { color: '#ccc' }}
                                                                title={entry?.feedback || undefined}>
                                                                {entry
                                                                    ? `${entry.value}/${entry.max_value}`
                                                                    : '—'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border border-gray-300 py-1.5 px-2 text-center font-bold sticky right-0 z-10"
                                                        style={row.avgPercent != null
                                                            ? { background: gradeColor(row.avgPercent), color: gradeTextColor(row.avgPercent) }
                                                            : { background: idx % 2 === 0 ? '#f0f0f0' : '#e8e8e8', color: '#ccc' }}>
                                                        {row.avgPercent != null ? `${row.avgPercent}%` : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Column avg row */}
                                        {studentStatsList.length > 0 && (
                                            <tr style={{ background: '#d4d4d4' }}>
                                                <td className="border border-gray-300 py-1.5 px-2 sticky left-0 z-10" style={{ background: '#c0c0c0' }} />
                                                <td className="border border-gray-300 py-1.5 px-3 font-bold text-gray-700 sticky left-9 z-10 text-xs" style={{ background: '#c0c0c0' }}>
                                                    Средн. по работе
                                                </td>
                                                {gradeBookWorks.map(work => {
                                                    const vals = studentStatsList.map(r => gradeBookCell(r.student.id, work)).filter(Boolean) as GradeBookEntry[];
                                                    if (!vals.length) return <td key={work.key} className="border border-gray-300 text-center text-gray-300">—</td>;
                                                    const avg = Math.round(vals.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0) / vals.length);
                                                    return (
                                                        <td key={work.key} className="border border-gray-300 py-1.5 px-1 text-center font-bold text-xs"
                                                            style={{ background: gradeColor(avg), color: gradeTextColor(avg) }}>
                                                            {avg}%
                                                        </td>
                                                    );
                                                })}
                                                <td className="border border-gray-300 sticky right-0 z-10" style={{ background: '#c0c0c0' }} />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                                Нажмите на строку, чтобы увидеть подробные оценки ученика
                            </p>
                        </div>
                    )}

                    {/* ─── Back / close button ─── */}
                    {selectedStudentId && (isAdmin || isTeacher) && (
                        <div className="mb-3 flex items-center">
                            <button onClick={() => setSelectedStudentId(null)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                                <X className="w-3.5 h-3.5" />
                                {t('diary.closeStudentCard')}
                            </button>
                        </div>
                    )}
                    {isStudent && selectedSubjectGroupId && (
                        <div className="mb-3">
                            <button onClick={() => setSelectedSubjectGroupId('')}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                                <ChevronLeft className="w-3.5 h-3.5" />
                                {t('diary.backToSubjects')}
                            </button>
                        </div>
                    )}

                    {/* ─── INDIVIDUAL GRADES TABLE (Excel style) ─── */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-800">
                                {isStudent
                                    ? selectedSubject?.course_name ?? t('diary.myGrades')
                                    : selectedStudentId && selectedStudent
                                        ? `${selectedStudent.last_name} ${selectedStudent.first_name}`
                                        : showClassView ? t('diary.selectStudentInTable') : selectedSubject?.course_name}
                            </span>
                            {isStudent && displayedEntries.length > 0 && (() => {
                                const avg = Math.round(displayedEntries.reduce((s, e) => s + (e.max_value > 0 ? (e.value / e.max_value) * 100 : 0), 0) / displayedEntries.length);
                                return <span className="text-xs text-gray-500">{displayedEntries.length} оценок · Средний: <strong>{avg}%</strong></span>;
                            })()}
                        </div>

                        {displayedEntries.length === 0 ? (
                            <div className="py-14 text-center text-gray-400">
                                <Award className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">{selectedStudentId ? t('diary.noGradesForStudent') : t('diary.noGrades')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs" style={{ minWidth: 560 }}>
                                    <thead>
                                        <tr style={{ background: '#e8e8e8' }}>
                                            <th className="border border-gray-300 py-2 px-3 text-left font-bold text-gray-700 w-24">Дата</th>
                                            <th className="border border-gray-300 py-2 px-3 text-left font-bold text-gray-700 w-28">Тип</th>
                                            <th className="border border-gray-300 py-2 px-3 text-left font-bold text-gray-700">Название</th>
                                            {(isAdmin || isTeacher) && !selectedStudentId && (
                                                <th className="border border-gray-300 py-2 px-3 text-left font-bold text-gray-700 w-32">Ученик</th>
                                            )}
                                            <th className="border border-gray-300 py-2 px-3 text-left font-bold text-gray-700">Комментарий</th>
                                            <th className="border border-gray-300 py-2 px-2 text-center font-bold text-gray-700 w-24">Оценка</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedEntries.map((entry, idx) => {
                                            const pct = entry.max_value > 0 ? (entry.value / entry.max_value) * 100 : 0;
                                            return (
                                                <tr key={`${entry.source_type}-${entry.source_id}-${entry.student_id}-${idx}`}
                                                    style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                                    <td className="border border-gray-200 py-1.5 px-3 text-gray-500 whitespace-nowrap">
                                                        {entry.graded_at ? formatSchoolDate(entry.graded_at, 'ru-RU') : '—'}
                                                    </td>
                                                    <td className="border border-gray-200 py-1.5 px-3">
                                                        <div className="flex items-center gap-1.5">
                                                            {SOURCE_ICON[entry.source_type]}
                                                            <span className="text-gray-600">
                                                                {entry.source_type === 'manual' && entry.category_name ? entry.category_name : t(`diary.source${entry.source_type.charAt(0).toUpperCase() + entry.source_type.slice(1)}`)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-200 py-1.5 px-3 font-medium text-gray-900">{entry.title}</td>
                                                    {(isAdmin || isTeacher) && !selectedStudentId && (
                                                        <td className="border border-gray-200 py-1.5 px-3 text-gray-500 whitespace-nowrap">{entry.student_username}</td>
                                                    )}
                                                    <td className="border border-gray-200 py-1.5 px-3 text-gray-500 max-w-xs truncate" title={entry.feedback || ''}>
                                                        {entry.feedback || '—'}
                                                    </td>
                                                    <td className="border border-gray-200 py-1.5 px-2 text-center font-bold whitespace-nowrap"
                                                        style={{ background: gradeColor(pct), color: gradeTextColor(pct) }}>
                                                        {entry.value}/{entry.max_value}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
