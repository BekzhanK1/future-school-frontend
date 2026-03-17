'use client';

import { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';

interface School {
    id: number;
    name: string;
}

interface ImportResult {
    success: boolean;
    message: string;
    summary: {
        total_classrooms: number;
        total_students: number;
        errors_count: number;
    };
    classrooms: Array<{
        class_name: string;
        students_count: number;
    }>;
    default_password: string;
    errors: Array<{
        row: number;
        error: string;
    }>;
    created_parent_username?: string;
    created_parent_password?: string;
    created_parents?: Array<{ username: string; password: string }>;
    credentials_file?: {
        path: string;
        url: string;
    };
}

interface PreviewData {
    preview: true;
    summary: {
        students_new: number;
        students_existing: number;
        parents_new: number;
        parents_existing: number;
        rows_count: number;
        errors_count: number;
    };
    rows: Array<{
        row: number;
        class_name: string;
        first_name: string;
        last_name: string;
        email?: string | null;
        student_status: 'new' | 'existing';
        parent_username: string | null;
        parent_status: string | null;
    }>;
    errors: Array<{ row: number; error: string }>;
}

interface ImportStudentsExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: () => void;
}

export default function ImportStudentsExcelModal({
    isOpen,
    onClose,
    onImportComplete,
}: ImportStudentsExcelModalProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<number>(0);
    const [file, setFile] = useState<File | null>(null);
    const [defaultPassword, setDefaultPassword] = useState<string>('qwerty123');
    const [loading, setLoading] = useState(false);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchSchools();
            setFile(null);
            setDefaultPassword('qwerty123');
            setPreviewData(null);
            setResult(null);
            setError(null);
            setSelectedSchool(0);
        }
    }, [isOpen]);

    // Load preview when file + school selected
    useEffect(() => {
        if (!file || !selectedSchool || !isOpen) {
            setPreviewData(null);
            return;
        }
        let cancelled = false;
        setLoadingPreview(true);
        setPreviewData(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('preview', '1');
        axiosInstance
            .post<PreviewData>(`/schools/${selectedSchool}/import-students-excel/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((res) => {
                if (!cancelled && res.data.preview) setPreviewData(res.data);
            })
            .catch(() => {
                if (!cancelled) setPreviewData(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingPreview(false);
            });
        return () => {
            cancelled = true;
        };
    }, [file, selectedSchool, isOpen]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const response = await axiosInstance.get('/schools/');
            const schoolsData = Array.isArray(response.data)
                ? response.data
                : response.data.results || [];
            setSchools(schoolsData);
            if (schoolsData.length > 0) {
                setSelectedSchool(schoolsData[0].id);
            }
        } catch (err) {
            console.error('Error fetching schools:', err);
            setError('Не удалось загрузить список школ');
        } finally {
            setLoadingSchools(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
                setError('Файл должен быть в формате Excel (.xlsx или .xls)');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedSchool) {
            setError('Выберите школу');
            return;
        }
        
        if (!file) {
            setError('Выберите файл Excel');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setPreviewData(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const passwordToSend = defaultPassword.trim() || 'qwerty123';
            formData.append('default_password', passwordToSend);

            const response = await axiosInstance.post(
                `/schools/${selectedSchool}/import-students-excel/`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 60000,
                }
            );

            setResult(response.data);
            if (onImportComplete) {
                onImportComplete();
            }
        } catch (err: any) {
            console.error('Error importing students:', err);

            let errorMessage = 'Не удалось импортировать студентов. Проверьте формат файла.';

            const data = err?.response?.data;
            if (data) {
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (typeof data.error === 'string') {
                    errorMessage = data.error;
                } else if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data) && data.length > 0) {
                    errorMessage = String(data[0]);
                } else if (typeof data === 'object') {
                    const firstKey = Object.keys(data)[0];
                    if (firstKey && data[firstKey]) {
                        errorMessage = Array.isArray(data[firstKey])
                            ? String(data[firstKey][0])
                            : String(data[firstKey]);
                    }
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Импорт студентов из Excel
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* School Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Школа <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedSchool}
                            onChange={(e) => setSelectedSchool(Number(e.target.value))}
                            disabled={loadingSchools || loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            {loadingSchools ? (
                                <option>Загрузка школ...</option>
                            ) : (
                                <>
                                    <option value={0}>Выберите школу</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>
                                            {school.name}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Файл Excel <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                            <div className="space-y-1 text-center">
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                    >
                                        <span>Выберите файл</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                            disabled={loading}
                                            className="sr-only"
                                        />
                                    </label>
                                    <p className="pl-1">или перетащите сюда</p>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Excel файл (.xlsx, .xls)
                                </p>
                                {file && (
                                    <p className="text-sm text-gray-700 mt-2">
                                        Выбран: <span className="font-medium">{file.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Обязательные колонки: <span className="font-mono">class_name</span>,{' '}
                            <span className="font-mono">first_name</span>,{' '}
                            <span className="font-mono">last_name</span>
                            <br />
                            Опциональные: <span className="font-mono">email</span>,{' '}
                            <span className="font-mono">phone_number</span>,{' '}
                            <span className="font-mono">parent_username</span> (по строке)
                        </p>
                    </div>

                    {/* Preview */}
                    {file && selectedSchool && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Превью</p>
                            {loadingPreview ? (
                                <p className="text-sm text-gray-500">Загрузка...</p>
                            ) : previewData ? (
                                <div className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <p className="text-gray-500">Новых учеников</p>
                                            <p className="font-semibold text-green-700">{previewData.summary.students_new}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Существующих</p>
                                            <p className="font-semibold text-blue-700">{previewData.summary.students_existing}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Новых родителей</p>
                                            <p className="font-semibold text-amber-700">{previewData.summary.parents_new}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Родителей есть</p>
                                            <p className="font-semibold text-gray-700">{previewData.summary.parents_existing}</p>
                                        </div>
                                    </div>
                                    {previewData.summary.errors_count > 0 && (
                                        <p className="text-amber-600">Ошибок в файле: {previewData.summary.errors_count}</p>
                                    )}
                                    {previewData.rows.length > 0 && (
                                        <>
                                            <p className="text-gray-500 mb-2">
                                                Строк к импорту: {previewData.summary.rows_count}
                                                {previewData.rows.length < previewData.summary.rows_count &&
                                                    ` (показаны первые ${previewData.rows.length})`}
                                            </p>
                                            <div className="border border-gray-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                                        <tr>
                                                            <th className="px-2 py-1 text-left">#</th>
                                                            <th className="px-2 py-1 text-left">Класс</th>
                                                            <th className="px-2 py-1 text-left">ФИО</th>
                                                            <th className="px-2 py-1 text-left">Email</th>
                                                            <th className="px-2 py-1 text-left">Статус ученика</th>
                                                            <th className="px-2 py-1 text-left">Родитель</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {previewData.rows.map((row, idx) => (
                                                            <tr
                                                                key={`${row.row}-${idx}`}
                                                                className={row.student_status === 'new'
                                                                    ? 'bg-green-50'
                                                                    : 'bg-blue-50'}
                                                            >
                                                                <td className="px-2 py-1 text-gray-500">{row.row}</td>
                                                                <td className="px-2 py-1 font-mono">{row.class_name}</td>
                                                                <td className="px-2 py-1">
                                                                    {row.last_name} {row.first_name}
                                                                </td>
                                                                <td className="px-2 py-1 text-gray-700">
                                                                    {row.email || '—'}
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    {row.student_status === 'new' ? (
                                                                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-green-100 text-green-800">
                                                                            Новый
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800">
                                                                            Уже в БД
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-1 text-gray-700">
                                                                    {row.parent_username
                                                                        ? `${row.parent_username}${row.parent_status ? ` (${row.parent_status})` : ''}`
                                                                        : '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {previewData.errors.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-xs font-medium text-amber-700 mb-1">
                                                        Ошибки при разборе файла (показаны первые {previewData.errors.length}):
                                                    </p>
                                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                                        {previewData.errors.map((err, idx) => (
                                                            <div
                                                                key={`${err.row}-${idx}`}
                                                                className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1"
                                                            >
                                                                <span className="font-semibold">Строка {err.row}:</span>{' '}
                                                                {err.error}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Default Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Пароль по умолчанию (для всех созданных учеников и новых родителей)
                        </label>
                        <input
                            type="text"
                            value={defaultPassword}
                            onChange={(e) => setDefaultPassword(e.target.value)}
                            disabled={loading}
                            placeholder="qwerty123"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>

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
                                        Импорт завершен успешно!
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-gray-600">Классов создано:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.total_classrooms}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Студентов создано:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.total_students}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Ошибок:</p>
                                        <p className="font-semibold text-gray-900">
                                            {result.summary.errors_count}
                                        </p>
                                    </div>
                                </div>

                                {result.default_password && (
                                    <div className="bg-white border border-green-300 rounded p-3 mt-3">
                                        <p className="text-xs text-gray-600 mb-1">
                                            Пароль для всех созданных студентов:
                                        </p>
                                        <p className="text-lg font-mono font-bold text-green-700">
                                            {result.default_password}
                                        </p>
                                    </div>
                                )}

                                {(result.created_parents?.length ?? 0) > 0 && (
                                    <div className="bg-amber-50 border border-amber-300 rounded p-3 mt-3 space-y-3">
                                        <p className="text-xs text-amber-800 font-medium">
                                            Созданы родители (username не существовал):
                                        </p>
                                        {result.created_parents!.map((p, idx) => (
                                            <div key={idx} className="bg-white/60 rounded p-2">
                                                <p className="font-mono font-semibold text-amber-900">{p.username}</p>
                                                <p className="text-xs text-amber-700 mt-0.5">Пароль: <span className="font-mono font-bold">{p.password}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {result.created_parent_username && result.created_parent_password && !result.created_parents?.length && (
                                    <div className="bg-amber-50 border border-amber-300 rounded p-3 mt-3">
                                        <p className="text-xs text-amber-800 mb-1">Создан родитель:</p>
                                        <p className="font-mono font-semibold text-amber-900">{result.created_parent_username}</p>
                                        <p className="text-xs text-amber-700 mt-1">Пароль: <span className="font-mono font-bold">{result.created_parent_password}</span></p>
                                    </div>
                                )}

                                {result.classrooms.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-gray-700 font-medium mb-2">
                                            Созданные классы:
                                        </p>
                                        <div className="space-y-1">
                                            {result.classrooms.map((cls, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between text-sm bg-white rounded p-2"
                                                >
                                                    <span className="font-medium">{cls.class_name}</span>
                                                    <span className="text-gray-600">
                                                        {cls.students_count} студентов
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.credentials_file && (
                                    <div className="mt-4">
                                        <a
                                            href={result.credentials_file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Скачать Excel с логинами и паролями
                                        </a>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Файл будет сохранён на ваш компьютер. Храните его в защищённом месте.
                                        </p>
                                    </div>
                                )}

                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-gray-700 font-medium mb-2">
                                            Ошибки ({result.errors.length}):
                                        </p>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {result.errors.map((err, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs bg-red-100 rounded p-2"
                                                >
                                                    <span className="font-medium">Строка {err.row}:</span>{' '}
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
                            disabled={loading || !selectedSchool || !file}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Импорт...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Импортировать</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
