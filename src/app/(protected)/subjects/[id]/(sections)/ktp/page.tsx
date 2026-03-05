'use client';

import React, { useState, useRef, use, useEffect } from 'react';
import { UploadCloud, FileText, X, AlertCircle, Trash2, Link as LinkIcon } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function KTPPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const subjectId = resolvedParams.id;
    const router = useRouter();

    const [plan, setPlan] = useState<any | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(true);

    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (isLinkModalOpen) {
            fetchAvailableGroups();
        }
    }, [isLinkModalOpen, plan]);

    const fetchAvailableGroups = async () => {
        if (!plan?.course?.id) return;
        try {
            const response = await axiosInstance.get(`/subject-groups/?course=${plan.course.id}&is_teacher=true`);
            const groups = response.data.filter((g: any) => g.id.toString() !== subjectId);
            setAvailableGroups(groups);
        } catch (error) {
            console.error('Error fetching subject groups:', error);
        }
    };

    const handleLinkGroups = async () => {
        if (!plan || selectedGroupIds.length === 0) return;
        setLinking(true);
        try {
            await axiosInstance.post(`/academic-plans/${plan.id}/link_subject_groups/`, {
                subject_group_ids: selectedGroupIds
            });
            alert('КТП успешно привязан к выбранным классам!');
            setIsLinkModalOpen(false);
            setSelectedGroupIds([]);
        } catch (error) {
            console.error('Error linking groups:', error);
            alert('Ошибка при привязке КТП.');
        } finally {
            setLinking(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, [subjectId]);

    const fetchPlan = async () => {
        setLoadingPlan(true);
        try {
            const response = await axiosInstance.get(`/academic-plans/?subject_group_id=${subjectId}`);
            if (response.data && response.data.length > 0) {
                // Assuming one KTP per subject group is active at a time
                setPlan(response.data[0]);
            } else {
                setPlan(null);
            }
        } catch (error) {
            console.error('Error fetching academic plan:', error);
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!plan) return;
        const confirmDelete = window.confirm('Вы уверены, что хотите удалить текущий КТП? Это действие нельзя отменить.');
        if (!confirmDelete) return;

        try {
            await axiosInstance.delete(`/academic-plans/${plan.id}/`);
            setPlan(null);
        } catch (error) {
            console.error('Error deleting KTP:', error);
            alert('Ошибка при удалении КТП.');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            setFile(droppedFile);
            setSuccess(false);
        } else if (droppedFile) {
            alert('Пожалуйста, загрузите только PDF файл.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                alert('Пожалуйста, загрузите только PDF файл.');
                return;
            }
            setFile(selectedFile);
            setSuccess(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_group_id', subjectId);
        
        try {
            await axiosInstance.post('/academic-plans/parse_pdf/', formData, {
                timeout: 300000,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setSuccess(true);
            setTimeout(() => {
                fetchPlan(); // Refresh data
                setFile(null);
                setSuccess(false);
            }, 2000);
        } catch (error) {
            console.error('Error uploading KTP PDF:', error);
            alert('Ошибка при загрузке документа. Пожалуйста, попробуйте еще раз.');
        } finally {
            setUploading(false);
        }
    };

    if (loadingPlan) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Загрузка КТП...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Календарно-тематическое планирование (КТП)</h1>
                    <p className="text-gray-600">{plan ? 'Просмотр утвержденного плана' : 'Загрузите или обновите КТП для данного предмета в формате PDF.'}</p>
                </div>
                {plan && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center transition-colors"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Связать с другими классами
                        </button>
                        <button
                            onClick={handleDeletePlan}
                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить КТП
                        </button>
                    </div>
                )}
            </div>

            {plan ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-hidden">
                    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Учитель</p>
                            <p className="text-gray-900">{plan.teacher_name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Учебный год</p>
                            <p className="text-gray-900">{plan.academic_year}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Школа</p>
                            <p className="text-gray-900">{plan.school_name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Предмет</p>
                            <p className="text-gray-900">{plan.course?.name || '-'}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тема занятия</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Часы</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сроки</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цели обучения</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {plan.quarter_details?.map((quarter: any) => (
                                    <React.Fragment key={quarter.id}>
                                        <tr className="bg-purple-50">
                                            <td colSpan={6} className="px-6 py-3 text-sm font-semibold text-purple-800">
                                                {quarter.quarter?.quarter_index} четверть (СОР: {quarter.sor_count}, СОЧ: {quarter.soch_count}, Часов: {quarter.total_hours})
                                            </td>
                                        </tr>
                                        {quarter.sections?.map((section: any) => (
                                            <React.Fragment key={section.id}>
                                                <tr className="bg-gray-50">
                                                    <td colSpan={6} className="px-6 py-2 text-sm font-medium text-gray-700 pl-10">
                                                        {section.section_name}
                                                    </td>
                                                </tr>
                                                {section.lessons?.map((lesson: any) => (
                                                    <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-10">
                                                            {lesson.lesson_number}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 min-w-[250px]">
                                                            {lesson.topic}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {lesson.hours}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {lesson.scheduled_date || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {lesson.is_summative ? (
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                                    Оценивание
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-gray-500">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                                {lesson.objectives?.map((obj: any) => (
                                                                    <span key={obj.id} className="inline-block bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2 py-1 rounded" title={obj.description}>
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
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
                    {!file ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Перетащите файл сюда или нажмите для выбора</h3>
                            <p className="text-sm text-gray-500 mb-4">Поддерживается только формат PDF (до 10 МБ)</p>
                            
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,application/pdf"
                                className="hidden"
                            />
                            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                Выбрать файл
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-xl mx-auto">
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
                                        <FileText className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setFile(null);
                                        setSuccess(false);
                                    }}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {success && (
                                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>Файл успешно загружен и обработан ИИ! Загружаем данные...</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setFile(null)}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || success}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Загрузка...</span>
                                        </>
                                    ) : (
                                        <span>Загрузить на сервер</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for Linking KTP to other classes */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Связка КТП с классами</h3>
                            <button onClick={() => setIsLinkModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Выберите параллельные классы, для которых будет применяться этот же КТП.
                        </p>
                        
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4">
                            {availableGroups.length === 0 ? (
                                <p className="text-sm text-gray-500 p-2 text-center">Нет доступных классов для связи</p>
                            ) : (
                                availableGroups.map(group => (
                                    <label key={group.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 mr-3"
                                            checked={selectedGroupIds.includes(group.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedGroupIds([...selectedGroupIds, group.id]);
                                                } else {
                                                    setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                                                }
                                            }}
                                        />
                                        <span className="text-gray-900">{group.classroom_display}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleLinkGroups}
                                disabled={linking || selectedGroupIds.length === 0}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center"
                            >
                                {linking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                                <span>{linking ? 'Сохранение...' : 'Связать'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
