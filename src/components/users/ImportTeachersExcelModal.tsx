'use client';

import { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye } from 'lucide-react';
import axiosInstance from '@/lib/axios';

interface School {
    id: number;
    name: string;
}

interface PreviewRow {
    row: number;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    teacher_status: 'new' | 'existing';
}

interface PreviewData {
    preview: true;
    summary: {
        teachers_new: number;
        teachers_existing: number;
        rows_count: number;
        errors_count: number;
    };
    rows: PreviewRow[];
    errors: Array<{ row: number; error: string }>;
}

interface ImportResult {
    success: boolean;
    message: string;
    summary: {
        total_teachers: number;
        skipped_existing: number;
        errors_count: number;
    };
    default_password: string;
    errors: Array<{ row: number | null; error: string }>;
    credentials_file?: { path: string; url: string };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: () => void;
}

export default function ImportTeachersExcelModal({ isOpen, onClose, onImportComplete }: Props) {
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<number>(0);
    const [file, setFile] = useState<File | null>(null);
    const [defaultPassword, setDefaultPassword] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchSchools();
            setFile(null);
            setDefaultPassword('');
            setPreviewData(null);
            setResult(null);
            setError(null);
            setSelectedSchool(0);
        }
    }, [isOpen]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const response = await axiosInstance.get('/schools/');
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setSchools(data);
            if (data.length > 0) setSelectedSchool(data[0].id);
        } catch {
            setError('Не удалось загрузить список школ');
        } finally {
            setLoadingSchools(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
            setError('Файл должен быть в формате Excel (.xlsx или .xls)');
            return;
        }
        setFile(f);
        setPreviewData(null);
        setResult(null);
        setError(null);
    };

    const buildFormData = (preview: boolean) => {
        const fd = new FormData();
        fd.append('file', file!);
        if (defaultPassword) fd.append('default_password', defaultPassword);
        if (preview) fd.append('preview', '1');
        return fd;
    };

    const handlePreview = async () => {
        if (!selectedSchool || !file) return;
        setLoading(true);
        setError(null);
        setPreviewData(null);
        setResult(null);
        try {
            const response = await axiosInstance.post(
                `/schools/${selectedSchool}/import-teachers-excel/`,
                buildFormData(true),
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
            );
            setPreviewData(response.data);
        } catch (err: unknown) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!selectedSchool || !file) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.post(
                `/schools/${selectedSchool}/import-teachers-excel/`,
                buildFormData(false),
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
            );
            setResult(response.data);
            setPreviewData(null);
            if (onImportComplete) onImportComplete();
        } catch (err: unknown) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    const parseError = (err: unknown): string => {
        const e = err as { response?: { data?: unknown } };
        const data = e?.response?.data;
        if (!data) return 'Не удалось импортировать учителей. Проверьте формат файла.';
        if (typeof data === 'string') return data;
        if (typeof (data as { error?: string }).error === 'string') return (data as { error: string }).error;
        if (typeof (data as { detail?: string }).detail === 'string') return (data as { detail: string }).detail;
        if (Array.isArray(data) && data.length > 0) return String(data[0]);
        const obj = data as Record<string, unknown>;
        const firstKey = Object.keys(obj)[0];
        if (firstKey) {
            const val = obj[firstKey];
            return Array.isArray(val) ? String(val[0]) : String(val);
        }
        return 'Не удалось импортировать учителей.';
    };

    if (!isOpen) return null;

    const canPreview = !!selectedSchool && !!file && !loading;
    const canImport = !!previewData && !loading;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Импорт учителей из Excel</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* School */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Школа <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedSchool}
                            onChange={(e) => { setSelectedSchool(Number(e.target.value)); setPreviewData(null); setResult(null); }}
                            disabled={loadingSchools || loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            {loadingSchools ? (
                                <option>Загрузка школ...</option>
                            ) : (
                                <>
                                    <option value={0}>Выберите школу</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
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
                                        htmlFor="file-upload-teachers"
                                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        <span>Выберите файл</span>
                                        <input
                                            id="file-upload-teachers"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                            disabled={loading}
                                            className="sr-only"
                                        />
                                    </label>
                                    <p className="pl-1">или перетащите сюда</p>
                                </div>
                                <p className="text-xs text-gray-500">Excel файл (.xlsx, .xls)</p>
                                {file && (
                                    <p className="text-sm text-gray-700 mt-2">
                                        Выбран: <span className="font-medium">{file.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Колонки: <span className="font-mono">ФИО Учителя</span> (или{' '}
                            <span className="font-mono">Фамилия</span> +{' '}
                            <span className="font-mono">Имя</span>),{' '}
                            <span className="font-mono">Эл.почта</span>
                        </p>
                    </div>

                    {/* Default Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Пароль по умолчанию
                        </label>
                        <input
                            type="text"
                            value={defaultPassword}
                            onChange={(e) => setDefaultPassword(e.target.value)}
                            disabled={loading}
                            placeholder="По умолчанию: qwerty123"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Preview Result */}
                    {previewData && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                            <p className="text-sm font-semibold text-blue-800">Предпросмотр импорта</p>

                            {/* Summary badges */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-green-100 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-700">{previewData.summary.teachers_new}</p>
                                    <p className="text-green-600">Будет создано</p>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-700">{previewData.summary.teachers_existing}</p>
                                    <p className="text-gray-600">Уже существуют</p>
                                </div>
                            </div>

                            {/* Preview table */}
                            {previewData.rows.length > 0 && (
                                <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border border-blue-200">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-blue-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-blue-700">Строка</th>
                                                <th className="px-3 py-2 text-left text-blue-700">Фамилия Имя</th>
                                                <th className="px-3 py-2 text-left text-blue-700">Email</th>
                                                <th className="px-3 py-2 text-left text-blue-700">Статус</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-100">
                                            {previewData.rows.map((row, idx) => (
                                                <tr
                                                    key={`${row.row}-${idx}`}
                                                    className={row.teacher_status === 'new' ? 'bg-green-50' : 'bg-gray-50'}
                                                >
                                                    <td className="px-3 py-1.5 text-gray-500">{row.row}</td>
                                                    <td className="px-3 py-1.5 font-medium text-gray-900">
                                                        {row.last_name} {row.first_name}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-gray-600">{row.email || '—'}</td>
                                                    <td className="px-3 py-1.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            row.teacher_status === 'new'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-200 text-gray-600'
                                                        }`}>
                                                            {row.teacher_status === 'new' ? 'Новый' : 'Существует'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Parse errors */}
                            {previewData.errors.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs font-medium text-amber-700 mb-1">
                                        Ошибки ({previewData.errors.length}):
                                    </p>
                                    <div className="max-h-28 overflow-y-auto space-y-1">
                                        {previewData.errors.map((e, idx) => (
                                            <div key={`${e.row}-${idx}`} className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                <span className="font-semibold">Строка {e.row}:</span> {e.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-blue-600">
                                Нажмите «Импортировать» для создания {previewData.summary.teachers_new} учителей.
                            </p>
                        </div>
                    )}

                    {/* Import Result */}
                    {result && result.success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-green-800">Импорт завершён успешно!</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                    <p className="text-2xl font-bold text-green-700">{result.summary.total_teachers}</p>
                                    <p className="text-gray-600 text-xs">Создано</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                    <p className="text-2xl font-bold text-gray-500">{result.summary.skipped_existing}</p>
                                    <p className="text-gray-600 text-xs">Пропущено</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                    <p className="text-2xl font-bold text-red-500">{result.summary.errors_count}</p>
                                    <p className="text-gray-600 text-xs">Ошибок</p>
                                </div>
                            </div>

                            {result.default_password && (
                                <div className="bg-white border border-green-300 rounded p-3">
                                    <p className="text-xs text-gray-600 mb-1">Пароль по умолчанию:</p>
                                    <p className="text-lg font-mono font-bold text-green-700">{result.default_password}</p>
                                </div>
                            )}

                            {result.credentials_file && (
                                <a
                                    href={result.credentials_file.url}
                                    download
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors w-fit"
                                >
                                    <Download className="w-4 h-4" />
                                    Скачать Excel с логинами и паролями
                                </a>
                            )}

                            {result.errors.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-red-700 mb-1">Ошибки ({result.errors.length}):</p>
                                    <div className="max-h-36 overflow-y-auto space-y-1">
                                        {result.errors.map((e, idx) => (
                                            <div key={idx} className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1">
                                                {e.row && <span className="font-semibold">Строка {e.row}: </span>}
                                                {e.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Отмена
                        </button>

                        {!previewData && !result && (
                            <button
                                type="button"
                                onClick={handlePreview}
                                disabled={!canPreview}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        <span>Анализ...</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4" />
                                        <span>Предпросмотр</span>
                                    </>
                                )}
                            </button>
                        )}

                        {previewData && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setPreviewData(null); setResult(null); }}
                                    disabled={loading}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Назад
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={!canImport || previewData.summary.teachers_new === 0}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            <span>Импорт...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            <span>Импортировать ({previewData.summary.teachers_new})</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {result && (
                            <button
                                type="button"
                                onClick={() => { setFile(null); setResult(null); setPreviewData(null); }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Импортировать ещё
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
