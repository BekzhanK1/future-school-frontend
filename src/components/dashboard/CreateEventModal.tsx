'use client';

import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/lib/axios';
import {
    datetimeLocalValueToUtcIso,
    nowToDatetimeLocalInAppZone,
    utcIsoToDatetimeLocalValue,
} from '@/lib/datetimeLocal';
import AppZoneDateTimePicker from '@/components/ui/AppZoneDateTimePicker';
import { useLocale } from '@/contexts/LocaleContext';
import { X, Search } from 'lucide-react';

export interface CreateEventPayload {
    title: string;
    description: string;
    type: string;
    start_at: string;
    end_at: string;
    is_all_day: boolean;
    location: string;
    target_audience: string;
    school?: number | null;
    subject_group?: number | null;
    target_users?: number[];
}

interface SubjectGroupOption {
    id: number;
    classroom: number;
    course: number;
    course_name?: string;
    classroom_display?: string;
}

interface UserOption {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialStart?: string;
    initialEnd?: string;
}

const EVENT_TYPES = [
    { value: 'meeting', labelRu: 'Собрание', labelEn: 'Meeting' },
    { value: 'gathering', labelRu: 'Встреча', labelEn: 'Gathering' },
    { value: 'school_event', labelRu: 'Школьное событие', labelEn: 'School event' },
    { value: 'other', labelRu: 'Другое', labelEn: 'Other' },
];

const TARGET_AUDIENCE_OPTIONS = [
    { value: 'all', labelRu: 'Для всех', labelEn: 'For everyone' },
    { value: 'teachers', labelRu: 'Для учителей', labelEn: 'For teachers' },
    { value: 'class', labelRu: 'Для класса', labelEn: 'For class' },
    { value: 'specific', labelRu: 'Выбранным пользователям', labelEn: 'Specific users' },
];

export default function CreateEventModal({
    isOpen,
    onClose,
    onSuccess,
    initialStart,
    initialEnd,
}: CreateEventModalProps) {
    const { t, locale } = useLocale();
    const isRu = locale === 'ru';
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroupOption[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<UserOption[]>([]);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('meeting');
    const [startAt, setStartAt] = useState(nowToDatetimeLocalInAppZone);
    const [endAt, setEndAt] = useState(() => {
        const end = new Date(Date.now() + 60 * 60 * 1000);
        return utcIsoToDatetimeLocalValue(end.toISOString());
    });
    const [isAllDay, setIsAllDay] = useState(false);
    const [location, setLocation] = useState('');
    const [targetAudience, setTargetAudience] = useState('all');
    const [subjectGroupId, setSubjectGroupId] = useState<number | ''>('');
    const targetUserIds = selectedUsers.map((u) => u.id);

    useEffect(() => {
        if (initialStart) setStartAt(utcIsoToDatetimeLocalValue(initialStart));
        if (initialEnd) setEndAt(utcIsoToDatetimeLocalValue(initialEnd));
    }, [initialStart, initialEnd]);

    useEffect(() => {
        if (!isOpen) return;
        setSubmitError(null);
        setSelectedUsers([]);
        setUserSearchQuery('');
        setUserSearchResults([]);
        axiosInstance.get('/subject-groups/').then((r) => {
            const data = r.data?.results ?? r.data ?? [];
            setSubjectGroups(Array.isArray(data) ? data : []);
        }).catch(() => {});
    }, [isOpen]);

    const searchUsers = useCallback(async (query: string) => {
        const q = (query || '').trim();
        if (!q || q.length < 2) {
            setUserSearchResults([]);
            return;
        }
        setUserSearchLoading(true);
        try {
            const r = await axiosInstance.get('/users/', { params: { search: q } });
            const data = r.data?.results ?? r.data ?? [];
            setUserSearchResults(Array.isArray(data) ? data : []);
        } catch {
            setUserSearchResults([]);
        } finally {
            setUserSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchUsers(userSearchQuery), 300);
        return () => clearTimeout(t);
    }, [userSearchQuery, searchUsers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (targetAudience === 'specific' && targetUserIds.length === 0) {
            setSubmitError(isRu ? 'Выберите хотя бы одного пользователя' : 'Select at least one user');
            return;
        }
        if (targetAudience === 'class' && !subjectGroupId) {
            setSubmitError(isRu ? 'Выберите класс' : 'Select a class');
            return;
        }
        setLoading(true);
        try {
            const startISO = datetimeLocalValueToUtcIso(startAt);
            const endISO = datetimeLocalValueToUtcIso(endAt);
            if (!startISO || !endISO) {
                setSubmitError(isRu ? 'Некорректная дата или время' : 'Invalid date or time');
                return;
            }
            const payload: CreateEventPayload = {
                title: title.trim(),
                description: description.trim(),
                type,
                start_at: startISO,
                end_at: endISO,
                is_all_day: isAllDay,
                location: location.trim(),
                target_audience: targetAudience,
            };
            if (targetAudience === 'class' && subjectGroupId) {
                payload.subject_group = Number(subjectGroupId);
            }
            if (targetAudience === 'specific' && targetUserIds.length) {
                payload.target_users = targetUserIds;
            }
            await axiosInstance.post('/events/', payload);
            onClose();
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.response?.data?.title?.[0] || err?.message || 'Ошибка создания события';
            setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    const addUser = (u: UserOption) => {
        if (selectedUsers.some((x) => x.id === u.id)) return;
        setSelectedUsers((prev) => [...prev, u]);
        setUserSearchQuery('');
        setUserSearchResults([]);
    };
    const removeUser = (id: number) => {
        setSelectedUsers((prev) => prev.filter((x) => x.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isRu ? 'Создать событие' : 'Create event'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isRu ? 'Название' : 'Title'} *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder={isRu ? 'Собрание, встреча...' : 'Meeting, gathering...'}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isRu ? 'Категория' : 'Category'}
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                        >
                            {EVENT_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {isRu ? opt.labelRu : opt.labelEn}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isRu ? 'Описание / причина' : 'Description / reason'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            placeholder={isRu ? 'Можно вписать свою причину' : 'Optional custom reason'}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isRu ? 'Начало' : 'Start'} *
                            </label>
                            <AppZoneDateTimePicker
                                value={startAt}
                                onChange={setStartAt}
                                uiLocale={locale}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                popperClassName="z-[500]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isRu ? 'Окончание' : 'End'} *
                            </label>
                            <AppZoneDateTimePicker
                                value={endAt}
                                onChange={setEndAt}
                                uiLocale={locale}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                popperClassName="z-[500]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="all_day"
                            checked={isAllDay}
                            onChange={(e) => setIsAllDay(e.target.checked)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <label htmlFor="all_day" className="text-sm text-gray-700">
                            {isRu ? 'Весь день' : 'All day'}
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isRu ? 'Место' : 'Location'}
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            placeholder={isRu ? 'Кабинет, зал...' : 'Room, hall...'}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isRu ? 'Кому показывать' : 'Target audience'}
                        </label>
                        <select
                            value={targetAudience}
                            onChange={(e) => {
                                setTargetAudience(e.target.value);
                                setSubjectGroupId('');
                                setSelectedUsers([]);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                        >
                            {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {isRu ? opt.labelRu : opt.labelEn}
                                </option>
                            ))}
                        </select>
                    </div>
                    {targetAudience === 'class' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isRu ? 'Класс' : 'Class'}
                            </label>
                            <select
                                value={subjectGroupId}
                                onChange={(e) => setSubjectGroupId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="">—</option>
                                {subjectGroups.map((sg) => (
                                    <option key={sg.id} value={sg.id}>
                                        {sg.classroom_display ?? ''} {sg.course_name ? `— ${sg.course_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {targetAudience === 'specific' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isRu ? 'Пользователи' : 'Users'}
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                {isRu ? 'Поиск по имени, фамилии или username — выберите из списка' : 'Search by name or username — select from list'}
                            </p>
                            <div className="relative">
                                <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                                    <Search className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        placeholder={isRu ? 'Имя, фамилия, username...' : 'Name, username...'}
                                        className="flex-1 px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-violet-500 focus:ring-inset"
                                    />
                                </div>
                                {userSearchResults.length > 0 && (
                                    <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {userSearchResults.map((u) => (
                                            <li key={u.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => addUser(u)}
                                                    disabled={selectedUsers.some((x) => x.id === u.id)}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                                                >
                                                    <span>{u.first_name} {u.last_name} ({u.username}) — {u.role}</span>
                                                    {selectedUsers.some((x) => x.id === u.id) && (
                                                        <span className="text-violet-600 text-xs">{isRu ? 'добавлен' : 'added'}</span>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {userSearchLoading && (
                                    <p className="text-xs text-gray-500 mt-1">{isRu ? 'Поиск...' : 'Searching...'}</p>
                                )}
                            </div>
                            {selectedUsers.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedUsers.map((u) => (
                                        <span
                                            key={u.id}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-800 rounded-md text-sm"
                                        >
                                            {u.first_name} {u.last_name} ({u.username})
                                            <button
                                                type="button"
                                                onClick={() => removeUser(u.id)}
                                                className="p-0.5 rounded hover:bg-violet-200"
                                                aria-label={isRu ? 'Удалить' : 'Remove'}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {submitError && (
                        <p className="text-sm text-red-600">{submitError}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            {isRu ? 'Отмена' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                        >
                            {loading ? (isRu ? 'Создание...' : 'Creating...') : isRu ? 'Создать' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
