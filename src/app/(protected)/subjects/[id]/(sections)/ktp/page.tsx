'use client';

import React, { useState, useRef, use, useEffect } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Trash2, Link as LinkIcon, Info } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function KTPPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const subjectId = resolvedParams.id;

    const [plan, setPlan] = useState<any | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (isLinkModalOpen) fetchAvailableGroups();
    }, [isLinkModalOpen]);

    useEffect(() => { fetchPlan(); }, [subjectId]);

    const fetchPlan = async () => {
        setLoadingPlan(true);
        try {
            const res = await axiosInstance.get(`/academic-plans/?subject_group_id=${subjectId}`);
            setPlan(res.data?.[0] ?? null);
        } catch {
            setPlan(null);
        } finally {
            setLoadingPlan(false);
        }
    };

    const fetchAvailableGroups = async () => {
        if (!plan?.course?.id) return;
        try {
            const res = await axiosInstance.get(`/subject-groups/?course=${plan.course.id}&is_teacher=true`);
            setAvailableGroups(res.data.filter((g: any) => g.id.toString() !== subjectId));
        } catch { /* ignore */ }
    };

    const handleLinkGroups = async () => {
        if (!plan || selectedGroupIds.length === 0) return;
        setLinking(true);
        try {
            await axiosInstance.post(`/academic-plans/${plan.id}/link_subject_groups/`, { subject_group_ids: selectedGroupIds });
            setIsLinkModalOpen(false);
            setSelectedGroupIds([]);
        } catch {
            setError('Ошибка при привязке КТП.');
        } finally {
            setLinking(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!plan || !window.confirm('Удалить КТП? Это действие нельзя отменить.')) return;
        try {
            await axiosInstance.delete(`/academic-plans/${plan.id}/`);
            setPlan(null);
        } catch {
            setError('Ошибка при удалении КТП.');
        }
    };

    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') { setError('Только PDF файл'); return; }
        setFile(file);
        setError(null);
        setSuccess(false);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_group_id', subjectId);
        try {
            await axiosInstance.post('/academic-plans/parse_pdf/', formData, {
                timeout: 300000,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccess(true);
            setTimeout(() => { fetchPlan(); setFile(null); setSuccess(false); }, 2000);
        } catch {
            setError('Ошибка при загрузке. Попробуйте ещё раз.');
        } finally {
            setUploading(false);
        }
    };

    if (loadingPlan) {
        return (
            <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">КТП</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Календарно-тематическое планирование</p>
                </div>
                {plan && (
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl border border-violet-100 transition-colors"
                        >
                            <LinkIcon className="w-3.5 h-3.5" />
                            Связать с классами
                        </button>
                        <button
                            onClick={handleDeletePlan}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-xl border border-red-100 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Удалить
                        </button>
                    </div>
                )}
            </div>

            {plan ? (
                <>
                    {/* Metadata bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Учитель', value: plan.teacher_name },
                                { label: 'Уч. год', value: plan.academic_year },
                                { label: 'Школа', value: plan.school_name },
                                { label: 'Предмет', value: plan.course?.name || '—' },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Excel-like KTP table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 700 }}>
                                <thead>
                                    <tr style={{ background: '#e8e8e8' }}>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-700 w-10">№</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700">Тема занятия</th>
                                        <th className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 w-14">Часы</th>
                                        <th className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 w-24">Сроки</th>
                                        <th className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 w-20">Тип</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700">Цели обучения</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.quarter_details?.map((quarter: any, qi: number) => (
                                        <React.Fragment key={quarter.id}>
                                            {/* Quarter header */}
                                            <tr style={{ background: '#d6c8f5' }}>
                                                <td colSpan={6} className="border border-gray-300 px-3 py-2 font-bold text-violet-900 text-xs">
                                                    {quarter.quarter?.quarter_index}-я четверть &nbsp;·&nbsp; СОР: {quarter.sor_count} &nbsp;·&nbsp; СОЧ: {quarter.soch_count} &nbsp;·&nbsp; Часов: {quarter.total_hours}
                                                </td>
                                            </tr>
                                            {quarter.sections?.map((section: any) => (
                                                <React.Fragment key={section.id}>
                                                    {/* Section header */}
                                                    <tr style={{ background: '#f0f0f0' }}>
                                                        <td colSpan={6} className="border border-gray-300 px-4 py-1.5 font-semibold text-gray-700 italic text-xs">
                                                            {section.section_name}
                                                        </td>
                                                    </tr>
                                                    {section.lessons?.map((lesson: any, li: number) => (
                                                        <tr key={lesson.id} className={li % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                                            <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500">{lesson.lesson_number}</td>
                                                            <td className="border border-gray-200 px-3 py-1.5 text-gray-900">{lesson.topic}</td>
                                                            <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-600">{lesson.hours}</td>
                                                            <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500">{lesson.scheduled_date || '—'}</td>
                                                            <td className="border border-gray-200 px-2 py-1.5 text-center">
                                                                {lesson.is_summative
                                                                    ? <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">СОЧ/СОР</span>
                                                                    : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="border border-gray-200 px-3 py-1.5">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {lesson.objectives?.map((obj: any) => (
                                                                        <span key={obj.id} className="inline-block bg-blue-50 border border-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded" title={obj.description}>
                                                                            {obj.code}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Upload zone */
                <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-xl mx-auto">
                    {!file ? (
                        <label
                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                                isDragging ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
                            }`}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                        >
                            <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${isDragging ? 'text-violet-500' : 'text-gray-300'}`} />
                            <p className="text-sm font-semibold text-gray-700 mb-1">Загрузить КТП в формате PDF</p>
                            <p className="text-xs text-gray-400">Перетащите или нажмите для выбора файла</p>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,application/pdf"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                        </label>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                                <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                                </div>
                                <button onClick={() => setFile(null)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                </button>
                            </div>

                            {success && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Файл обработан. Загружаем план...
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                    <Info className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setFile(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || success}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                                >
                                    {uploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {uploading ? 'Обработка...' : 'Загрузить'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Link modal */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-bold text-gray-900">Привязать к классам</h3>
                            <button onClick={() => setIsLinkModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Выберите параллельные классы, для которых применяется этот КТП.</p>
                        <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
                            {availableGroups.length === 0
                                ? <p className="p-4 text-xs text-gray-400 text-center">Нет доступных классов</p>
                                : availableGroups.map(g => (
                                    <label key={g.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-violet-600 rounded"
                                            checked={selectedGroupIds.includes(g.id)}
                                            onChange={e => setSelectedGroupIds(e.target.checked ? [...selectedGroupIds, g.id] : selectedGroupIds.filter(id => id !== g.id))}
                                        />
                                        <span className="text-sm text-gray-800">{g.classroom_display}</span>
                                    </label>
                                ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsLinkModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                            <button
                                onClick={handleLinkGroups}
                                disabled={linking || selectedGroupIds.length === 0}
                                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {linking && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Связать
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
