'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar, Search, Plus, X, Edit2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useSubject } from '../../layout';
import AttendanceModal from '@/components/modals/AttendanceModal';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDate, formatSchoolTime } from '@/lib/formatSchoolDateTime';

interface AttendanceRecord {
    id: number;
    student: number;
    student_username: string;
    student_first_name: string;
    student_last_name: string;
    status: 'present' | 'excused' | 'not_present';
    notes?: string;
}

interface AttendanceSession {
    id: number;
    subject_group: number;
    taken_at: string;
    taken_by: number;
    notes: string;
    records: AttendanceRecord[];
}

interface ManualGrade {
    id: number;
    student: number;
    subject_group: number;
    value: number;
    max_value: number;
    graded_at: string;
}

const STATUS_META = {
    present:     { label: 'Присутствовал',  short: 'П',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    excused:     { label: 'Уважительная',   short: 'У',  cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    not_present: { label: 'Отсутствовал',   short: 'Н',  cls: 'bg-red-100 text-red-800 border-red-200' },
};

export default function AttendancePage() {
    const { subject } = useSubject();
    const { t, locale } = useLocale();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [manualGrades, setManualGrades] = useState<ManualGrade[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceSession | null>(null);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [editDate, setEditDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        if (subject?.id) fetchAttendance();
    }, [subject?.id]);

    const fetchAttendance = async () => {
        if (!subject?.id) return;
        try {
            setLoading(true);
            const [attRes, gradesRes] = await Promise.all([
                axiosInstance.get(`/attendance/?subject_group=${subject.id}&limit=1000`),
                axiosInstance.get(`/manual-grades/?subject_group=${subject.id}&grade_type=lesson&limit=1000`),
            ]);
            const allSessions = attRes.data.results || attRes.data || [];
            setSessions(allSessions);
            setManualGrades(gradesRes.data.results || gradesRes.data || []);
            const today = new Date().toISOString().split('T')[0];
            const todaySessions = allSessions.filter((s: AttendanceSession) =>
                new Date(s.taken_at).toISOString().split('T')[0] === today
            );
            setTodayAttendance(todaySessions[0] ?? null);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const allRecords = sessions.flatMap(s => s.records);

    const studentStats = useMemo(() => {
        const map: Record<number, { id: number; name: string; username: string; total: number; present: number; excused: number; absent: number; pct: number }> = {};
        allRecords.forEach(r => {
            if (!map[r.student]) {
                map[r.student] = { id: r.student, name: `${r.student_last_name} ${r.student_first_name}`, username: r.student_username, total: 0, present: 0, excused: 0, absent: 0, pct: 0 };
            }
            const s = map[r.student];
            s.total++;
            if (r.status === 'present') s.present++;
            else if (r.status === 'excused') s.excused++;
            else s.absent++;
            s.pct = Math.round((s.present + s.excused) / s.total * 100);
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    }, [allRecords]);

    const gradesByDateAndStudent = useMemo(() => {
        const map: Record<string, Record<number, ManualGrade>> = {};
        manualGrades.forEach(g => {
            const d = new Date(g.graded_at).toISOString().split('T')[0];
            if (!map[d]) map[d] = {};
            map[d][g.student] = g;
        });
        return map;
    }, [manualGrades]);

    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
    );

    const overallPct = allRecords.length > 0
        ? Math.round((allRecords.filter(r => r.status === 'present').length + allRecords.filter(r => r.status === 'excused').length) / allRecords.length * 100)
        : 0;

    const localeStr = locale === 'en' ? 'en-GB' : 'ru-RU';

    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{t('attendancePage.title')}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{sessions.length} {t('attendancePage.daysCounted')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditDate(new Date());
                        todayAttendance ? setIsConfirmModalOpen(true) : setIsAttendanceModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('attendancePage.takeAttendance')}
                </button>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: t('attendancePage.classAttendance'), value: `${overallPct}%`, cls: 'text-violet-600' },
                    { label: t('attendancePage.present'), value: allRecords.filter(r => r.status === 'present').length, cls: 'text-emerald-600' },
                    { label: t('attendancePage.excused'), value: allRecords.filter(r => r.status === 'excused').length, cls: 'text-amber-600' },
                    { label: t('attendancePage.absent'), value: allRecords.filter(r => r.status === 'not_present').length, cls: 'text-red-600' },
                ].map(({ label, value, cls }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
                        <p className={`text-xl font-bold ${cls}`}>{value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                    </div>
                ))}
            </div>

            {/* Sessions table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-bold text-gray-800">{t('attendancePage.byDatesTitle')}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-50 bg-gray-50/60">
                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{t('attendancePage.columnDate')}</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-emerald-600 uppercase">П</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-amber-600 uppercase">У</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase">Н</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">%</th>
                                <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs">
                                        {t('attendancePage.noDatesData')}
                                    </td>
                                </tr>
                            ) : (
                                sortedSessions.map(session => {
                                    const present = session.records.filter(r => r.status === 'present').length;
                                    const excused = session.records.filter(r => r.status === 'excused').length;
                                    const absent = session.records.filter(r => r.status === 'not_present').length;
                                    const total = session.records.length;
                                    const pct = total > 0 ? Math.round((present + excused) / total * 100) : 0;
                                    return (
                                        <tr key={session.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-2.5 font-medium text-gray-900">
                                                {formatSchoolDate(session.taken_at, localeStr, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">{present}</td>
                                            <td className="px-3 py-2.5 text-center font-semibold text-amber-700">{excused}</td>
                                            <td className="px-3 py-2.5 text-center font-semibold text-red-600">{absent}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {pct}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <button
                                                    onClick={() => setSelectedSession(session)}
                                                    className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                                                >
                                                    {t('attendancePage.viewDetails')}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student summary */}
            {studentStats.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-800">По ученикам</span>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('participantsPage.searchPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/60">
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Ученик</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-emerald-600">П</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-amber-600">У</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-red-500">Н</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Всего</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentStats
                                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-gray-900">{s.name}</p>
                                            </td>
                                            <td className="px-3 py-2 text-center font-semibold text-emerald-700">{s.present}</td>
                                            <td className="px-3 py-2 text-center font-semibold text-amber-700">{s.excused}</td>
                                            <td className="px-3 py-2 text-center font-semibold text-red-600">{s.absent}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{s.total}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`text-xs font-bold ${s.pct >= 80 ? 'text-emerald-600' : s.pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {s.pct}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Attendance modal */}
            <AttendanceModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                subjectGroupId={Number(subject?.id) || 0}
                onSuccess={fetchAttendance}
                initialDate={editDate}
            />

            {/* Confirm re-take today modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-2">{t('attendancePage.confirmTitle')}</h2>
                        <p className="text-sm text-gray-600 mb-1">
                            {t('attendancePage.confirmText', {
                                time: todayAttendance
                                    ? formatSchoolTime(todayAttendance.taken_at, localeStr, { hour: '2-digit', minute: '2-digit' })
                                    : '',
                            })}
                        </p>
                        <p className="text-xs text-gray-400 mb-5">{t('attendancePage.confirmHint')}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                                {t('attendancePage.confirmCancel')}
                            </button>
                            <button
                                onClick={() => { setIsConfirmModalOpen(false); setIsAttendanceModalOpen(true); }}
                                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                                {t('attendancePage.confirmContinue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session detail modal */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">
                                    {formatSchoolDate(selectedSession.taken_at, localeStr, { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {formatSchoolTime(selectedSession.taken_at, localeStr, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditDate(new Date(selectedSession.taken_at));
                                        setSelectedSession(null);
                                        setIsAttendanceModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Редактировать
                                </button>
                                <button onClick={() => setSelectedSession(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Summary pills */}
                        <div className="flex gap-2 px-6 py-3 border-b border-gray-50">
                            {(['present','excused','not_present'] as const).map(status => {
                                const count = selectedSession.records.filter(r => r.status === status).length;
                                const meta = STATUS_META[status];
                                return (
                                    <span key={status} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${meta.cls}`}>
                                        {meta.label}: {count}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Records table */}
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{t('attendancePage.columnStudent')}</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">{t('attendancePage.columnStatus')}</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">ФО</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{t('attendancePage.columnNote')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedSession.records.map(record => {
                                        const dateStr = new Date(selectedSession.taken_at).toISOString().split('T')[0];
                                        const grade = gradesByDateAndStudent[dateStr]?.[record.student];
                                        const meta = STATUS_META[record.status];
                                        return (
                                            <tr key={record.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-2.5">
                                                    <p className="font-medium text-gray-900">{record.student_first_name} {record.student_last_name}</p>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${meta.cls}`}>
                                                        {meta.short}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {grade
                                                        ? <span className="font-bold text-gray-900">{grade.value}/{grade.max_value}</span>
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{record.notes || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedSession(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium">
                                {t('attendancePage.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
