'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Calendar, MessageSquare } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Student {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
}

interface StudentAttendance {
    status: 'present' | 'excused' | 'not_present';
    notes: string;
    formativeGrade?: number | null;
}

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjectGroupId: number;
    onSuccess: () => void;
    initialDate?: Date;
}

export default function AttendanceModal({
    isOpen,
    onClose,
    subjectGroupId,
    onSuccess,
    initialDate,
}: AttendanceModalProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [attendance, setAttendance] = useState<Record<number, StudentAttendance>>({});
    const [date, setDate] = useState<Date | null>(initialDate || new Date());

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setAttendance({});
            const targetDate = initialDate || new Date();
            setDate(targetDate);
            fetchStudentsAndGrades(targetDate);
        }
    }, [isOpen, subjectGroupId, initialDate]);

    useEffect(() => {
        if (isOpen && date) {
            fetchStudentsAndGrades(date);
        }
    }, [date]);

    const fetchStudentsAndGrades = async (selectedDate: Date) => {
        try {
            setLoading(true);
            const [studentsRes, gradesRes] = await Promise.all([
                axiosInstance.get(`/subject-groups/${subjectGroupId}/members/`),
                axiosInstance.get(`/manual-grades/by-date/`, {
                    params: {
                        subject_group_id: subjectGroupId,
                        date: selectedDate.toISOString().split('T')[0]
                    }
                })
            ]);

            const allStudents = studentsRes.data.students || [];
            setStudents(allStudents);
            
            // Map existing grades
            const gradesMap: Record<number, number | null> = {};
            if (gradesRes.data) {
                gradesRes.data.forEach((grade: any) => {
                    gradesMap[grade.student] = grade.value;
                });
            }

            const newAttendance: Record<number, StudentAttendance> = {};
            allStudents.forEach((student: Student) => {
                // Keep the current UI state if the user already started editing, otherwise reset
                newAttendance[student.id] = {
                    status: 'present',
                    notes: '',
                    formativeGrade: gradesMap[student.id] ?? null,
                };
            });
            setAttendance(newAttendance);
        } catch (err) {
            console.error('Error fetching students and grades:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: number, status: 'present' | 'excused' | 'not_present') => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status,
                notes: status === 'excused' ? prev[studentId].notes : '',
            },
        }));
    };

    const handleNotesChange = (studentId: number, notes: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                notes,
            },
        }));
    };

    const handleGradeChange = (studentId: number, gradeStr: string) => {
        let val: number | null = null;
        if (gradeStr.trim() !== '') {
            val = parseInt(gradeStr, 10);
            if (isNaN(val) || val < 0) val = 0;
            if (val > 10) val = 10;
        }

        setAttendance(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                formativeGrade: val,
            },
        }));
    };

    const handleSubmit = async () => {
        if (!date) {
            alert('Выберите дату');
            return;
        }

        setSubmitting(true);
        try {
            // Prepare records array
            const records = students.map(student => {
                const studentAttendance = attendance[student.id] || { status: 'present', notes: '' };
                return {
                    student: student.id,
                    status: studentAttendance.status,
                    notes: studentAttendance.status === 'excused' ? studentAttendance.notes : '',
                };
            });

            const dateStr = date.toISOString().split('T')[0];

            // Formative assessment bulk create payload
            const gradesPayload = {
                subject_group_id: subjectGroupId,
                graded_at: dateStr,
                grades: students.map(student => {
                    const studentAttendance = attendance[student.id] || {};
                    return {
                        student_id: student.id,
                        value: studentAttendance.formativeGrade ?? null,
                        max_value: 10,
                    };
                }),
            };

            // Send both requests parallelly
            await Promise.all([
                axiosInstance.post('/attendance/', {
                    subject_group: subjectGroupId,
                    notes: '',
                    taken_at: dateStr + 'T12:00:00Z', // Adjust as needed
                    records: records,
                }),
                axiosInstance.post('/manual-grades/bulk-create-or-update/', gradesPayload)
            ]);
            
            alert('✅ Посещаемость и ФО успешно сохранены!');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error submitting records:', err);
            alert('❌ Ошибка при сохранении: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present':
                return 'border-green-300 bg-green-50';
            case 'excused':
                return 'border-yellow-300 bg-yellow-50';
            case 'not_present':
                return 'border-red-300 bg-red-50';
            default:
                return 'border-gray-300 bg-white';
        }
    };

    const presentCount = Object.values(attendance).filter(s => s.status === 'present').length;
    const excusedCount = Object.values(attendance).filter(s => s.status === 'excused').length;
    const notPresentCount = Object.values(attendance).filter(s => s.status === 'not_present').length;

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Взять посещаемость и ФО" maxWidth="max-w-5xl">
            <div className="space-y-4 max-h-[80vh] flex flex-col">
                {/* Date Picker */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Дата <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                        <DatePicker
                            selected={date}
                            onChange={(d: Date | null) => setDate(d)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-700 font-medium">Присутствовали</p>
                        <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-yellow-700 font-medium">Уважительная</p>
                        <p className="text-2xl font-bold text-yellow-600">{excusedCount}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-red-700 font-medium">Отсутствовали</p>
                        <p className="text-2xl font-bold text-red-600">{notPresentCount}</p>
                    </div>
                </div>

                {/* Students List */}
                <div className="flex-1 overflow-y-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Студенты ({students.length})
                    </label>
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Нет студентов
                            </div>
                        ) : (
                            students.map(student => (
                                <div
                                    key={student.id}
                                    className={`flex items-start gap-4 p-4 border rounded-lg bg-white transition-all ${getStatusColor(attendance[student.id]?.status)}`}
                                >
                                    {/* Student Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">
                                            {student.first_name} {student.last_name}
                                        </p>
                                        <p className="text-sm text-gray-500">@{student.username}</p>
                                    </div>

                                    {/* Status Buttons */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleStatusChange(student.id, 'present')}
                                            className={`p-2 rounded transition-all ${
                                                attendance[student.id]?.status === 'present'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-white border border-green-300 text-green-600 hover:bg-green-50'
                                            }`}
                                            title="Присутствовал"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(student.id, 'excused')}
                                            className={`p-2 rounded transition-all ${
                                                attendance[student.id]?.status === 'excused'
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-white border border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                                            }`}
                                            title="Уважительная причина"
                                        >
                                            <AlertCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(student.id, 'not_present')}
                                            className={`p-2 rounded transition-all ${
                                                attendance[student.id]?.status === 'not_present'
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
                                            }`}
                                            title="Отсутствовал"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Notes Field - Only for excused */}
                                    {attendance[student.id]?.status === 'excused' && (
                                        <div className="w-64 flex-shrink-0">
                                            <div className="relative">
                                                <MessageSquare className="absolute left-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={attendance[student.id]?.notes || ''}
                                                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                                    placeholder="Причина..."
                                                    className="w-full pl-7 pr-2 py-1 text-sm border border-yellow-300 rounded bg-white focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Formative Grade Input */}
                                    <div className="flex-shrink-0 flex items-center gap-2 border-l pl-4 ml-4">
                                        <label className="text-sm text-gray-600 font-medium">ФО (из 10):</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={attendance[student.id]?.formativeGrade ?? ''}
                                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                            placeholder="Нет"
                                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-center"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            // Reset state when closing
                            setDate(new Date());
                            setAttendance({});
                            setStudents([]);
                            onClose();
                        }}
                        disabled={submitting}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
                    >
                        Отменить
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                    >
                        {submitting ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
