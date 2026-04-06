'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Users, FileText, Search, Edit, Trash2, Layers, RefreshCw } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import { courseService } from '@/services/courseService';
import type { CourseWithStats, Course } from '@/types/course';
import { useLocale } from '@/contexts/LocaleContext';
import CreateCourseModal from './_components/CreateCourseModal';
import BulkCreateSubjectGroupsModal from './_components/BulkCreateSubjectGroupsModal';
import SyncAllCoursesModal from './_components/SyncAllCoursesModal';

const LANG_META: Record<string, { label: string; bg: string; text: string }> = {
    kazakh:  { label: 'Қаз', bg: 'bg-blue-100',   text: 'text-blue-700' },
    russian: { label: 'Рус', bg: 'bg-red-100',    text: 'text-red-700' },
    english: { label: 'Eng', bg: 'bg-green-100',  text: 'text-green-700' },
};

const GRADE_COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
];

function gradeColor(grade: number): string {
    return GRADE_COLORS[(grade - 1) % GRADE_COLORS.length];
}

export default function CoursesPage() {
    const router = useRouter();
    const { user } = useUserState();
    const { t } = useLocale();
    const [courses, setCourses] = useState<CourseWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
    const [syncAllModalOpen, setSyncAllModalOpen] = useState(false);

    useEffect(() => {
        if (user && !['superadmin', 'schooladmin'].includes(user.role)) {
            router.push('/');
        }
    }, [user, router]);

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await courseService.getAllCoursesWithStats();
            setCourses(data);
        } catch {
            setError('Не удалось загрузить курсы');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseCreated = () => {
        setIsCreateModalOpen(false);
        setEditingCourse(null);
        fetchCourses();
    };

    const handleEdit = (e: React.MouseEvent, course: CourseWithStats) => {
        e.stopPropagation();
        setEditingCourse(course);
    };

    const handleDelete = async (e: React.MouseEvent, course: CourseWithStats) => {
        e.stopPropagation();
        if (!window.confirm(`Удалить курс "${course.name}"? Это нельзя отменить.`)) return;
        try {
            await courseService.deleteCourse(course.id);
            fetchCourses();
        } catch (error: any) {
            alert(error?.formattedMessage || 'Не удалось удалить курс');
        }
    };

    const grades = useMemo(() => {
        const set = new Set(courses.map(c => c.grade));
        return Array.from(set).sort((a, b) => a - b);
    }, [courses]);

    const courseLabelMap = useMemo(
        () =>
            Object.fromEntries(
                courses.map((c) => [c.id, `${c.name} (${c.course_code})`])
            ) as Record<number, string>,
        [courses]
    );

    const filteredCourses = useMemo(() => courses.filter((c) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            c.name.toLowerCase().includes(q) ||
            c.course_code.toLowerCase().includes(q);
        return matchesSearch && (gradeFilter === null || c.grade === gradeFilter);
    }), [courses, searchQuery, gradeFilter]);

    if (user && !['superadmin', 'schooladmin'].includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ запрещён</h2>
                    <p className="text-gray-500">Только администраторы могут просматривать эту страницу.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="mx-auto max-w-screen-xl px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Курсы</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {loading ? '...' : `${courses.length} курс${courses.length === 1 ? '' : courses.length < 5 ? 'а' : 'ов'}`}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setSyncAllModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Синхронизировать всё
                        </button>
                        <button
                            onClick={() => setIsBulkCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Layers className="w-4 h-4" />
                            Назначить группы
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Создать курс
                        </button>
                    </div>
                </div>

                {/* Search + grade filter */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Поиск по названию или коду..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                    </div>
                    {/* Grade pills */}
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setGradeFilter(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                gradeFilter === null
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Все классы
                        </button>
                        {grades.map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGradeFilter(g)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    gradeFilter === g
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error state */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                                <div className="h-2 bg-gray-200" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-50 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-violet-300" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {searchQuery || gradeFilter ? 'Курсы не найдены' : 'Нет курсов'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            {searchQuery || gradeFilter ? 'Попробуйте изменить параметры поиска' : 'Создайте первый курс'}
                        </p>
                        {!searchQuery && !gradeFilter && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
                            >
                                Создать курс
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredCourses.map((course) => {
                            const langMeta = LANG_META[course.language ?? ''];
                            const gc = gradeColor(course.grade);
                            return (
                                <div
                                    key={course.id}
                                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-violet-100 transition-all cursor-pointer"
                                    onClick={() => router.push(`/admin/courses/${course.id}`)}
                                >
                                    {/* Grade accent stripe */}
                                    <div className={`h-1.5 bg-gradient-to-r ${gc}`} />

                                    <div className="p-5">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${gc} text-white text-sm font-bold shadow-sm`}>
                                                    {course.grade}
                                                </span>
                                                {langMeta && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${langMeta.bg} ${langMeta.text}`}>
                                                        {langMeta.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={e => handleEdit(e, course)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={e => handleDelete(e, course)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Course name */}
                                        <h3 className="text-base font-bold text-gray-900 leading-snug mb-0.5">
                                            {course.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-mono mb-2">{course.course_code}</p>

                                        {course.description && (
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                {course.description}
                                            </p>
                                        )}

                                        {/* Stats footer */}
                                        <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                                <span><span className="font-semibold text-gray-700">{course.subject_groups_count || 0}</span> классов</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                <span><span className="font-semibold text-gray-700">{course.template_sections_count || 0}</span> секций</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CreateCourseModal
                isOpen={isCreateModalOpen || !!editingCourse}
                onClose={() => { setIsCreateModalOpen(false); setEditingCourse(null); }}
                onSuccess={handleCourseCreated}
                course={editingCourse}
            />
            <BulkCreateSubjectGroupsModal
                isOpen={isBulkCreateModalOpen}
                onClose={() => setIsBulkCreateModalOpen(false)}
                onSuccess={() => { setIsBulkCreateModalOpen(false); fetchCourses(); }}
            />
            <SyncAllCoursesModal
                isOpen={syncAllModalOpen}
                onClose={() => setSyncAllModalOpen(false)}
                courseIds={courses.map((c) => c.id)}
                courseLabels={courseLabelMap}
                onSuccess={() => fetchCourses()}
            />
        </div>
    );
}
