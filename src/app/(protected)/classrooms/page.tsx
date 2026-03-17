'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Search, GraduationCap, ChevronRight } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import axiosInstance from '@/lib/axios';
import ClassroomModal from '@/components/classrooms/ClassroomModal';
import { useRouter } from 'next/navigation';

interface ClassroomData {
    id: number;
    school: number;
    grade: number;
    letter: string;
    kundelik_id: string;
    language: string;
    school_name: string;
    total_students: number;
    name?: string;
}

const LANG_META: Record<string, { label: string; bg: string; text: string }> = {
    kazakh:  { label: 'Қаз', bg: 'bg-blue-100',  text: 'text-blue-700' },
    russian: { label: 'Рус', bg: 'bg-red-100',   text: 'text-red-700' },
    english: { label: 'Eng', bg: 'bg-green-100', text: 'text-green-700' },
};

const GRADE_PALETTES = [
    { ring: 'ring-violet-200', badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
    { ring: 'ring-blue-200',   badge: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-400' },
    { ring: 'ring-emerald-200',badge: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-400' },
    { ring: 'ring-amber-200',  badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-400' },
    { ring: 'ring-rose-200',   badge: 'bg-rose-100 text-rose-800',     dot: 'bg-rose-400' },
    { ring: 'ring-cyan-200',   badge: 'bg-cyan-100 text-cyan-800',     dot: 'bg-cyan-400' },
];

function gradePalette(grade: number) {
    return GRADE_PALETTES[(grade - 1) % GRADE_PALETTES.length];
}

export default function ClassroomsPage() {
    const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingClassroom, setEditingClassroom] = useState<ClassroomData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState<number | null>(null);
    const { user } = useUserState();
    const router = useRouter();

    const canEdit = user?.role === 'superadmin' || user?.role === 'schooladmin';

    useEffect(() => {
        axiosInstance.get('/classrooms/').then(response => {
            const data: ClassroomData[] = (Array.isArray(response.data) ? response.data : response.data.results ?? [])
                .map((c: ClassroomData) => ({ ...c, name: `${c.grade}${c.letter}` }));
            setClassrooms(data);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (user && user.role !== 'superadmin' && user.role !== 'schooladmin') {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleCreate = async (data: Omit<ClassroomData, 'id' | 'name'>) => {
        setLoading(true);
        try {
            const res = await axiosInstance.post('/classrooms/', data);
            setClassrooms(prev => [...prev, { ...res.data, name: `${res.data.grade}${res.data.letter}` }]);
            setShowCreateModal(false);
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Не удалось создать класс');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: number, data: Partial<ClassroomData>) => {
        setLoading(true);
        try {
            const res = await axiosInstance.put(`/classrooms/${id}/`, data);
            setClassrooms(prev => prev.map(c => c.id === id ? { ...res.data, name: `${res.data.grade}${res.data.letter}` } : c));
            setEditingClassroom(null);
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Не удалось обновить класс');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить класс?')) return;
        setLoading(true);
        try {
            await axiosInstance.delete(`/classrooms/${id}/`);
            setClassrooms(prev => prev.filter(c => c.id !== id));
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Не удалось удалить класс');
        } finally {
            setLoading(false);
        }
    };

    // Available grades
    const grades = useMemo(() => {
        const set = new Set(classrooms.map(c => c.grade));
        return Array.from(set).sort((a, b) => a - b);
    }, [classrooms]);

    // Group classrooms by school
    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return classrooms.filter(c => {
            const name = `${c.grade}${c.letter}`;
            return (
                (!q || name.toLowerCase().includes(q) || c.school_name?.toLowerCase().includes(q)) &&
                (gradeFilter === null || c.grade === gradeFilter)
            );
        });
    }, [classrooms, searchQuery, gradeFilter]);

    const groupedBySchool = useMemo(() => {
        const map = new Map<string, ClassroomData[]>();
        for (const c of filtered) {
            const key = c.school_name || 'Без школы';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
        }
        // Sort each group by grade then letter
        map.forEach((arr) => arr.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter)));
        return map;
    }, [filtered]);

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="mx-auto max-w-screen-xl px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Классы</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{classrooms.length} классов</p>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Добавить класс
                        </button>
                    )}
                </div>

                {/* Search + grade filter */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Поиск по классу или школе..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                    </div>
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
                            Все
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

                {/* Groups by school */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-50 flex items-center justify-center">
                            <GraduationCap className="w-8 h-8 text-violet-300" />
                        </div>
                        <p className="text-gray-500 font-medium">
                            {searchQuery || gradeFilter ? 'Классы не найдены' : 'Нет классов'}
                        </p>
                    </div>
                ) : (
                    Array.from(groupedBySchool.entries()).map(([school, items]) => (
                        <div key={school} className="space-y-3">
                            {groupedBySchool.size > 1 && (
                                <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                                    {school}
                                    <span className="text-gray-400 font-normal">({items.length})</span>
                                </h2>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {items.map(classroom => {
                                    const pal = gradePalette(classroom.grade);
                                    const langMeta = LANG_META[classroom.language];
                                    return (
                                        <div
                                            key={classroom.id}
                                            className={`group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:ring-2 ${pal.ring} transition-all flex flex-col`}
                                        >
                                            {/* Grade badge + lang */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-2xl font-black ${pal.badge.split(' ')[1]} leading-none`}>
                                                    {classroom.grade}<span className="text-xl">{classroom.letter}</span>
                                                </span>
                                                {langMeta && (
                                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${langMeta.bg} ${langMeta.text}`}>
                                                        {langMeta.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Students */}
                                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                                                <Users className="w-3 h-3" />
                                                <span>{classroom.total_students} учеников</span>
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-auto flex items-center justify-between gap-1">
                                                <button
                                                    onClick={() => router.push(`/classrooms/${classroom.id}`)}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors"
                                                >
                                                    Открыть
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                                {canEdit && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => setEditingClassroom(classroom)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                            disabled={loading}
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(classroom.id)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            disabled={loading}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ClassroomModal
                isOpen={showCreateModal || !!editingClassroom}
                classroom={editingClassroom}
                onSave={editingClassroom
                    ? data => handleUpdate(editingClassroom.id, data)
                    : handleCreate}
                onClose={() => { setShowCreateModal(false); setEditingClassroom(null); }}
                loading={loading}
            />
        </div>
    );
}
