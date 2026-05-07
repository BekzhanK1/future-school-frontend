'use client';
import { useState, useEffect, useContext } from 'react';
import axiosInstance from '@/lib/axios';
import { formatSchoolDate } from '@/lib/formatSchoolDateTime';
import { SubjectContext } from '../layout';
import { useParams } from 'next/navigation';

interface Student {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
}

interface AttendanceRecord {
    student: number;
    status: 'present' | 'excused' | 'not_present';
    notes: string;
}

export default function LessonDay({ data }: { data: any }) {
    const [open, setOpen] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const { subjectGroupMembers } = useContext(SubjectContext);
    const { students } = subjectGroupMembers;
    const subjectId = useParams().id;
    console.log(students, 'students');
    console.log(attendance, 'attendance');

    useEffect(() => {
        if (students && students.length > 0 && data.records.length === 0) {
            const initialAttendance: AttendanceRecord[] = students.map(
                student => ({
                    student: student.id,
                    status: '',
                    notes: '',
                })
            );
            setAttendance(initialAttendance);
        } else if (students && students.length > 0) {
            setAttendance(data.records);
        }
    }, [students]);

    const handleAttendanceChange = (
        studentId: number,
        field: keyof AttendanceRecord,
        value: boolean | string
    ) => {
        setAttendance(prev =>
            prev.map(record =>
                record.student === studentId
                    ? { ...record, [field]: value }
                    : record
            )
        );
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.put(
                `/attendance/${data.id}/`,
                {
                    subject_group: subjectId,
                    records: attendance,
                }
            );
            console.log('Attendance saved:', response.data);
            setOpen(false);
        } catch (error) {
            console.error('Error saving attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 flex items-center justify-between">
                <div className="text-gray-900 text-xl font-inter font-semibold">
                    Урок -{' '}
                    {data.taken_at
                        ? formatSchoolDate(data.taken_at, 'ru-RU', {
                              day: 'numeric',
                              month: 'long',
                          })
                        : 'Дата не указана'}
                </div>
                <button
                    className="bg-[#694CFD] flex items-center gap-2 px-4 py-1 rounded-md transition-colors text-white font-bold hover:bg-purple-700"
                    onClick={() => setOpen(!open)}
                >
                    {open ? 'Закрыть' : 'Взять участие'}
                </button>
            </div>

            {open && (
                <div className="border-t border-gray-200 p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Посещаемость
                        </h3>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                                        Участники
                                    </th>
                                    <th className="text-center py-2 px-3 font-semibold text-gray-900">
                                        Присутствовал
                                    </th>
                                    <th className="text-center py-2 px-3 font-semibold text-gray-900">
                                        Отсутствовал
                                    </th>
                                    <th className="text-center py-2 px-3 font-semibold text-gray-900">
                                        Уважительная причина
                                    </th>
                                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                                        Примечания
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {students?.map(student => {
                                    const record = attendance.find(
                                        a => a.student === student.id
                                    );
                                    return (
                                        <tr
                                            key={student.id}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-gray-900">
                                                    {student.first_name}{' '}
                                                    {student.last_name}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="radio"
                                                    name={`status-${student.id}`}
                                                    checked={
                                                        record?.status ===
                                                        'present'
                                                    }
                                                    onChange={() =>
                                                        handleAttendanceChange(
                                                            student.id,
                                                            'status',
                                                            'present'
                                                        )
                                                    }
                                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="radio"
                                                    name={`status-${student.id}`}
                                                    checked={
                                                        record?.status ===
                                                        'not_present'
                                                    }
                                                    onChange={() =>
                                                        handleAttendanceChange(
                                                            student.id,
                                                            'status',
                                                            'not_present'
                                                        )
                                                    }
                                                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="radio"
                                                    name={`status-${student.id}`}
                                                    checked={
                                                        record?.status ===
                                                        'excused'
                                                    }
                                                    onChange={() =>
                                                        handleAttendanceChange(
                                                            student.id,
                                                            'status',
                                                            'excused'
                                                        )
                                                    }
                                                    className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                                                />
                                            </td>
                                            <td className="py-3 px-3">
                                                <input
                                                    type="text"
                                                    value={record?.notes || ''}
                                                    onChange={e =>
                                                        handleAttendanceChange(
                                                            student.id,
                                                            'notes',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Примечания..."
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
