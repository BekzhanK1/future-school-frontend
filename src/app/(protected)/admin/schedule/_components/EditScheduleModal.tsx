'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import ScheduleBuilder from '@/components/schedule/ScheduleBuilder';
import axiosInstance from '@/lib/axios';
import { Lock } from 'lucide-react';

export interface ScheduleSlotApi {
    id: number;
    subject_group: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string | null;
    quarter?: number | null;
}

export interface SubjectGroupForSchedule {
    id: number;
    course_name: string;
    classroom?: number | null;
    classroom_display?: string;
    teacher?: number | null;
    teacher_fullname?: string | null;
    color?: string | null;
    schedule_slots: ScheduleSlotApi[];
}

interface OccupiedSlot {
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject_group_course_name: string;
    subject_group_classroom_display?: string | null;
    subject_group_teacher_fullname?: string | null;
    subject_group?: number;
}

interface EditScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjectGroup: SubjectGroupForSchedule | null;
    onSuccess: () => void;
}

function parseTime(t: string): [number, number] {
    if (!t || typeof t !== 'string') return [9, 0];
    const parts = t.trim().split(':').map((s) => parseInt(s, 10));
    const h = Number.isNaN(parts[0]) ? 9 : Math.max(0, Math.min(23, parts[0]));
    const m = Number.isNaN(parts[1]) ? 0 : Math.max(0, Math.min(59, parts[1]));
    return [h, m];
}

function normalizeTime(t: string): string {
    const [h, m] = parseTime(t);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeForApi(t: string): string {
    return normalizeTime(t);
}

function timeToMinutes(t: string): number {
    if (!t || typeof t !== 'string') return 0;
    const [h, m] = parseTime(t);
    return h * 60 + m;
}

function isSlotTimeValid(start: string, end: string): boolean {
    return timeToMinutes(end) > timeToMinutes(start);
}

interface AcademicYearMin {
    start_date: string;
    quarter1_weeks?: number;
    quarter2_weeks?: number;
    quarter3_weeks?: number;
    quarter4_weeks?: number;
}

function calculateQuarterDates(year: AcademicYearMin): Array<{ start: Date; end: Date }> {
    const startDate = new Date(year.start_date);
    const weeks = [
        year.quarter1_weeks ?? 8,
        year.quarter2_weeks ?? 8,
        year.quarter3_weeks ?? 10,
        year.quarter4_weeks ?? 8,
    ];
    const quarters: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startDate);
    for (const w of weeks) {
        const start = new Date(current);
        const end = new Date(current);
        end.setDate(end.getDate() + w * 7 - 1);
        quarters.push({ start, end });
        current = new Date(end);
        current.setDate(current.getDate() + 1);
    }
    return quarters;
}

function getQuarterForDate(date: Date, quarterDates: Array<{ start: Date; end: Date }>): number | null {
    for (let i = 0; i < quarterDates.length; i++) {
        if (date >= quarterDates[i].start && date <= quarterDates[i].end) return i + 1;
    }
    return null;
}

async function fetchCurrentQuarter(): Promise<number | null> {
    try {
        const res = await axiosInstance.get('/academic-years/current/');
        const data = res.data;
        if (!data?.start_date) return null;
        const quarters = calculateQuarterDates(data);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return getQuarterForDate(today, quarters);
    } catch {
        return null;
    }
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function EditScheduleModal({
    isOpen,
    onClose,
    subjectGroup,
    onSuccess,
}: EditScheduleModalProps) {
    const [slots, setSlots] = useState<Array<{
        id?: number;
        day_of_week: number;
        start_time: string;
        end_time: string;
        room?: string;
        quarter?: number | null;
    }>>([]);
    const [defaultQuarter, setDefaultQuarter] = useState<number | null>(null);
    const [defaultRoom, setDefaultRoom] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingSlots, setExistingSlots] = useState<Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        label?: string;
    }>>([]);
    const [loadingConflicts, setLoadingConflicts] = useState(false);
    const hasUserChangedSlotsRef = useRef(false);

    const mappedInitial = subjectGroup
        ? (subjectGroup.schedule_slots ?? []).map((s) => ({
              id: s.id,
              day_of_week: s.day_of_week,
              start_time: normalizeTime(s.start_time),
              end_time: normalizeTime(s.end_time),
              room: s.room ?? '',
              quarter: s.quarter ?? null,
          }))
        : [];

    // Fetch occupied slots for classroom (other subjects) + teacher (other classes)
    useEffect(() => {
        if (!isOpen || !subjectGroup) return;

        const load = async () => {
            setLoadingConflicts(true);
            const occupied: typeof existingSlots = [];

            try {
                if (subjectGroup.classroom) {
                    const res = await axiosInstance.get<OccupiedSlot[]>('/schedule-slots/by-classroom/', {
                        params: { classroom_id: subjectGroup.classroom },
                    });
                    const data: OccupiedSlot[] = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
                    for (const s of data) {
                        if (s.subject_group === subjectGroup.id) continue; // skip own slots
                        occupied.push({
                            day_of_week: s.day_of_week,
                            start_time: s.start_time,
                            end_time: s.end_time,
                            label: `Класс: ${s.subject_group_course_name}${s.subject_group_teacher_fullname ? ` (${s.subject_group_teacher_fullname})` : ''}`,
                        });
                    }
                }

                if (subjectGroup.teacher) {
                    const res = await axiosInstance.get<OccupiedSlot[]>('/schedule-slots/by-teacher/', {
                        params: { teacher_id: subjectGroup.teacher },
                    });
                    const data: OccupiedSlot[] = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
                    for (const s of data) {
                        if (s.subject_group === subjectGroup.id) continue;
                        // skip if already covered by classroom check
                        const alreadyAdded = occupied.some(
                            (o) =>
                                o.day_of_week === s.day_of_week &&
                                o.start_time === s.start_time &&
                                o.end_time === s.end_time
                        );
                        if (!alreadyAdded) {
                            occupied.push({
                                day_of_week: s.day_of_week,
                                start_time: s.start_time,
                                end_time: s.end_time,
                                label: `Учитель занят: ${s.subject_group_course_name}${s.subject_group_classroom_display ? ` (${s.subject_group_classroom_display})` : ''}`,
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching occupied slots', e);
            } finally {
                setLoadingConflicts(false);
            }

            setExistingSlots(occupied);
        };

        void load();
    }, [isOpen, subjectGroup?.id]);

    useEffect(() => {
        if (!isOpen || !subjectGroup) return;
        hasUserChangedSlotsRef.current = false;
        setSlots(mappedInitial);
        const first = mappedInitial[0];
        setDefaultRoom(first?.room ?? '');
        setError(null);
        if (first?.quarter != null) {
            setDefaultQuarter(first.quarter);
        } else {
            setDefaultQuarter(null);
            fetchCurrentQuarter().then((q) => {
                if (q != null) {
                    setDefaultQuarter(q);
                    setSlots((prev) =>
                        prev.map((s) => ({ ...s, quarter: s.quarter ?? q }))
                    );
                }
            });
        }
    }, [isOpen, subjectGroup?.id]);

    const handleChange = useCallback((newSlots: typeof slots) => {
        hasUserChangedSlotsRef.current = true;
        setSlots(newSlots);
        const first = newSlots[0];
        if (first != null) {
            setDefaultQuarter(first.quarter ?? null);
            setDefaultRoom(first.room ?? '');
        }
    }, []);

    const applyDefaultQuarterToAll = (quarter: number | null) => {
        setDefaultQuarter(quarter);
        setSlots(prev => prev.map(s => ({ ...s, quarter })));
    };

    const applyDefaultRoomToAll = (room: string) => {
        setDefaultRoom(room);
        setSlots(prev => prev.map(s => ({ ...s, room: room || '' })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectGroup) return;
        setError(null);
        const slotsToSave =
            slots.length > 0 || hasUserChangedSlotsRef.current ? slots : mappedInitial;
        const invalidSlot = slotsToSave.find(
            (s) => !isSlotTimeValid(s.start_time, s.end_time)
        );
        if (invalidSlot) {
            setError('Время окончания должно быть позже времени начала в каждом слоте.');
            return;
        }
        const existingCount = (subjectGroup.schedule_slots ?? []).length;
        if (slotsToSave.length === 0 && existingCount > 0) {
            if (!confirm('Удалить все слоты расписания? Вы уверены?')) return;
        }
        setSubmitting(true);
        try {
            const existingRes = await axiosInstance.get('/schedule-slots/', {
                params: { subject_group: subjectGroup.id },
            });
            const existing = Array.isArray(existingRes.data)
                ? existingRes.data
                : existingRes.data.results ?? [];
            const saveIds = new Set(
                slotsToSave.map((s) => s.id).filter((id): id is number => id != null)
            );
            for (const slot of existing) {
                if (!saveIds.has(slot.id)) {
                    await axiosInstance.delete(`/schedule-slots/${slot.id}/`);
                }
            }
            for (const slot of slotsToSave) {
                const payload = {
                    day_of_week: slot.day_of_week,
                    start_time: timeForApi(slot.start_time),
                    end_time: timeForApi(slot.end_time),
                    room: slot.room || undefined,
                    quarter: slot.quarter ?? undefined,
                };
                if (slot.id != null) {
                    await axiosInstance.patch(`/schedule-slots/${slot.id}/`, payload);
                } else {
                    await axiosInstance.post('/schedule-slots/', {
                        ...payload,
                        subject_group: subjectGroup.id,
                    });
                }
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving schedule:', err);
            const detail = err.response?.data?.detail ?? err.response?.data?.non_field_errors?.[0] ?? 'Не удалось сохранить расписание';
            setError(detail);
        } finally {
            setSubmitting(false);
        }
    };

    if (!subjectGroup) return null;

    const conflictCount = existingSlots.length;
    const title = `Расписание: ${subjectGroup.course_name}${subjectGroup.classroom_display ? ` · ${subjectGroup.classroom_display}` : ''}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-7xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Meta info bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm">
                    {subjectGroup.teacher_fullname && (
                        <span className="flex items-center gap-1.5 text-gray-700">
                            <span className="font-medium">Учитель:</span>
                            {subjectGroup.teacher_fullname}
                        </span>
                    )}
                    {subjectGroup.classroom_display && (
                        <span className="flex items-center gap-1.5 text-gray-700">
                            <span className="font-medium">Класс:</span>
                            {subjectGroup.classroom_display}
                        </span>
                    )}
                    {loadingConflicts ? (
                        <span className="ml-auto text-xs text-gray-400">Загрузка занятых слотов…</span>
                    ) : conflictCount > 0 ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-red-600">
                            <Lock className="h-3 w-3" />
                            {conflictCount} занятых слотов (красные блоки в сетке)
                        </span>
                    ) : (
                        <span className="ml-auto text-xs text-green-600">Конфликтов не найдено</span>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {/* Default quarter / room */}
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Четверть:</label>
                        <select
                            value={defaultQuarter ?? ''}
                            onChange={(e) => applyDefaultQuarterToAll(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="">Все</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                        <span className="text-xs text-gray-400">применяется ко всем</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Кабинет:</label>
                        <input
                            type="text"
                            value={defaultRoom}
                            onChange={(e) => applyDefaultRoomToAll(e.target.value)}
                            placeholder="101"
                            className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="text-xs text-gray-400">применяется ко всем</span>
                    </div>
                </div>

                <ScheduleBuilder
                    subjectGroupId={subjectGroup.id}
                    initialSlots={slots.length > 0 ? slots : mappedInitial}
                    onChange={handleChange}
                    defaultQuarter={defaultQuarter}
                    defaultRoom={defaultRoom}
                    existingSlots={existingSlots}
                />

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={submitting}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Сохранение…' : 'Сохранить'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
