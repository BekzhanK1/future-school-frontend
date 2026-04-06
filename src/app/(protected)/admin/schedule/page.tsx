'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Edit2, Plus, Users, GraduationCap, ChevronDown } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import axiosInstance from '@/lib/axios';
import EditScheduleModal, { type SubjectGroupForSchedule } from './_components/EditScheduleModal';

interface Classroom {
    id: number;
    grade: number;
    letter: string;
    school_name?: string;
    school?: number;
}

interface Teacher {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
}

const DAYS = [
    { value: 0, short: 'Пн', label: 'Понедельник' },
    { value: 1, short: 'Вт', label: 'Вторник' },
    { value: 2, short: 'Ср', label: 'Среда' },
    { value: 3, short: 'Чт', label: 'Четверг' },
    { value: 4, short: 'Пт', label: 'Пятница' },
    { value: 5, short: 'Сб', label: 'Суббота' },
    { value: 6, short: 'Вс', label: 'Воскресенье' },
];

// Time slots from 08:00 to 18:00 in 15-min steps (for grid rows)
const HOUR_START = 8;
const HOUR_END = 18;
const GRID_STEP = 15; // minutes per row
const TOTAL_ROWS = ((HOUR_END - HOUR_START) * 60) / GRID_STEP; // 40 rows

function timeToMinutes(t: string): number {
    const match = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function minutesToStr(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Integer row index + span for CSS Grid (fractional lines are invalid and break placement). */
function slotToGridRows(startMin: number, endMin: number): { rowStart: number; rowSpan: number } {
    const origin = HOUR_START * 60;
    const rowStart = Math.max(0, Math.floor((startMin - origin) / GRID_STEP));
    const rowEndExclusive = Math.max(
        rowStart + 1,
        Math.ceil((endMin - origin) / GRID_STEP)
    );
    let rowSpan = rowEndExclusive - rowStart;
    rowSpan = Math.max(1, Math.min(rowSpan, TOTAL_ROWS - rowStart));
    return { rowStart, rowSpan };
}

const SUBJECT_COLORS = [
    'bg-purple-100 border-purple-400 text-purple-900',
    'bg-blue-100 border-blue-400 text-blue-900',
    'bg-emerald-100 border-emerald-400 text-emerald-900',
    'bg-amber-100 border-amber-400 text-amber-900',
    'bg-rose-100 border-rose-400 text-rose-900',
    'bg-cyan-100 border-cyan-400 text-cyan-900',
    'bg-violet-100 border-violet-400 text-violet-900',
    'bg-orange-100 border-orange-400 text-orange-900',
    'bg-teal-100 border-teal-400 text-teal-900',
    'bg-pink-100 border-pink-400 text-pink-900',
];

interface SlotDisplay {
    id: number;
    subject_group_id: number;
    course_name: string;
    teacher_fullname: string | null;
    classroom_display?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string | null;
    colorClass: string;
}

type ViewMode = 'classroom' | 'teacher';

export default function SchedulePage() {
    const router = useRouter();
    const { user } = useUserState();

    const [viewMode, setViewMode] = useState<ViewMode>('classroom');
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroupForSchedule[]>([]);
    const [loadingClassrooms, setLoadingClassrooms] = useState(true);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [editSubjectGroup, setEditSubjectGroup] = useState<SubjectGroupForSchedule | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [schoolFilter, setSchoolFilter] = useState<number | 'all'>('all');

    useEffect(() => {
        if (user && user.role !== 'superadmin' && user.role !== 'schooladmin') {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Fetch classrooms
    useEffect(() => {
        let cancelled = false;
        setLoadingClassrooms(true);
        axiosInstance.get('/classrooms/').then((res) => {
            if (cancelled) return;
            const data: Classroom[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            setClassrooms(data);
            if (data.length && !selectedClassroomId) setSelectedClassroomId(data[0].id);
        }).catch(console.error).finally(() => { if (!cancelled) setLoadingClassrooms(false); });
        return () => { cancelled = true; };
    }, []);

    // Fetch teachers
    useEffect(() => {
        if (viewMode !== 'teacher') return;
        setLoadingTeachers(true);
        axiosInstance.get('/users/', { params: { role: 'teacher', page_size: 200 } }).then((res) => {
            const data: Teacher[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            setTeachers(data);
            if (data.length && !selectedTeacherId) setSelectedTeacherId(data[0].id);
        }).catch(console.error).finally(() => setLoadingTeachers(false));
    }, [viewMode]);

    // Fetch subject groups for selected entity
    useEffect(() => {
        const param =
            viewMode === 'classroom'
                ? selectedClassroomId
                    ? { classroom: selectedClassroomId }
                    : null
                : selectedTeacherId
                    ? { teacher: selectedTeacherId }
                    : null;

        if (!param) { setSubjectGroups([]); return; }

        let cancelled = false;
        setLoadingSchedule(true);
        axiosInstance.get('/subject-groups/', { params: { ...param, page_size: 200 } }).then((res) => {
            if (cancelled) return;
            const data: SubjectGroupForSchedule[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            setSubjectGroups(data);
        }).catch((e) => { console.error(e); if (!cancelled) setSubjectGroups([]); })
        .finally(() => { if (!cancelled) setLoadingSchedule(false); });
        return () => { cancelled = true; };
    }, [viewMode, selectedClassroomId, selectedTeacherId]);

    // Build color map: subject_group_id → colorClass
    const colorMap = useMemo(() => {
        const map = new Map<number, string>();
        subjectGroups.forEach((sg, i) => {
            map.set(sg.id, SUBJECT_COLORS[i % SUBJECT_COLORS.length]);
        });
        return map;
    }, [subjectGroups]);

    // Flatten all slots
    const allSlots = useMemo<SlotDisplay[]>(() => {
        const out: SlotDisplay[] = [];
        for (const sg of subjectGroups) {
            for (const s of (sg.schedule_slots ?? [])) {
                out.push({
                    id: s.id,
                    subject_group_id: sg.id,
                    course_name: (sg as any).course_name ?? '',
                    teacher_fullname: (sg as any).teacher_fullname ?? null,
                    classroom_display: (sg as any).classroom_display,
                    day_of_week: s.day_of_week,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    room: s.room,
                    colorClass: colorMap.get(sg.id) ?? SUBJECT_COLORS[0],
                });
            }
        }
        return out;
    }, [subjectGroups, colorMap]);

    // Schools list for filter
    const schools = useMemo(() => {
        const map = new Map<number, string>();
        classrooms.forEach((c) => {
            if (c.school && c.school_name) map.set(c.school, c.school_name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [classrooms]);

    const filteredClassrooms = useMemo(() =>
        schoolFilter === 'all'
            ? classrooms
            : classrooms.filter((c) => c.school === schoolFilter),
        [classrooms, schoolFilter]
    );

    const handleEditSchedule = (sg: SubjectGroupForSchedule) => {
        setEditSubjectGroup(sg);
        setEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        const param =
            viewMode === 'classroom' && selectedClassroomId
                ? { classroom: selectedClassroomId }
                : viewMode === 'teacher' && selectedTeacherId
                    ? { teacher: selectedTeacherId }
                    : null;
        if (!param) return;
        axiosInstance.get('/subject-groups/', { params: { ...param, page_size: 200 } })
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
                setSubjectGroups(data);
            }).catch(console.error);
    };

    // Grid: for each day × 15-min row, find slots that overlap
    function getSlotsForCell(day: number, rowIndex: number): SlotDisplay[] {
        const rowStartMin = HOUR_START * 60 + rowIndex * GRID_STEP;
        const rowEndMin = rowStartMin + GRID_STEP;
        return allSlots.filter((s) => {
            if (s.day_of_week !== day) return false;
            const start = timeToMinutes(s.start_time);
            const end = timeToMinutes(s.end_time);
            return start < rowEndMin && end > rowStartMin;
        });
    }

    // For rendering: group slots per day column into positioned blocks
    // Each block spans from its start to end row
    function getDayBlocks(day: number): Array<SlotDisplay & { rowStart: number; rowSpan: number }> {
        const daySlots = allSlots.filter((s) => s.day_of_week === day);
        // Deduplicate by id (a slot shows once starting at its start row)
        const seen = new Set<number>();
        const blocks: Array<SlotDisplay & { rowStart: number; rowSpan: number }> = [];
        for (const s of daySlots) {
            if (seen.has(s.id)) continue;
            seen.add(s.id);
            const startMin = timeToMinutes(s.start_time);
            const endMin = timeToMinutes(s.end_time);
            const { rowStart, rowSpan } = slotToGridRows(startMin, endMin);
            blocks.push({ ...s, rowStart, rowSpan });
        }
        return blocks;
    }

    const selectedLabel =
        viewMode === 'classroom'
            ? classrooms.find((c) => c.id === selectedClassroomId)
            : teachers.find((t) => t.id === selectedTeacherId);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-screen-2xl px-4 py-6">
                {/* Header */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Calendar className="h-7 w-7 text-purple-600" />
                        Расписание
                    </h1>
                    {/* View mode toggle */}
                    <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setViewMode('classroom')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                                viewMode === 'classroom'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <GraduationCap className="h-4 w-4" />
                            По классам
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('teacher')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                                viewMode === 'teacher'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            По учителям
                        </button>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Sidebar: selector */}
                    <div className="w-48 shrink-0">
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            {viewMode === 'classroom' ? (
                                <>
                                    {/* School filter */}
                                    {schools.length > 1 && (
                                        <div className="border-b border-gray-100 p-2">
                                            <div className="relative">
                                                <select
                                                    value={schoolFilter === 'all' ? 'all' : String(schoolFilter)}
                                                    onChange={(e) => setSchoolFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                                    className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-7 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                                >
                                                    <option value="all">Все школы</option>
                                                    {schools.map((s) => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                                        {loadingClassrooms ? (
                                            <p className="p-3 text-xs text-gray-400">Загрузка…</p>
                                        ) : filteredClassrooms.length === 0 ? (
                                            <p className="p-3 text-xs text-gray-400">Нет классов</p>
                                        ) : (
                                            filteredClassrooms.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setSelectedClassroomId(c.id)}
                                                    className={`w-full px-3 py-2.5 text-left text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                                                        selectedClassroomId === c.id
                                                            ? 'bg-purple-50 text-purple-800 border-l-2 border-l-purple-500'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {c.grade}{c.letter}
                                                    {c.school_name && (
                                                        <span className="block text-xs text-gray-400 font-normal">{c.school_name}</span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                                    {loadingTeachers ? (
                                        <p className="p-3 text-xs text-gray-400">Загрузка…</p>
                                    ) : teachers.length === 0 ? (
                                        <p className="p-3 text-xs text-gray-400">Нет учителей</p>
                                    ) : (
                                        teachers.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setSelectedTeacherId(t.id)}
                                                className={`w-full px-3 py-2.5 text-left text-sm transition-colors border-b border-gray-50 last:border-0 ${
                                                    selectedTeacherId === t.id
                                                        ? 'bg-purple-50 text-purple-800 border-l-2 border-l-purple-500 font-medium'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {t.last_name} {t.first_name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                        {/* Subject pills + edit buttons */}
                        {!loadingSchedule && subjectGroups.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {subjectGroups.map((sg) => {
                                    const color = colorMap.get(sg.id) ?? SUBJECT_COLORS[0];
                                    const slotCount = (sg.schedule_slots ?? []).length;
                                    return (
                                        <button
                                            key={sg.id}
                                            type="button"
                                            onClick={() => handleEditSchedule(sg)}
                                            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all hover:shadow-md ${color}`}
                                        >
                                            <Edit2 className="h-3 w-3 flex-shrink-0" />
                                            <span>{sg.course_name}</span>
                                            {viewMode === 'teacher' && (sg as any).classroom_display && (
                                                <span className="opacity-70">· {(sg as any).classroom_display}</span>
                                            )}
                                            {viewMode === 'classroom' && (sg as any).teacher_fullname && (
                                                <span className="opacity-70">· {(sg as any).teacher_fullname}</span>
                                            )}
                                            {slotCount > 0 ? (
                                                <span className="rounded-full bg-white/60 px-1.5 py-0.5">
                                                    {slotCount} сл.
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-amber-700">
                                                    <Plus className="inline h-2.5 w-2.5" /> добавить
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Timetable grid */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-gray-800">
                                        {viewMode === 'classroom'
                                            ? selectedLabel
                                                ? `Класс ${(selectedLabel as Classroom).grade}${(selectedLabel as Classroom).letter}`
                                                : 'Выберите класс'
                                            : selectedLabel
                                                ? `${(selectedLabel as Teacher).last_name} ${(selectedLabel as Teacher).first_name}`
                                                : 'Выберите учителя'
                                        }
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Нажмите на предмет, чтобы настроить расписание
                                    </p>
                                </div>
                                {allSlots.length > 0 && (
                                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                                        {allSlots.length} урок{allSlots.length === 1 ? '' : allSlots.length < 5 ? 'а' : 'ов'} в неделю
                                    </span>
                                )}
                            </div>

                            {loadingSchedule ? (
                                <div className="p-10 text-center text-gray-400 text-sm">Загрузка…</div>
                            ) : subjectGroups.length === 0 ? (
                                <div className="p-10 text-center text-gray-400 text-sm">
                                    <p>Нет предметов для выбранного {viewMode === 'classroom' ? 'класса' : 'учителя'}.</p>
                                    <p className="mt-1 text-xs">Добавьте класс к курсу в разделе «Курсы».</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    {/* CSS grid: rows = time slots, cols = days */}
                                    <div
                                        className="relative"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: `4rem repeat(${DAYS.length}, minmax(100px, 1fr))`,
                                            gridTemplateRows: `2rem repeat(${TOTAL_ROWS}, 12px)`,
                                        }}
                                    >
                                        {/* Day headers */}
                                        <div style={{ gridColumn: 1, gridRow: 1 }} className="border-b border-r border-gray-200 bg-gray-50" />
                                        {DAYS.map((d, di) => (
                                            <div
                                                key={d.value}
                                                style={{ gridColumn: di + 2, gridRow: 1 }}
                                                className="flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 last:border-r-0"
                                            >
                                                <span className="hidden sm:inline">{d.label}</span>
                                                <span className="sm:hidden">{d.short}</span>
                                            </div>
                                        ))}

                                        {/* Hour labels + horizontal lines every 60min */}
                                        {Array.from({ length: TOTAL_ROWS }).map((_, ri) => {
                                            const absMin = HOUR_START * 60 + ri * GRID_STEP;
                                            const isHour = absMin % 60 === 0;
                                            const isHalf = absMin % 60 === 30;
                                            return (
                                                <div
                                                    key={ri}
                                                    style={{ gridColumn: 1, gridRow: ri + 2 }}
                                                    className={`border-r border-gray-200 pr-1.5 text-right ${isHour ? 'border-t border-t-gray-300' : isHalf ? 'border-t border-t-gray-100' : ''}`}
                                                >
                                                    {isHour && (
                                                        <span className="text-[10px] text-gray-400 leading-none">
                                                            {minutesToStr(absMin)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Day column backgrounds + hour lines */}
                                        {DAYS.map((d, di) =>
                                            Array.from({ length: TOTAL_ROWS }).map((_, ri) => {
                                                const absMin = HOUR_START * 60 + ri * GRID_STEP;
                                                const isHour = absMin % 60 === 0;
                                                const isHalf = absMin % 60 === 30;
                                                return (
                                                    <div
                                                        key={`${di}-${ri}`}
                                                        style={{ gridColumn: di + 2, gridRow: ri + 2 }}
                                                        className={`border-r border-gray-100 last:border-r-0 ${isHour ? 'border-t border-t-gray-200' : isHalf ? 'border-t border-t-gray-100' : ''}`}
                                                    />
                                                );
                                            })
                                        )}

                                        {/* Slot blocks */}
                                        {DAYS.map((d, di) => {
                                            const blocks = getDayBlocks(d.value);
                                            return blocks.map((block) => (
                                                <button
                                                    key={block.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const sg = subjectGroups.find((x) => x.id === block.subject_group_id);
                                                        if (sg) handleEditSchedule(sg);
                                                    }}
                                                    style={{
                                                        gridColumn: di + 2,
                                                        gridRow: `${block.rowStart + 2} / span ${block.rowSpan}`,
                                                        zIndex: 1,
                                                    }}
                                                    className={`m-px rounded-md border-l-4 px-1.5 py-0.5 text-left text-[11px] leading-tight overflow-hidden transition-all hover:brightness-95 hover:shadow-md ${block.colorClass}`}
                                                    title={`${block.course_name}${block.teacher_fullname ? ` · ${block.teacher_fullname}` : ''}${block.room ? ` · каб. ${block.room}` : ''}\n${block.start_time.slice(0,5)}–${block.end_time.slice(0,5)}`}
                                                >
                                                    <p className="font-semibold truncate">{block.course_name}</p>
                                                    {viewMode === 'teacher' && block.classroom_display && (
                                                        <p className="truncate opacity-80">{block.classroom_display}</p>
                                                    )}
                                                    {viewMode === 'classroom' && block.teacher_fullname && (
                                                        <p className="truncate opacity-80">{block.teacher_fullname}</p>
                                                    )}
                                                    <p className="opacity-70 mt-0.5">{block.start_time.slice(0,5)}–{block.end_time.slice(0,5)}</p>
                                                    {block.room && <p className="opacity-60">каб. {block.room}</p>}
                                                </button>
                                            ));
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EditScheduleModal
                isOpen={editModalOpen}
                onClose={() => { setEditModalOpen(false); setEditSubjectGroup(null); }}
                subjectGroup={editSubjectGroup}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
}
