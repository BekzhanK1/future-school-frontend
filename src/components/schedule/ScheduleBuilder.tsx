'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Clock, MapPin, Lock } from 'lucide-react';

interface ScheduleSlot {
    id?: number;
    day_of_week: number; // 0=Monday, 6=Sunday
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    room?: string;
    start_date?: string; // Optional date range
    end_date?: string;
    quarter?: number | null; // 1, 2, 3, 4, or null for all quarters
}

interface ExistingSlot {
    day_of_week: number;
    start_time: string;
    end_time: string;
    label?: string; // e.g. "Математика (Иванов)"
}

interface ScheduleBuilderProps {
    subjectGroupId?: number;
    initialSlots?: ScheduleSlot[];
    onChange: (slots: ScheduleSlot[]) => void;
    /** По умолчанию для новых слотов; при смене четверти в одном слоте применяется ко всем */
    defaultQuarter?: number | null;
    /** По умолчанию для новых слотов; можно переопределить в каждом слоте */
    defaultRoom?: string;
    /** Уже существующие слоты (другие предметы/группы) для подсветки и проверки конфликтов */
    existingSlots?: ExistingSlot[];
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Понедельник', short: 'Пн' },
    { value: 1, label: 'Вторник', short: 'Вт' },
    { value: 2, label: 'Среда', short: 'Ср' },
    { value: 3, label: 'Четверг', short: 'Чт' },
    { value: 4, label: 'Пятница', short: 'Пт' },
    { value: 5, label: 'Суббота', short: 'Сб' },
    { value: 6, label: 'Воскресенье', short: 'Вс' },
];

export default function ScheduleBuilder({
    subjectGroupId,
    initialSlots = [],
    onChange,
    defaultQuarter = null,
    defaultRoom = '',
    existingSlots = [],
}: ScheduleBuilderProps) {
    const [slots, setSlots] = useState<ScheduleSlot[]>(initialSlots);
    const [editingSlot, setEditingSlot] = useState<number | null>(null);
    // pendingDay: day that has an open "add" form but not yet confirmed
    const [pendingDay, setPendingDay] = useState<number | null>(null);
    const [pendingStart, setPendingStart] = useState('09:00');
    const [pendingEnd, setPendingEnd] = useState('09:45');
    const [pendingRoom, setPendingRoom] = useState('');
    const [pendingError, setPendingError] = useState<string | null>(null);
    const isInitialMount = useRef(true);
    const prevInitialSlotsRef = useRef<string>(JSON.stringify(initialSlots));
    const isUpdatingFromProps = useRef(false);
    const prevSlotsRef = useRef<string>(JSON.stringify(initialSlots));
    const onChangeRef = useRef(onChange);

    // Keep onChange ref up to date
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        // Only update slots if initialSlots actually changed (deep comparison)
        const initialSlotsStr = JSON.stringify(initialSlots);
        
        if (initialSlotsStr !== prevInitialSlotsRef.current) {
            isUpdatingFromProps.current = true;
            setSlots(initialSlots);
            prevInitialSlotsRef.current = initialSlotsStr;
            prevSlotsRef.current = initialSlotsStr;
        }
    }, [initialSlots]);

    useEffect(() => {
        // Skip onChange on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            prevSlotsRef.current = JSON.stringify(slots);
            return;
        }
        
        // Skip onChange when updating from props
        if (isUpdatingFromProps.current) {
            isUpdatingFromProps.current = false;
            prevSlotsRef.current = JSON.stringify(slots);
            return;
        }
        
        // Only call onChange if slots actually changed (deep comparison)
        const slotsStr = JSON.stringify(slots);
        if (slotsStr !== prevSlotsRef.current) {
            prevSlotsRef.current = slotsStr;
            onChangeRef.current(slots);
        }
    }, [slots]);

    /** Time string to minutes since midnight for comparison */
    const timeToMinutes = (t: string): number => {
        if (!t || typeof t !== 'string') return 0;
        const parts = t.trim().split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return h * 60 + m;
    };

    const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
        timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);

    /** Валидация: время окончания должно быть позже времени начала */
    const isSlotTimeValid = (start: string, end: string): boolean =>
        timeToMinutes(end) > timeToMinutes(start);

    const hasConflict = (dayOfWeek: number, start: string, end: string, selfIndex?: number): boolean => {
        for (let i = 0; i < slots.length; i++) {
            if (selfIndex !== undefined && i === selfIndex) continue;
            const s = slots[i];
            if (s.day_of_week !== dayOfWeek) continue;
            if (rangesOverlap(start, end, s.start_time, s.end_time)) return true;
        }
        for (const s of existingSlots) {
            if (s.day_of_week !== dayOfWeek) continue;
            if (rangesOverlap(start, end, s.start_time, s.end_time)) return true;
        }
        return false;
    };

    const openPendingForm = (dayOfWeek: number, e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        setPendingDay(dayOfWeek);
        setPendingStart('09:00');
        setPendingEnd('09:45');
        setPendingRoom(defaultRoom || '');
        setPendingError(null);
    };

    const cancelPending = (e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        setPendingDay(null);
        setPendingError(null);
    };

    const confirmPending = (e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        if (pendingDay === null) return;
        if (!isSlotTimeValid(pendingStart, pendingEnd)) {
            setPendingError('Время окончания должно быть позже времени начала');
            return;
        }
        if (hasConflict(pendingDay, pendingStart, pendingEnd)) {
            setPendingError('Конфликт: в это время уже есть урок');
            return;
        }
        const newSlot: ScheduleSlot = {
            day_of_week: pendingDay,
            start_time: pendingStart,
            end_time: pendingEnd,
            room: pendingRoom || '',
            quarter: defaultQuarter ?? null,
        };
        const newSlots = [...slots, newSlot];
        setSlots(newSlots);
        setEditingSlot(newSlots.length - 1);
        setPendingDay(null);
        setPendingError(null);
    };

    const handlePendingStartChange = (val: string) => {
        const start = padTime(val);
        setPendingStart(start);
        // auto-adjust end to maintain 45 min
        const startMin = timeToMinutes(start);
        const endMin = startMin + 45;
        const h = Math.floor(endMin / 60);
        const m = endMin % 60;
        setPendingEnd(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        setPendingError(null);
    };

    const updateSlot = (index: number, updates: Partial<ScheduleSlot>) => {
        if (updates.quarter !== undefined) {
            setSlots(prev => prev.map(s => ({ ...s, quarter: updates.quarter ?? null })));
            return;
        }
        const updated = [...slots];
        const current = { ...updated[index], ...updates };

        // Автоподстройка конца, если меняется только начало и длительность была 45 минут
        if (updates.start_time && !updates.end_time) {
            const prevDuration =
                timeToMinutes(updated[index].end_time) - timeToMinutes(updated[index].start_time);
            if (prevDuration === 45) {
                const startMin = timeToMinutes(updates.start_time);
                const endMin = startMin + 45;
                const h = Math.floor(endMin / 60);
                const m = endMin % 60;
                current.end_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
        }

        if (
            hasConflict(
                current.day_of_week,
                current.start_time,
                current.end_time,
                index,
            )
        ) {
            alert('Конфликт расписания: в это время уже есть урок.');
            return;
        }

        updated[index] = current;
        setSlots(updated);
    };

    const removeSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
        if (editingSlot === index) {
            setEditingSlot(null);
        } else if (editingSlot !== null && editingSlot > index) {
            setEditingSlot(editingSlot - 1);
        }
    };

    const getSlotsForDay = (dayOfWeek: number) => {
        return slots.filter(s => s.day_of_week === dayOfWeek);
    };

    const formatTime = (time: string) => {
        return time || '09:00';
    };

    /** Normalize time input to HH:MM so "1:00" doesn't become 01:00 when user meant 10:00 */
    const padTime = (t: string): string => {
        if (!t || typeof t !== 'string') return '09:00';
        const parts = t.trim().split(':');
        const h = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
        const m = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4 w-full">
            {/* Weekly Schedule Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
                {DAYS_OF_WEEK.map(day => {
                    const daySlots = getSlotsForDay(day.value);
                    const dayExisting = existingSlots.filter(s => s.day_of_week === day.value);
                    const isPending = pendingDay === day.value;

                    return (
                        <div
                            key={day.value}
                            className={`border-2 rounded-xl p-2 min-h-[240px] transition-all ${
                                daySlots.length > 0
                                    ? 'border-purple-400 bg-purple-50 shadow-md'
                                    : 'border-gray-200 bg-white'
                            }`}
                        >
                            {/* Day header */}
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200">
                                <h4 className={`font-bold text-xs ${
                                    daySlots.length > 0 ? 'text-purple-700' : 'text-gray-600'
                                }`}>
                                    {day.short}
                                </h4>
                                {!isPending && (
                                    <button
                                        type="button"
                                        onClick={(e) => openPendingForm(day.value, e)}
                                        className="p-1 hover:bg-purple-200 rounded transition-colors bg-purple-100"
                                        title={`Добавить урок — ${day.label}`}
                                    >
                                        <Plus className="w-3 h-3 text-purple-700" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {/* Existing (occupied) slots — read-only */}
                                {dayExisting.map((es, ei) => (
                                    <div
                                        key={`ex-${ei}`}
                                        className="flex items-start gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 text-xs"
                                        title={es.label || 'Занято'}
                                    >
                                        <Lock className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-red-700 leading-none">
                                                {es.start_time.slice(0,5)}–{es.end_time.slice(0,5)}
                                            </p>
                                            {es.label && (
                                                <p className="text-red-500 truncate leading-tight mt-0.5" style={{fontSize:'10px'}}>
                                                    {es.label}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* New slots added by user */}
                                {daySlots.map((slot) => {
                                    const globalIndex = slots.findIndex(s => s === slot);
                                    const isEditing = editingSlot === globalIndex;

                                    return (
                                        <div
                                            key={globalIndex}
                                            className={`bg-white border-2 rounded-lg p-2 text-xs shadow-sm ${
                                                isEditing
                                                    ? 'border-purple-500 ring-1 ring-purple-200'
                                                    : 'border-purple-300 hover:border-purple-400 transition-all'
                                            }`}
                                        >
                                            {isEditing ? (
                                                <div className="space-y-1.5">
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-0.5">Начало</label>
                                                        <input
                                                            type="time"
                                                            value={slot.start_time}
                                                            onChange={e => updateSlot(globalIndex, { start_time: padTime(e.target.value) })}
                                                            className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-0.5">Конец</label>
                                                        <input
                                                            type="time"
                                                            value={slot.end_time}
                                                            onChange={e => updateSlot(globalIndex, { end_time: padTime(e.target.value) })}
                                                            className={`w-full px-1.5 py-1 text-xs border rounded focus:ring-1 focus:ring-purple-500 ${
                                                                !isSlotTimeValid(slot.start_time, slot.end_time) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-0.5">Кабинет</label>
                                                        <input
                                                            type="text"
                                                            value={slot.room || ''}
                                                            onChange={e => updateSlot(globalIndex, { room: e.target.value })}
                                                            placeholder="101"
                                                            className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-0.5">Четверть</label>
                                                        <select
                                                            value={slot.quarter ?? ''}
                                                            onChange={e => updateSlot(globalIndex, { quarter: e.target.value === '' ? null : parseInt(e.target.value) })}
                                                            className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                                                        >
                                                            <option value="">Все</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                            <option value="4">4</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-1 pt-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setEditingSlot(null); }}
                                                            className="flex-1 px-1.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                        >
                                                            Готово
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); removeSlot(globalIndex); }}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <Clock className="w-3 h-3 text-purple-400" />
                                                        <span className="font-semibold text-gray-900">
                                                            {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                                                        </span>
                                                    </div>
                                                    {slot.room && (
                                                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                                                            <MapPin className="w-3 h-3" />
                                                            <span>{slot.room}</span>
                                                        </div>
                                                    )}
                                                    {slot.quarter && (
                                                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                                            {slot.quarter} четв.
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setEditingSlot(globalIndex); }}
                                                        className="mt-1.5 w-full px-1.5 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                                    >
                                                        Изменить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Pending "add" form */}
                                {isPending && (
                                    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2 text-xs space-y-1.5">
                                        <p className="font-semibold text-green-700">Новый урок</p>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-0.5">Начало</label>
                                            <input
                                                type="time"
                                                value={pendingStart}
                                                onChange={e => handlePendingStartChange(e.target.value)}
                                                className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-0.5">Конец</label>
                                            <input
                                                type="time"
                                                value={pendingEnd}
                                                onChange={e => { setPendingEnd(padTime(e.target.value)); setPendingError(null); }}
                                                className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-0.5">Кабинет</label>
                                            <input
                                                type="text"
                                                value={pendingRoom}
                                                onChange={e => setPendingRoom(e.target.value)}
                                                placeholder="101"
                                                className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                                            />
                                        </div>
                                        {pendingError && (
                                            <p className="text-red-600 text-xs">{pendingError}</p>
                                        )}
                                        <div className="flex gap-1 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={confirmPending}
                                                className="flex-1 px-1.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
                                            >
                                                Добавить
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelPending}
                                                className="px-1.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            {slots.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                        Уроков в неделю: <span className="font-bold text-purple-700">{slots.length}</span>
                    </p>
                    <span className="text-green-600 text-sm">✓ Готово</span>
                </div>
            )}
        </div>
    );
}
