"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { formatSchoolDateTime } from "@/lib/formatSchoolDateTime";
import { useUserState } from "@/contexts/UserContext";

type AttendanceStatus = "present" | "excused" | "absent";

interface AttendanceRecordItem {
  id: number;
  status: AttendanceStatus;
  notes: string | null;
  attendance: {
    taken_at: string;
    subject_group_name: string;
    course_name: string;
    classroom_name: string;
    taken_by_username: string | null;
  };
}

export default function ParentChildAttendancePage() {
  const params = useParams<{ childId: string }>();
  const childId = Number(params.childId);
  const { user } = useUserState();

  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user || !childId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await axiosInstance.get(
          `/attendance/student-history/`,
          { params: { student_id: childId } }
        );
        setRecords(res.data as AttendanceRecordItem[]);
      } catch (e) {
        console.error("Failed to load attendance for parent:", e);
        setError("Не удалось загрузить посещаемость ребёнка.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user, childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const excused = records.filter((r) => r.status === "excused").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const attendancePercentage =
    total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Посещаемость ребёнка
        </h1>
        <p className="text-gray-600 text-sm">
          История посещения уроков с разбивкой по предметам и статусам.
        </p>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Всего уроков</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Присутствовал</p>
          <p className="text-2xl font-bold text-emerald-700">{present}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">С уважительной</p>
          <p className="text-2xl font-bold text-amber-700">{excused}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Отсутствовал</p>
          <p className="text-2xl font-bold text-red-700">{absent}</p>
          <p className="text-xs text-gray-500 mt-1">
            Посещаемость: {attendancePercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Таблица записей */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          История посещаемости
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-gray-600">
            Пока нет данных о посещаемости.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left text-gray-500 font-medium">
                    Дата и время
                  </th>
                  <th className="py-2 px-4 text-left text-gray-500 font-medium">
                    Предмет
                  </th>
                  <th className="py-2 px-4 text-left text-gray-500 font-medium">
                    Класс
                  </th>
                  <th className="py-2 px-4 text-left text-gray-500 font-medium">
                    Статус
                  </th>
                  <th className="py-2 pl-4 text-left text-gray-500 font-medium">
                    Примечание
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-900">
                      {formatSchoolDateTime(r.attendance.taken_at, "ru-RU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-4 text-gray-900">
                      {r.attendance.course_name}
                    </td>
                    <td className="py-2 px-4 text-gray-700">
                      {r.attendance.classroom_name}
                    </td>
                    <td className="py-2 px-4">
                      {r.status === "present" && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Присутствовал
                        </span>
                      )}
                      {r.status === "excused" && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          С уважительной
                        </span>
                      )}
                      {r.status === "absent" && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Отсутствовал
                        </span>
                      )}
                    </td>
                    <td className="py-2 pl-4 text-gray-700">
                      {r.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

