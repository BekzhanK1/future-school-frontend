'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import axiosInstance from '@/lib/axios';
import Modal from '@/components/ui/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Quarter {
    id: number;
    quarter_index: number;
    start_date: string;
    end_date: string;
}

interface AcademicYear {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    quarters?: Quarter[];
    quarter1_weeks?: number;
    quarter2_weeks?: number;
    quarter3_weeks?: number;
    quarter4_weeks?: number;
    autumn_holiday_start?: string;
    autumn_holiday_end?: string;
    winter_holiday_start?: string;
    winter_holiday_end?: string;
    spring_holiday_start?: string;
    spring_holiday_end?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function AcademicYearsPage() {
    const router = useRouter();
    const { user } = useUserState();
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

    // Check if user is SuperAdmin
    useEffect(() => {
        if (user && user.role !== 'superadmin') {
            router.push('/');
        }
    }, [user, router]);

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/academic-years/');
            const data = Array.isArray(response.data) 
                ? response.data 
                : response.data.results || [];
            setAcademicYears(data);
        } catch (err: any) {
            console.error('Error fetching academic years:', err);
            setError('Не удалось загрузить учебные годы');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот учебный год?')) {
            return;
        }

        try {
            await axiosInstance.delete(`/academic-years/${id}/`);
            fetchAcademicYears();
        } catch (err: any) {
            console.error('Error deleting academic year:', err);
            alert('Не удалось удалить учебный год');
        }
    };

    const handleSetActive = async (id: number) => {
        try {
            // First, deactivate all years
            for (const year of academicYears) {
                if (year.is_active && year.id !== id) {
                    await axiosInstance.patch(`/academic-years/${year.id}/`, {
                        is_active: false
                    });
                }
            }
            // Then activate the selected year
            await axiosInstance.patch(`/academic-years/${id}/`, {
                is_active: true
            });
            fetchAcademicYears();
        } catch (err: any) {
            console.error('Error setting active academic year:', err);
            alert('Не удалось установить активный учебный год');
        }
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Доступ запрещен
                    </h2>
                    <p className="text-gray-600">
                        Только супер-администратор может просматривать эту страницу.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Управление учебными годами
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Создавайте и управляйте учебными годами, четвертями и каникулами
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Создать учебный год</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Academic Years List */}
                {academicYears.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Учебные годы не найдены
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Создайте первый учебный год, чтобы начать
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Создать учебный год
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {academicYears.map((year) => (
                            <div
                                key={year.id}
                                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                                    year.is_active
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900">
                                                {year.name}
                                            </h3>
                                            {year.is_active && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Активный
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {new Date(year.start_date).toLocaleDateString('ru-RU')} - {new Date(year.end_date).toLocaleDateString('ru-RU')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!year.is_active && (
                                            <button
                                                onClick={() => handleSetActive(year.id)}
                                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                title="Установить как активный"
                                            >
                                                Активировать
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setEditingYear(year)}
                                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Редактировать"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(year.id)}
                                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Удалить"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Quarters */}
                                <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        Четверти:
                                    </h4>
                                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                                        {year.quarters && year.quarters.length > 0 ? (
                                            year.quarters.map(q => (
                                                <div key={q.id}>
                                                    {q.quarter_index}-я: {new Date(q.start_date).toLocaleDateString('ru-RU')} - {new Date(q.end_date).toLocaleDateString('ru-RU')}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex gap-4">
                                                <span>1-я: {year.quarter1_weeks} нед.</span>
                                                <span>2-я: {year.quarter2_weeks} нед.</span>
                                                <span>3-я: {year.quarter3_weeks} нед.</span>
                                                <span>4-я: {year.quarter4_weeks} нед.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Holidays */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        Каникулы:
                                    </h4>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        {year.autumn_holiday_start && year.autumn_holiday_end && (
                                            <div>
                                                Осенние: {new Date(year.autumn_holiday_start).toLocaleDateString('ru-RU')} - {new Date(year.autumn_holiday_end).toLocaleDateString('ru-RU')}
                                            </div>
                                        )}
                                        {year.winter_holiday_start && year.winter_holiday_end && (
                                            <div>
                                                Зимние: {new Date(year.winter_holiday_start).toLocaleDateString('ru-RU')} - {new Date(year.winter_holiday_end).toLocaleDateString('ru-RU')}
                                            </div>
                                        )}
                                        {year.spring_holiday_start && year.spring_holiday_end && (
                                            <div>
                                                Весенние: {new Date(year.spring_holiday_start).toLocaleDateString('ru-RU')} - {new Date(year.spring_holiday_end).toLocaleDateString('ru-RU')}
                                            </div>
                                        )}
                                        {!year.autumn_holiday_start && !year.winter_holiday_start && !year.spring_holiday_start && (
                                            <div className="text-gray-400 italic">Каникулы не указаны</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || editingYear) && (
                <CreateAcademicYearModal
                    isOpen={isCreateModalOpen || !!editingYear}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingYear(null);
                    }}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setEditingYear(null);
                        fetchAcademicYears();
                    }}
                    academicYear={editingYear}
                />
            )}
        </div>
    );
}

interface CreateAcademicYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    academicYear?: AcademicYear | null;
}

const parseDateString = (dateStr: string | null) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

const formatDateString = (date: Date | null) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

function CreateAcademicYearModal({
    isOpen,
    onClose,
    onSuccess,
    academicYear,
}: CreateAcademicYearModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        quarter1_weeks: 8,
        quarter2_weeks: 8,
        quarter3_weeks: 10,
        quarter4_weeks: 8,
        quarters: [] as { quarter_index: number; start_date: string; end_date: string }[],
        autumn_holiday_start: '',
        autumn_holiday_end: '',
        winter_holiday_start: '',
        winter_holiday_end: '',
        spring_holiday_start: '',
        spring_holiday_end: '',
        is_active: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (academicYear) {
            setFormData({
                name: academicYear.name,
                start_date: academicYear.start_date,
                end_date: academicYear.end_date,
                quarter1_weeks: academicYear.quarter1_weeks || 8,
                quarter2_weeks: academicYear.quarter2_weeks || 8,
                quarter3_weeks: academicYear.quarter3_weeks || 10,
                quarter4_weeks: academicYear.quarter4_weeks || 8,
                quarters: academicYear.quarters 
                    ? academicYear.quarters.map(q => ({
                        quarter_index: q.quarter_index,
                        start_date: q.start_date,
                        end_date: q.end_date
                    })) 
                    : [],
                autumn_holiday_start: academicYear.autumn_holiday_start || '',
                autumn_holiday_end: academicYear.autumn_holiday_end || '',
                winter_holiday_start: academicYear.winter_holiday_start || '',
                winter_holiday_end: academicYear.winter_holiday_end || '',
                spring_holiday_start: academicYear.spring_holiday_start || '',
                spring_holiday_end: academicYear.spring_holiday_end || '',
                is_active: academicYear.is_active,
            });
        } else {
            // Determine current academic year based on current date
            const now = new Date();
            const currentMonth = now.getMonth() + 1; // 1-12 (January = 1, December = 12)
            const currentYear = now.getFullYear();
            
            let startYear: number;
            let endYear: number;
            
            // If we're in January-May (1-5), the academic year started last year
            // If we're in June-August (6-8), suggest next academic year (current one is ending)
            // If we're in September-December (9-12), the academic year started this year
            if (currentMonth <= 5) {
                // January-May: academic year started last year (e.g., Sept 2024 - May 2025)
                startYear = currentYear - 1;
                endYear = currentYear;
            } else if (currentMonth >= 9) {
                // September-December: academic year started this year (e.g., Sept 2025 - May 2026)
                startYear = currentYear;
                endYear = currentYear + 1;
            } else {
                // June-August: suggest next academic year (current one is ending)
                startYear = currentYear;
                endYear = currentYear + 1;
            }
            
            setFormData({
                name: `${startYear}-${endYear} учебный год`,
                start_date: `${startYear}-09-01`,
                end_date: `${endYear}-05-25`,
                quarter1_weeks: 8,
                quarter2_weeks: 8,
                quarter3_weeks: 10,
                quarter4_weeks: 8,
                quarters: [],
                autumn_holiday_start: `${startYear}-10-27`,
                autumn_holiday_end: `${startYear}-11-02`,
                winter_holiday_start: `${startYear}-12-29`,
                winter_holiday_end: `${endYear}-01-07`,
                spring_holiday_start: `${endYear}-03-19`,
                spring_holiday_end: `${endYear}-03-29`,
                is_active: false,
            });
        }
        setErrors({});
    }, [academicYear, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.name) {
            newErrors.name = 'Название обязательно';
        }
        if (!formData.start_date) {
            newErrors.start_date = 'Дата начала обязательна';
        }
        if (!formData.end_date) {
            newErrors.end_date = 'Дата окончания обязательна';
        }
        if (formData.start_date && formData.end_date && formData.end_date <= formData.start_date) {
            newErrors.end_date = 'Дата окончания должна быть после даты начала';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setSubmitting(true);
            const payload: any = {
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                is_active: formData.is_active,
            };
            
            if (academicYear) {
                // For updates, send the exact quarter dates
                payload.quarters = formData.quarters;
            } else {
                // For creation, send the week counts to auto-generate
                payload.quarter1_weeks = formData.quarter1_weeks;
                payload.quarter2_weeks = formData.quarter2_weeks;
                payload.quarter3_weeks = formData.quarter3_weeks;
                payload.quarter4_weeks = formData.quarter4_weeks;
            }

            // Add holidays if provided
            if (formData.autumn_holiday_start && formData.autumn_holiday_end) {
                payload.autumn_holiday_start = formData.autumn_holiday_start;
                payload.autumn_holiday_end = formData.autumn_holiday_end;
            }
            if (formData.winter_holiday_start && formData.winter_holiday_end) {
                payload.winter_holiday_start = formData.winter_holiday_start;
                payload.winter_holiday_end = formData.winter_holiday_end;
            }
            if (formData.spring_holiday_start && formData.spring_holiday_end) {
                payload.spring_holiday_start = formData.spring_holiday_start;
                payload.spring_holiday_end = formData.spring_holiday_end;
            }

            if (academicYear) {
                await axiosInstance.patch(`/academic-years/${academicYear.id}/`, payload);
            } else {
                await axiosInstance.post('/academic-years/', payload);
            }

            // If setting as active, deactivate all other years
            if (payload.is_active) {
                try {
                    const allYearsResponse = await axiosInstance.get('/academic-years/');
                    const allYears = Array.isArray(allYearsResponse.data)
                        ? allYearsResponse.data
                        : allYearsResponse.data.results || [];
                    
                    const yearId = academicYear?.id || allYears[allYears.length - 1]?.id;
                    
                    for (const year of allYears) {
                        if (year.is_active && year.id !== yearId) {
                            await axiosInstance.patch(`/academic-years/${year.id}/`, {
                                is_active: false
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error deactivating other years:', err);
                }
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error saving academic year:', err);
            if (err.response?.data) {
                const apiErrors = err.response.data;
                setErrors(apiErrors);
            } else {
                setErrors({
                    general: academicYear
                        ? 'Не удалось обновить учебный год'
                        : 'Не удалось создать учебный год',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={academicYear ? 'Редактировать учебный год' : 'Создать учебный год'}
            maxWidth="max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{errors.general}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="2024-2025 учебный год"
                    />
                    {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Дата начала <span className="text-red-500">*</span>
                        </label>
                        <div className="w-full">
                            <DatePicker
                                selected={parseDateString(formData.start_date)}
                                onChange={(date: Date | null) => setFormData({ ...formData, start_date: formatDateString(date) })}
                                dateFormat="dd/MM/yyyy"
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    errors.start_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                                wrapperClassName="w-full"
                            />
                        </div>
                        {errors.start_date && (
                            <p className="text-sm text-red-600 mt-1">{errors.start_date}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Дата окончания <span className="text-red-500">*</span>
                        </label>
                        <div className="w-full">
                            <DatePicker
                                selected={parseDateString(formData.end_date)}
                                onChange={(date: Date | null) => setFormData({ ...formData, end_date: formatDateString(date) })}
                                dateFormat="dd/MM/yyyy"
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    errors.end_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                                wrapperClassName="w-full"
                            />
                        </div>
                        {errors.end_date && (
                            <p className="text-sm text-red-600 mt-1">{errors.end_date}</p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Четверти</h3>
                    {academicYear && formData.quarters.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {formData.quarters.map((q, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {q.quarter_index}-я четверть
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <span className="text-xs text-gray-500 block mb-1">Начало</span>
                                            <div className="w-full">
                                                <DatePicker
                                                    selected={parseDateString(q.start_date)}
                                                    onChange={(date: Date | null) => {
                                                        const newQ = [...formData.quarters];
                                                        newQ[idx].start_date = formatDateString(date);
                                                        setFormData({ ...formData, quarters: newQ });
                                                    }}
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                    wrapperClassName="w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs text-gray-500 block mb-1">Окончание</span>
                                            <div className="w-full">
                                                <DatePicker
                                                    selected={parseDateString(q.end_date)}
                                                    onChange={(date: Date | null) => {
                                                        const newQ = [...formData.quarters];
                                                        newQ[idx].end_date = formatDateString(date);
                                                        setFormData({ ...formData, quarters: newQ });
                                                    }}
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                    wrapperClassName="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((quarter) => (
                                <div key={quarter}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {quarter}-я четверть (недель)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData[`quarter${quarter}_weeks` as keyof typeof formData] as number}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                [`quarter${quarter}_weeks`]: parseInt(e.target.value) || 0,
                                            } as any)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Каникулы</h3>
                    <div className="space-y-4">
                        {[
                            { name: 'autumn', label: 'Осенние', defaultStart: '10-27', defaultEnd: '11-02' },
                            { name: 'winter', label: 'Зимние', defaultStart: '12-29', defaultEnd: '01-07' },
                            { name: 'spring', label: 'Весенние', defaultStart: '03-19', defaultEnd: '03-29' },
                        ].map((holiday) => (
                            <div key={holiday.name} className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {holiday.label} каникулы - начало
                                    </label>
                                    <div className="w-full">
                                        <DatePicker
                                            selected={parseDateString(formData[`${holiday.name}_holiday_start` as keyof typeof formData] as string)}
                                            onChange={(date: Date | null) =>
                                                setFormData({
                                                    ...formData,
                                                    [`${holiday.name}_holiday_start`]: formatDateString(date),
                                                } as any)
                                            }
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {holiday.label} каникулы - окончание
                                    </label>
                                    <div className="w-full">
                                        <DatePicker
                                            selected={parseDateString(formData[`${holiday.name}_holiday_end` as keyof typeof formData] as string)}
                                            onChange={(date: Date | null) =>
                                                setFormData({
                                                    ...formData,
                                                    [`${holiday.name}_holiday_end`]: formatDateString(date),
                                                } as any)
                                            }
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Установить как активный учебный год
                    </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={submitting}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting
                            ? academicYear
                                ? 'Сохранение...'
                                : 'Создание...'
                            : academicYear
                              ? 'Сохранить'
                              : 'Создать'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
