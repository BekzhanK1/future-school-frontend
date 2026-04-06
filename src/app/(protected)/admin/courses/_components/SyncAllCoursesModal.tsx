'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { courseService } from '@/services/courseService';
import { inferAcademicYearStartIso } from '@/lib/academicYearStart';

interface SyncAllCoursesModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseIds: number[];
    courseLabels?: Record<number, string>;
    onSuccess: () => void;
}

function randomFourDigitCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

export default function SyncAllCoursesModal({
    isOpen,
    onClose,
    courseIds,
    courseLabels = {},
    onSuccess,
}: SyncAllCoursesModalProps) {
    const [expectedCode, setExpectedCode] = useState('');
    const [typedCode, setTypedCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(
        null
    );
    const [doneReport, setDoneReport] = useState<{
        ok: number;
        failures: { id: number; message: string }[];
    } | null>(null);

    const academicStart = inferAcademicYearStartIso();

    const resetState = useCallback(() => {
        setExpectedCode('');
        setTypedCode('');
        setError(null);
        setProgress(null);
        setDoneReport(null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetState();
            return;
        }
        const code = randomFourDigitCode();
        setExpectedCode(code);
        setTypedCode('');
        setError(null);
        setProgress(null);
        setDoneReport(null);
    }, [isOpen, resetState]);

    const handleClose = () => {
        if (submitting) return;
        resetState();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setDoneReport(null);

        if (typedCode.trim() !== expectedCode) {
            setError('Код не совпадает. Введите четыре цифры, показанные выше.');
            return;
        }

        if (courseIds.length === 0) {
            setError('Нет курсов для синхронизации.');
            return;
        }

        setSubmitting(true);
        const failures: { id: number; message: string }[] = [];
        let ok = 0;

        try {
            for (let i = 0; i < courseIds.length; i++) {
                const id = courseIds[i];
                const name = courseLabels[id] ?? `Курс #${id}`;
                setProgress({ current: i + 1, total: courseIds.length, name });
                try {
                    await courseService.syncContent(id, academicStart);
                    ok += 1;
                } catch (err: unknown) {
                    const ax = err as {
                        formattedMessage?: string;
                        response?: { data?: { detail?: string } };
                    };
                    const msg =
                        ax?.formattedMessage ||
                        ax?.response?.data?.detail ||
                        'Ошибка синхронизации';
                    failures.push({ id, message: String(msg) });
                }
            }

            setProgress(null);
            setDoneReport({ ok, failures });

            if (ok > 0) {
                onSuccess();
            }
            if (failures.length === 0) {
                setTimeout(() => {
                    handleClose();
                }, 1200);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatRu = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number);
        if (!y || !m || !d) return iso;
        return `${d.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}.${y}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Синхронизировать все курсы"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                            <p className="font-semibold mb-1">Тяжёлая операция</p>
                            <p>
                                Для каждого курса будет вызвана синхронизация шаблонного контента во все
                                привязанные классы. Это может занять несколько минут.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-800">Дата начала учебного года: </span>
                    <span className="font-mono">{formatRu(academicStart)}</span>
                    <span className="text-gray-500 block text-xs mt-1">
                        До 1 июня — 1 сентября прошлого календарного года; с 1 июня — 1 сентября текущего
                        года.
                    </span>
                </div>

                <div className="rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/60 p-4 text-center">
                    <p className="text-xs font-medium text-violet-800 uppercase tracking-wide mb-2">
                        Подтверждение — наберите этот код
                    </p>
                    <p
                        className="text-3xl font-mono font-bold tracking-[0.35em] text-violet-900 select-all"
                        aria-live="polite"
                    >
                        {expectedCode || '····'}
                    </p>
                </div>

                <div>
                    <label htmlFor="sync-all-code" className="block text-sm font-medium text-gray-700 mb-1">
                        Четырёхзначный код
                    </label>
                    <input
                        id="sync-all-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={typedCode}
                        onChange={(e) => setTypedCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="0000"
                        disabled={submitting}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {progress && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-600 border-t-transparent" />
                        <span>
                            {progress.current} / {progress.total}: {progress.name}
                        </span>
                    </div>
                )}

                {doneReport && doneReport.failures.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p className="text-sm font-medium text-red-900 mb-2">
                            Успешно: {doneReport.ok}, с ошибками: {doneReport.failures.length}
                        </p>
                        <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                            {doneReport.failures.map((f) => (
                                <li key={f.id}>
                                    {courseLabels[f.id] ?? `ID ${f.id}`}: {f.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {doneReport && doneReport.failures.length === 0 && doneReport.ok > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                        {(() => {
                            const n = doneReport.ok;
                            const w =
                                n % 10 === 1 && n % 100 !== 11
                                    ? 'курс'
                                    : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)
                                      ? 'курса'
                                      : 'курсов';
                            return `Все ${n} ${w} синхронизированы.`;
                        })()}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={submitting}
                    >
                        {doneReport && doneReport.failures.length > 0 ? 'Закрыть' : 'Отмена'}
                    </button>
                    {!(doneReport && doneReport.failures.length === 0 && doneReport.ok > 0) && (
                        <button
                            type="submit"
                            disabled={submitting || typedCode.length !== 4}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Синхронизация…
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Синхронизировать всё
                                </>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
