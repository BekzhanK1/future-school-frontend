'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, Users, BookOpen, GraduationCap } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import ScheduleBuilder from '@/components/schedule/ScheduleBuilder';

interface Course {
    id: number;
    course_code: string;
    name: string;
    grade: number;
    language: string;
}

interface Classroom {
    id: number;
    grade: number;
    letter: string;
    school: number;
    school_name?: string;
}

interface Teacher {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface ExistingScheduleSlot {
    id: number;
    day_of_week: number;
    day_of_week_display: string;
    start_time: string;
    end_time: string;
    room?: string | null;
    subject_group_course_name: string;
    subject_group_classroom_id?: number | null;
    subject_group_classroom_display?: string | null;
    subject_group_teacher_fullname?: string | null;
}

interface BulkCreateSubjectGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function BulkCreateSubjectGroupsModal({
    isOpen,
    onClose,
    onSuccess,
}: BulkCreateSubjectGroupsModalProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<number>(0);
    const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
    const [selectedClassrooms, setSelectedClassrooms] = useState<number[]>([]);
    const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
    // Schedule slots per classroom: { classroomId: [slots] }
    const [scheduleSlotsByClassroom, setScheduleSlotsByClassroom] = useState<Record<number, any[]>>({});
    const [existingScheduleByClassroom, setExistingScheduleByClassroom] = useState<Record<number, ExistingScheduleSlot[]>>({});
    const [loadingExistingSchedule, setLoadingExistingSchedule] = useState<Record<number, boolean>>({});
    const [teacherSchedule, setTeacherSchedule] = useState<ExistingScheduleSlot[]>([]);
    const [loadingTeacherSchedule, setLoadingTeacherSchedule] = useState(false);
    // Classroom IDs that already have a SubjectGroup for the selected course
    const [takenClassroomIds, setTakenClassroomIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset state
            setSelectedCourses([]);
            setSelectedClassrooms([]);
            setSelectedTeachers([]);
            setResult(null);
            setError(null);
            setSelectedSchool(0);
            setScheduleSlotsByClassroom({});
            setExistingScheduleByClassroom({});
            setLoadingExistingSchedule({});
            setTeacherSchedule([]);
            setLoadingTeacherSchedule(false);
            setTakenClassroomIds(new Set());
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // Fetch schools
            const schoolsResponse = await axiosInstance.get('/schools/');
            const schoolsData = Array.isArray(schoolsResponse.data)
                ? schoolsResponse.data
                : schoolsResponse.data.results || [];
            setSchools(schoolsData);
            if (schoolsData.length > 0) {
                setSelectedSchool(schoolsData[0].id);
            }

            // Fetch courses
            const coursesResponse = await axiosInstance.get('/courses/');
            const coursesData = Array.isArray(coursesResponse.data)
                ? coursesResponse.data
                : coursesResponse.data.results || [];
            setCourses(coursesData);

            // Fetch all classrooms (will filter by school if selected)
            const classroomsResponse = await axiosInstance.get('/classrooms/');
            const classroomsData = Array.isArray(classroomsResponse.data)
                ? classroomsResponse.data
                : classroomsResponse.data.results || [];
            setClassrooms(classroomsData);

            // Fetch all teachers
            const teachersResponse = await axiosInstance.get('/users/', {
                params: { role: 'teacher' }
            });
            const teachersData = Array.isArray(teachersResponse.data)
                ? teachersResponse.data
                : teachersResponse.data.results || [];
            setTeachers(teachersData);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Не удалось загрузить данные');
        } finally {
            setLoadingData(false);
        }
    };

    const handleSchoolChange = (schoolId: number) => {
        setSelectedSchool(schoolId);
        // Filter classrooms and teachers by school
        // Note: This assumes classrooms and teachers have school field
    };

    const filteredClassrooms = selectedSchool
        ? classrooms.filter(c => c.school === selectedSchool)
        : classrooms;

    const filteredTeachers = selectedSchool
        ? teachers.filter((t: any) => t.school === selectedSchool)
        : teachers;

    const hasCourse = selectedCourses.length === 1;
    const hasTeacher = selectedTeachers.length === 1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!hasCourse) {
            setError('Сначала выберите курс');
            return;
        }

        if (selectedClassrooms.length === 0) {
            setError('Выберите хотя бы один класс');
            return;
        }

        if (!hasTeacher) {
            setError('Выберите учителя');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axiosInstance.post('/subject-groups/bulk-create/', {
                course_ids: selectedCourses,
                classroom_ids: selectedClassrooms,
                teacher_ids: selectedTeachers,
            });

            // Apply schedule slots to both newly created and already-existing subject groups
            const allGroups = [
                ...(response.data?.created ?? []),
                ...(response.data?.skipped ?? []),
            ];
            for (const item of allGroups) {
                const classroomId = item.classroom_id;
                const subjectGroupId = item.id;
                if (!subjectGroupId) continue;
                const slots = scheduleSlotsByClassroom[classroomId] || [];
                for (const slot of slots) {
                    try {
                        await axiosInstance.post('/schedule-slots/', {
                            subject_group: subjectGroupId,
                            day_of_week: slot.day_of_week,
                            start_time: slot.start_time,
                            end_time: slot.end_time,
                            room: slot.room || undefined,
                        });
                    } catch (slotError: any) {
                        console.error(
                            `Error creating schedule slot for subject group ${subjectGroupId}:`,
                            slotError?.response?.data || slotError,
                        );
                    }
                }
            }

            setResult(response.data);
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            console.error('Error creating subject groups:', err);
            const errorMessage =
                err?.response?.data?.error ||
                err?.response?.data?.detail ||
                'Не удалось создать SubjectGroup';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (
        id: number,
        selected: number[],
        setSelected: (ids: number[]) => void
    ) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(i => i !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleScheduleChange = useCallback((classroomId: number, slots: any[]) => {
        setScheduleSlotsByClassroom(prev => {
            const currentSlots = prev[classroomId] || [];
            // Deep comparison to avoid unnecessary updates
            const currentStr = JSON.stringify(currentSlots);
            const newStr = JSON.stringify(slots);
            
            if (currentStr === newStr) {
                return prev; // No change, return same object
            }
            
            return {
                ...prev,
                [classroomId]: slots
            };
        });
    }, []);

    // Load existing schedule for each newly selected classroom
    useEffect(() => {
        const loadForClassroom = async (classroomId: number) => {
            setLoadingExistingSchedule(prev => ({ ...prev, [classroomId]: true }));
            try {
                const res = await axiosInstance.get<ExistingScheduleSlot[]>('/schedule-slots/by-classroom/', {
                    params: { classroom_id: classroomId },
                });
                const data = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
                setExistingScheduleByClassroom(prev => ({ ...prev, [classroomId]: data }));
            } catch (err) {
                console.error('Error loading classroom schedule', classroomId, err);
            } finally {
                setLoadingExistingSchedule(prev => ({ ...prev, [classroomId]: false }));
            }
        };

        selectedClassrooms.forEach((id) => {
            if (!existingScheduleByClassroom[id] && !loadingExistingSchedule[id]) {
                void loadForClassroom(id);
            }
        });
    }, [selectedClassrooms, existingScheduleByClassroom, loadingExistingSchedule]);

    // Load teacher schedule whenever the selected teacher changes
    useEffect(() => {
        const teacherId = selectedTeachers[0];
        if (!teacherId) {
            setTeacherSchedule([]);
            return;
        }
        const load = async () => {
            setLoadingTeacherSchedule(true);
            try {
                const res = await axiosInstance.get<ExistingScheduleSlot[]>('/schedule-slots/by-teacher/', {
                    params: { teacher_id: teacherId },
                });
                const data = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
                setTeacherSchedule(data);
            } catch (err) {
                console.error('Error loading teacher schedule', teacherId, err);
            } finally {
                setLoadingTeacherSchedule(false);
            }
        };
        void load();
    }, [selectedTeachers]);

    // Fetch taken classrooms whenever selected course changes
    useEffect(() => {
        const courseId = selectedCourses[0];
        if (!courseId) {
            setTakenClassroomIds(new Set());
            return;
        }
        const load = async () => {
            try {
                const res = await axiosInstance.get('/subject-groups/', {
                    params: { course: courseId, page_size: 1000 },
                });
                const items: Array<{ classroom: number }> = Array.isArray(res.data)
                    ? res.data
                    : (res.data as any).results ?? [];
                setTakenClassroomIds(new Set(items.map(i => i.classroom)));
                // Deselect any already-taken classrooms
                setSelectedClassrooms(prev => prev.filter(id => !items.some(i => i.classroom === id)));
            } catch (err) {
                console.error('Error loading taken classrooms', courseId, err);
            }
        };
        void load();
    }, [selectedCourses]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Массовое создание SubjectGroup
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* School Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Фильтр по школе (опционально)
                        </label>
                        <select
                            value={selectedSchool}
                            onChange={(e) => handleSchoolChange(Number(e.target.value))}
                            disabled={loadingData || loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            <option value={0}>Все школы</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 1. Курсы (шаг 1) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Курсы <span className="text-red-500">*</span>
                            <span className="text-sm text-gray-500 ml-2">
                                {hasCourse ? '(1 выбран)' : '(ничего не выбрано)'}
                            </span>
                        </label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                            {loadingData ? (
                                <p className="text-gray-500">Загрузка...</p>
                            ) : courses.length === 0 ? (
                                <p className="text-gray-500">Нет доступных курсов</p>
                            ) : (
                                <div className="space-y-2">
                                    {courses.map(course => (
                                        <label
                                            key={course.id}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                                                selectedCourses.includes(course.id)
                                                    ? 'bg-blue-50 border-blue-400'
                                                    : 'hover:bg-gray-50 border-transparent'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="bulk-course"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() =>
                                                    setSelectedCourses(
                                                        selectedCourses.includes(course.id)
                                                            ? []
                                                            : [course.id],
                                                    )
                                                }
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {course.course_code} - {course.name} (Класс: {course.grade})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Учителя (шаг 2, доступен после выбора курса) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Учителя <span className="text-red-500">*</span>
                            <span className="text-sm text-gray-500 ml-2">
                                {hasTeacher ? '(1 выбран)' : '(ничего не выбрано)'}
                            </span>
                        </label>
                        <div
                            className={`border rounded-md p-3 max-h-48 overflow-y-auto ${
                                hasCourse ? 'border-gray-300' : 'border-dashed border-gray-200 opacity-60'
                            }`}
                        >
                            {loadingData ? (
                                <p className="text-gray-500">Загрузка...</p>
                            ) : !hasCourse ? (
                                <p className="text-gray-400 text-sm">
                                    Сначала выберите курс, затем станет доступен выбор учителя.
                                </p>
                            ) : filteredTeachers.length === 0 ? (
                                <p className="text-gray-500">Нет доступных учителей</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTeachers.map(teacher => (
                                        <label
                                            key={teacher.id}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                                                selectedTeachers.includes(teacher.id)
                                                    ? 'bg-purple-50 border-purple-400'
                                                    : 'hover:bg-gray-50 border-transparent'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="bulk-teacher"
                                                checked={selectedTeachers.includes(teacher.id)}
                                                onChange={() =>
                                                    setSelectedTeachers(
                                                        selectedTeachers.includes(teacher.id)
                                                            ? []
                                                            : [teacher.id],
                                                    )
                                                }
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {teacher.first_name} {teacher.last_name} ({teacher.username})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Классы (шаг 3, доступен после выбора курса и учителя) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Классы <span className="text-red-500">*</span>
                            <span className="text-sm text-gray-500 ml-2">
                                ({selectedClassrooms.length} выбрано)
                            </span>
                        </label>
                        <div
                            className={`border rounded-md p-3 max-h-48 overflow-y-auto ${
                                hasCourse && hasTeacher
                                    ? 'border-gray-300'
                                    : 'border-dashed border-gray-200 opacity-60'
                            }`}
                        >
                            {loadingData ? (
                                <p className="text-gray-500">Загрузка...</p>
                            ) : !(hasCourse && hasTeacher) ? (
                                <p className="text-gray-400 text-sm">
                                    Сначала выберите курс и учителя, затем будут доступны классы.
                                </p>
                            ) : filteredClassrooms.length === 0 ? (
                                <p className="text-gray-500">Нет доступных классов</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredClassrooms.map(classroom => {
                                        const isTaken = takenClassroomIds.has(classroom.id);
                                        return (
                                            <label
                                                key={classroom.id}
                                                title={isTaken ? 'Для этого класса уже существует группа по выбранному курсу' : undefined}
                                                className={`flex items-center gap-2 p-2 rounded ${
                                                    isTaken
                                                        ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                        : 'hover:bg-gray-50 cursor-pointer'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    disabled={isTaken}
                                                    checked={selectedClassrooms.includes(classroom.id)}
                                                    onChange={() =>
                                                        !isTaken && toggleSelection(
                                                            classroom.id,
                                                            selectedClassrooms,
                                                            setSelectedClassrooms
                                                        )
                                                    }
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                />
                                                <GraduationCap className={`w-4 h-4 ${isTaken ? 'text-gray-300' : 'text-gray-400'}`} />
                                                <span className={`text-sm ${isTaken ? 'text-gray-400 line-through' : ''}`}>
                                                    {classroom.grade}{classroom.letter}
                                                    {classroom.school_name && ` (${classroom.school_name})`}
                                                </span>
                                                {isTaken && (
                                                    <span className="ml-auto text-xs text-orange-500 font-medium">уже есть</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    {(selectedCourses.length > 0 && selectedClassrooms.length > 0) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-blue-900 mb-2">
                                Будет создано SubjectGroup:
                            </p>
                            <p className="text-sm text-blue-700">
                                {selectedCourses.length} курс(ов) × {selectedClassrooms.length} класс(ов)
                                {selectedTeachers.length > 0 && ` × ${selectedTeachers.length} учитель(ей)`}
                                {' = '}
                                <span className="font-bold">
                                    {selectedCourses.length *
                                        selectedClassrooms.length *
                                        (selectedTeachers.length > 0 ? selectedTeachers.length : 1)}{' '}
                                    SubjectGroup
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Schedule Builder per Classroom */}
                    {selectedClassrooms.length > 0 && (
                        <div className="pt-4 border-t-2 border-purple-200">
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        📅 Расписание уроков по классам
                                    </h3>
                                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                                        Опционально
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Укажите расписание для каждого класса отдельно. Если не указано, расписание можно будет добавить позже.
                                </p>
                            </div>
                            <div className="space-y-6">
                                {selectedClassrooms.map((classroomId) => {
                                    const classroom = filteredClassrooms.find(c => c.id === classroomId);
                                    if (!classroom) return null;
                                    const currentSchedule = existingScheduleByClassroom[classroomId] || [];
                                    const isScheduleLoading = loadingExistingSchedule[classroomId];
                                    
                                    return (
                                        <div key={classroomId} className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-xl p-6 border-2 border-purple-300 shadow-lg">
                                            <div className="mb-4 pb-3 border-b-2 border-purple-200">
                                                <h4 className="text-lg font-bold text-gray-900">
                                                    {classroom.grade}{classroom.letter}
                                                    {classroom.school_name && ` (${classroom.school_name})`}
                                                </h4>
                                                <div className="mt-1 space-y-1 text-sm text-gray-700">
                                                    {hasCourse && (
                                                        <p>
                                                            <span className="font-semibold">Курс:</span>{' '}
                                                            {courses.find(c => c.id === selectedCourses[0])?.name || '—'}
                                                        </p>
                                                    )}
                                                    {hasTeacher && (
                                                        <p>
                                                            <span className="font-semibold">Учитель:</span>{' '}
                                                            {teachers.find((t: any) => t.id === selectedTeachers[0])?.first_name}{' '}
                                                            {teachers.find((t: any) => t.id === selectedTeachers[0])?.last_name}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500">
                                                        Ниже — новое расписание для создаваемых групп. Снизу показано текущее расписание класса, чтобы избежать пересечений.
                                                    </p>
                                                </div>
                                            </div>
                                            <ScheduleBuilder
                                                initialSlots={scheduleSlotsByClassroom[classroomId] || []}
                                                existingSlots={[
                                                    ...currentSchedule.map((s) => ({
                                                        day_of_week: s.day_of_week,
                                                        start_time: s.start_time,
                                                        end_time: s.end_time,
                                                        label: s.subject_group_teacher_fullname
                                                            ? `Класс: ${s.subject_group_course_name} (${s.subject_group_teacher_fullname})`
                                                            : `Класс: ${s.subject_group_course_name}`,
                                                    })),
                                                    ...teacherSchedule
                                                        .filter(s => s.subject_group_classroom_id !== classroomId)
                                                        .map((s) => ({
                                                            day_of_week: s.day_of_week,
                                                            start_time: s.start_time,
                                                            end_time: s.end_time,
                                                            label: `Учитель занят: ${s.subject_group_course_name}${s.subject_group_classroom_display ? ` (${s.subject_group_classroom_display})` : ''}`,
                                                        })),
                                                ]}
                                                onChange={(slots) => handleScheduleChange(classroomId, slots)}
                                            />
                                            <div className="mt-4 bg-white/80 rounded-lg border border-purple-100 p-3">
                                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                                    Текущее расписание класса
                                                </p>
                                                {isScheduleLoading && (
                                                    <p className="text-xs text-gray-500">Загрузка...</p>
                                                )}
                                                {!isScheduleLoading && currentSchedule.length === 0 && (
                                                    <p className="text-xs text-gray-400">
                                                        Для этого класса ещё нет слотов расписания.
                                                    </p>
                                                )}
                                                {!isScheduleLoading && currentSchedule.length > 0 && (
                                                    <ul className="space-y-1 max-h-40 overflow-y-auto text-xs text-gray-700">
                                                        {currentSchedule.map((slot) => (
                                                            <li key={slot.id} className="flex items-center justify-between gap-2">
                                                                <span>
                                                                    <span className="font-medium">
                                                                        {slot.day_of_week_display}{' '}
                                                                        {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                                                                    </span>{' '}
                                                                    · {slot.subject_group_course_name}
                                                                    {slot.subject_group_teacher_fullname && (
                                                                        <span className="text-gray-500">
                                                                            {' '}({slot.subject_group_teacher_fullname})
                                                                        </span>
                                                                    )}
                                                                    {slot.room && (
                                                                        <span className="text-gray-500"> · каб. {slot.room}</span>
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success Result */}
                    {result && result.success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800">
                                        SubjectGroup созданы успешно!
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-gray-600">Создано:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.created_count}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Пропущено:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.skipped_count}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Ошибок:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.errors_count}
                                        </p>
                                    </div>
                                </div>

                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-gray-700 font-medium mb-2">Ошибки:</p>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {result.errors.map((err: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs bg-red-100 rounded p-2"
                                                >
                                                    {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={
                                loading ||
                                loadingData ||
                                selectedCourses.length === 0 ||
                                selectedClassrooms.length === 0 ||
                                selectedTeachers.length === 0
                            }
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Создание...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Создать SubjectGroup</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
