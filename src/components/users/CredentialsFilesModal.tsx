'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCcw, FileSpreadsheet, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';

interface CredentialsFile {
    filename: string;
    url: string;
    created_at: string;
    size: number;
}

interface ResponseData {
    students: CredentialsFile[];
    teachers: CredentialsFile[];
}

interface School {
    id: number;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function CredentialsFilesModal({ isOpen, onClose }: Props) {
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number>(0);
    const [data, setData] = useState<ResponseData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            void loadSchools();
        }
    }, [isOpen]);

    const loadSchools = async () => {
        try {
            const resp = await axiosInstance.get('/schools/');
            const list: School[] = Array.isArray(resp.data)
                ? resp.data
                : resp.data.results || [];
            setSchools(list);
            if (list.length > 0 && !selectedSchoolId) {
                setSelectedSchoolId(list[0].id);
                void load(list[0].id);
            }
        } catch (err) {
            console.error('Error loading schools for credentials modal', err);
            setError('Не удалось загрузить список школ.');
        }
    };

    const load = async (schoolId: number) => {
        if (!schoolId) return;
        setLoading(true);
        setError(null);
        try {
            const resp = await axiosInstance.get<ResponseData>(`/schools/${schoolId}/credentials-files/`);
            setData(resp.data);
        } catch (err: any) {
            console.error('Error loading credentials files', err);
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.detail ||
                'Не удалось загрузить список файлов с логинами и паролями.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (iso: string) => {
        return formatSchoolDateTime(iso, 'ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatSize = (bytes: number) => {
        if (bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let v = bytes;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i += 1;
        }
        return `${v.toFixed(1)} ${units[i]}`;
    };

    if (!isOpen) return null;

    const hasStudents = data && data.students.length > 0;
    const hasTeachers = data && data.teachers.length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Файлы с логинами и паролями"
            maxWidth="max-w-3xl"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                            Здесь можно скачать все ранее сгенерированные Excel-файлы с логинами и
                            паролями.
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Школа:</span>
                            <select
                                value={selectedSchoolId}
                                onChange={e => {
                                    const id = Number(e.target.value);
                                    setSelectedSchoolId(id);
                                    setData(null);
                                    if (id) void load(id);
                                }}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {schools.length === 0 ? (
                                    <option value={0}>Загрузка школ...</option>
                                ) : (
                                    <>
                                        <option value={0}>Выберите школу</option>
                                        {schools.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => selectedSchoolId && load(selectedSchoolId)}
                        disabled={loading || !selectedSchoolId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Обновить
                    </button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                        Загрузка...
                    </div>
                )}

                {!loading && data && !hasStudents && !hasTeachers && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                        <FileSpreadsheet className="w-10 h-10 mb-2 text-gray-300" />
                        <p>Пока нет ни одного сгенерированного файла с логинами и паролями.</p>
                    </div>
                )}

                {!loading && data && (hasStudents || hasTeachers) && (
                    <div className="space-y-6">
                        {hasStudents && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Ученики</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-gray-600">Файл</th>
                                                <th className="px-3 py-2 text-left text-gray-600">Создан</th>
                                                <th className="px-3 py-2 text-left text-gray-600">Размер</th>
                                                <th className="px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.students.map((f) => (
                                                <tr key={f.filename}>
                                                    <td className="px-3 py-2 font-mono text-[11px] text-gray-800">
                                                        {f.filename}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {formatDate(f.created_at)}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-500">
                                                        {formatSize(f.size)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <a
                                                            href={f.url}
                                                            download
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            Скачать
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {hasTeachers && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Учителя</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-gray-600">Файл</th>
                                                <th className="px-3 py-2 text-left text-gray-600">Создан</th>
                                                <th className="px-3 py-2 text-left text-gray-600">Размер</th>
                                                <th className="px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.teachers.map((f) => (
                                                <tr key={f.filename}>
                                                    <td className="px-3 py-2 font-mono text-[11px] text-gray-800">
                                                        {f.filename}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {formatDate(f.created_at)}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-500">
                                                        {formatSize(f.size)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <a
                                                            href={f.url}
                                                            download
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            Скачать
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

