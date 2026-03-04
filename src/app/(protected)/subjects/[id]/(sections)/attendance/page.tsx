'use client';

import { useEffect, useState } from 'react';
import {
    Users,
    BarChart3,
    TrendingUp,
    Calendar,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    Plus,
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useSubject } from '../../layout';
import AttendanceModal from '@/components/modals/AttendanceModal';
import { useLocale } from '@/contexts/LocaleContext';

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

interface StudentStats {
    student_id: number;
    student_username: string;
    student_first_name: string;
    student_last_name: string;
    total: number;
    present: number;
    excused: number;
    not_present: number;
    percentage: number;
}

interface AttendanceDate {
    date: string;
    total_present: number;
    total_excused: number;
    total_not_present: number;
    total_students: number;
    percentage: number;
}

export default function AttendancePage() {
    const { subject } = useSubject();
    const { t, locale } = useLocale();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'percentage'>('percentage');
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceSession | null>(null);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);

    useEffect(() => {
        if (subject?.id) {
            fetchAttendance();
        }
    }, [subject?.id]);

    const fetchAttendance = async () => {
        if (!subject?.id) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/attendance/?subject_group=${subject.id}`);
            const allSessions = response.data.results || response.data || [];
            setSessions(allSessions);
            
            // Check if attendance was taken today
            const today = new Date().toISOString().split('T')[0];
            const todaySessions = allSessions.filter((session: AttendanceSession) => {
                const sessionDate = new Date(session.taken_at).toISOString().split('T')[0];
                return sessionDate === today;
            });
            // Set todayAttendance to first session of today, or null if no sessions
            setTodayAttendance(todaySessions.length > 0 ? todaySessions[0] : null);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    // Flatten all records from all sessions
    const allRecords: AttendanceRecord[] = [];
    sessions.forEach(session => {
        session.records.forEach(record => {
            allRecords.push(record);
        });
    });

    // Calculate student statistics
    const studentStats: { [key: number]: StudentStats } = {};
    allRecords.forEach(record => {
        if (!studentStats[record.student]) {
            studentStats[record.student] = {
                student_id: record.student,
                student_username: record.student_username,
                student_first_name: record.student_first_name,
                student_last_name: record.student_last_name,
                total: 0,
                present: 0,
                excused: 0,
                not_present: 0,
                percentage: 0,
            };
        }
        const stats = studentStats[record.student];
        stats.total++;
        if (record.status === 'present') stats.present++;
        else if (record.status === 'excused') stats.excused++;
        else stats.not_present++;
        stats.percentage = stats.total > 0 ? Math.round((stats.present + stats.excused) / stats.total * 100) : 0;
    });

    // Calculate date statistics
    const dateStats: { [key: string]: AttendanceDate } = {};
    sessions.forEach(session => {
        const date = new Date(session.taken_at).toISOString().split('T')[0];
        if (!dateStats[date]) {
            dateStats[date] = {
                date: date,
                total_present: 0,
                total_excused: 0,
                total_not_present: 0,
                total_students: 0,
                percentage: 0,
            };
        }
        session.records.forEach(record => {
            const stats = dateStats[date];
            stats.total_students++;
            if (record.status === 'present') stats.total_present++;
            else if (record.status === 'excused') stats.total_excused++;
            else stats.total_not_present++;
            stats.percentage = stats.total_students > 0 ? Math.round((stats.total_present + stats.total_excused) / stats.total_students * 100) : 0;
        });
    });

    const dates = Object.values(dateStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const students = Object.values(studentStats)
        .filter(student => {
            const fullName = `${student.student_first_name} ${student.student_last_name}`.toLowerCase();
            const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                student.student_username.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'percentage') return b.percentage - a.percentage;
            const aName = `${a.student_first_name} ${a.student_last_name}`;
            const bName = `${b.student_first_name} ${b.student_last_name}`;
            return aName.localeCompare(bName);
        });

    // Overall stats
    const totalRecords = allRecords.length;
    const totalPresent = allRecords.filter(r => r.status === 'present').length;
    const totalExcused = allRecords.filter(r => r.status === 'excused').length;
    const totalNotPresent = allRecords.filter(r => r.status === 'not_present').length;
    const overallPercentage = totalRecords > 0 ? Math.round((totalPresent + totalExcused) / totalRecords * 100) : 0;
    const uniqueDates = dates.length;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="px-4">
            {/* Header with Button */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">
                        {t('attendancePage.title')}
                    </h1>
                </div>
                <button
                    onClick={() => {
                        if (todayAttendance) {
                            setIsConfirmModalOpen(true);
                        } else {
                            setIsAttendanceModalOpen(true);
                        }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        todayAttendance !== null
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    <Plus className="w-5 h-5" />
                    {t('attendancePage.takeAttendance')}
                </button>
            </div>

            {/* Overall Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-600 mb-1">
                        {t('attendancePage.classAttendance')}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">{overallPercentage}%</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-600 mb-1">
                        {t('attendancePage.present')}
                    </p>
                    <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-600 mb-1">
                        {t('attendancePage.excused')}
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">{totalExcused}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-600 mb-1">
                        {t('attendancePage.absent')}
                    </p>
                    <p className="text-2xl font-bold text-red-600">{totalNotPresent}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-600 mb-1">
                        {t('attendancePage.daysCounted')}
                    </p>
                    <p className="text-2xl font-bold text-purple-600">{uniqueDates}</p>
                </div>
            </div>

            {/* Student Statistics Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        {t('attendancePage.studentStatsTitle')}
                    </h2>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('attendancePage.searchPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="percentage">
                                {t('attendancePage.sortByAttendance')}
                            </option>
                            <option value="name">
                                {t('attendancePage.sortByName')}
                            </option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Студент</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">
                                    {t('attendancePage.columnCount')}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">✓</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">○</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">✗</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">Процент</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        {t('attendancePage.noStudentData')}
                                    </td>
                                </tr>
                            ) : (
                                students.map((student, idx) => (
                                    <tr key={student.student_id} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{student.student_first_name} {student.student_last_name}</p>
                                                <p className="text-xs text-gray-500">@{student.student_username}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-700">{student.total}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {student.present}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                                <Clock className="w-3 h-3" />
                                                {student.excused}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                                <XCircle className="w-3 h-3" />
                                                {student.not_present}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${
                                                            student.percentage >= 80
                                                                ? 'bg-green-600'
                                                                : student.percentage >= 60
                                                                  ? 'bg-yellow-600'
                                                                  : 'bg-red-600'
                                                        }`}
                                                        style={{ width: `${student.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-bold text-gray-900 w-8 text-right">{student.percentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Attendance Dates */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        {t('attendancePage.historyTitle')}
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                                    {t('attendancePage.columnDateTime')}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">✓</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">○</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">✗</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">
                                    {t('attendancePage.columnTotal')}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">Процент</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        {t('attendancePage.noDates')}
                                    </td>
                                </tr>
                            ) : (
                                dates.map((date, idx) => (
                                    <tr key={date.date} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            <div className="flex flex-col gap-1">
                                                <span>{new Date(date.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {sessions
                                                        .filter(session => {
                                                            const sessionDate = new Date(session.taken_at).toISOString().split('T')[0];
                                                            return sessionDate === date.date;
                                                        })
                                                        .map(session => {
                                                            const time = new Date(session.taken_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                                                            return (
                                                                <button
                                                                    key={session.id}
                                                                    onClick={() => {
                                                                        setSelectedSession(session);
                                                                        setIsSessionDetailOpen(true);
                                                                    }}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded"
                                                                >
                                                                    {time}
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {date.total_present}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                                <Clock className="w-3 h-3" />
                                                {date.total_excused}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                                <XCircle className="w-3 h-3" />
                                                {date.total_not_present}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-700 font-medium">{date.total_students}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${
                                                            date.percentage >= 80
                                                                ? 'bg-green-600'
                                                                : date.percentage >= 60
                                                                  ? 'bg-yellow-600'
                                                                  : 'bg-red-600'
                                                        }`}
                                                        style={{ width: `${date.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-bold text-gray-900 w-8 text-right">{date.percentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Attendance Modal */}
            <AttendanceModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                subjectGroupId={Number(subject?.id) || 0}
                onSuccess={fetchAttendance}
            />

            {/* Confirm Attendance Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            ⚠️ {t('attendancePage.confirmTitle')}
                        </h2>
                        <p className="text-gray-600 mb-4">
                            {t('attendancePage.confirmText', {
                                time: todayAttendance
                                    ? new Date(
                                          todayAttendance.taken_at
                                      ).toLocaleTimeString(
                                          locale === 'en' ? 'en-GB' : 'ru-RU',
                                          { hour: '2-digit', minute: '2-digit' }
                                      )
                                    : '',
                            })}
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            {t('attendancePage.confirmHint')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                {t('attendancePage.confirmCancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setIsAttendanceModalOpen(true);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                {t('attendancePage.confirmContinue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Detail Modal */}
            {isSessionDetailOpen && selectedSession && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {t('attendancePage.sessionTitle', {
                                    date: new Date(
                                        selectedSession.taken_at
                                    ).toLocaleDateString(
                                        locale === 'en' ? 'en-GB' : 'ru-RU'
                                    ),
                                    time: new Date(
                                        selectedSession.taken_at
                                    ).toLocaleTimeString(
                                        locale === 'en' ? 'en-GB' : 'ru-RU',
                                        { hour: '2-digit', minute: '2-digit' }
                                    ),
                                })}
                            </h2>
                            <button
                                onClick={() => setIsSessionDetailOpen(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">
                                    {t('attendancePage.teacherLabel')}
                                </span>{' '}
                                {selectedSession.taken_by}{' '}
                                (
                                {new Date(
                                    selectedSession.taken_at
                                ).toLocaleTimeString(
                                    locale === 'en' ? 'en-GB' : 'ru-RU',
                                    { hour: '2-digit', minute: '2-digit' }
                                )}
                                )
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-900">
                                            {t('attendancePage.columnStudent')}
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-900">
                                            {t('attendancePage.columnStatus')}
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-900">
                                            {t('attendancePage.columnNote')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSession.records.map(record => (
                                        <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">{record.student_first_name} {record.student_last_name}</p>
                                                    <p className="text-xs text-gray-500">@{record.student_username}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {record.status === 'present' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                        ✓ {t('attendancePage.statusPresent')}
                                                    </span>
                                                )}
                                                {record.status === 'excused' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                                        ○ {t('attendancePage.statusExcused')}
                                                    </span>
                                                )}
                                                {record.status === 'not_present' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                                        ✗ {t('attendancePage.statusAbsent')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {record.notes || t('attendancePage.noNote')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsSessionDetailOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                {t('attendancePage.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
