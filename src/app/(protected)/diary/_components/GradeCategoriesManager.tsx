'use client';

import { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

export interface GradeCategory {
    id: number;
    subject_group: number;
    name: string;
    weight: number;
    is_formative: boolean;
}

interface GradeCategoriesManagerProps {
    subjectGroupId: number;
    onUpdate?: () => void;
}

export default function GradeCategoriesManager({ subjectGroupId, onUpdate }: GradeCategoriesManagerProps) {
    const { t } = useLocale();
    const [categories, setCategories] = useState<GradeCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form inputs for new category
    const [newName, setNewName] = useState('');
    const [newWeight, setNewWeight] = useState(0);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/grade-categories/', {
                params: { subject_group: subjectGroupId }
            });
            const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
            // Ensure formative is always at top via sorting locally as well
            list.sort((a: GradeCategory, b: GradeCategory) => {
                if (a.is_formative && !b.is_formative) return -1;
                if (!a.is_formative && b.is_formative) return 1;
                return a.name.localeCompare(b.name);
            });
            setCategories(list);
        } catch (err) {
            console.error('Failed to load categories', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subjectGroupId) {
            fetchCategories();
        }
    }, [subjectGroupId]);

    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);

    const handleCreateCategory = async () => {
        if (!newName.trim()) return;
        if (totalWeight + newWeight > 100) {
            setError('Суммарный вес не может превышать 100%');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await axiosInstance.post('/grade-categories/', {
                subject_group: subjectGroupId,
                name: newName.trim(),
                weight: newWeight,
                is_formative: false
            });
            setNewName('');
            setNewWeight(0);
            await fetchCategories();
            onUpdate?.();
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { weight?: string[] } } };
            setError(errorObj.response?.data?.weight?.[0] || 'Ошибка при создании категории');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCategoryWeight = async (id: number, catName: string, newWeightVal: number) => {
        const otherWeight = categories.filter((c) => c.id !== id).reduce((s, c) => s + c.weight, 0);
        if (otherWeight + newWeightVal > 100) {
            setError('Суммарный вес не может превышать 100%');
            return;
        }
        setError(null);
        try {
            await axiosInstance.patch(`/grade-categories/${id}/`, {
                weight: newWeightVal
            });
            setCategories((prev) => prev.map((c) => c.id === id ? { ...c, weight: newWeightVal } : c));
            onUpdate?.();
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { weight?: string[] } } };
            setError(errorObj.response?.data?.weight?.[0] || 'Ошибка при обновлении');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Вы уверены что хотите удалить эту категорию? Вложенные оценки могут потерять категорию.')) return;
        setError(null);
        try {
            await axiosInstance.delete(`/grade-categories/${id}/`);
            await fetchCategories();
            onUpdate?.();
        } catch (err) {
            setError('Ошибка при удалении');
        }
    };

    if (loading) {
        return <div className="animate-pulse h-24 bg-gray-100 rounded-lg"></div>;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Настройка весовых категорий оценок</h3>
            <p className="text-xs text-gray-500 mb-3">
                Создайте категории оценок для этого предмета (например: "СОР", "СОЧ", "Домашние Задания"). 
                Суммарный вес должен быть обязательно равен 100%, иначе итоговые оценки могут считаться некорректно.
                Формативное оценивание (ФО) считается автоматически из ежедневных оценок.
            </p>

            {error && <p className="mb-3 text-sm text-red-600 font-medium">{error}</p>}

            <div className="overflow-x-auto mb-4">
                <table className="w-full min-w-[360px] text-sm text-left align-middle border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50">
                            <th className="py-2 px-3 font-medium">Название категории</th>
                            <th className="py-2 px-3 font-medium w-32">Вес (%)</th>
                            <th className="py-2 px-3 font-medium w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                <td className="py-2 px-3 font-medium text-gray-800">
                                    {cat.name}
                                    {cat.is_formative && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                            Auto (ФО)
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 px-3">
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={cat.weight}
                                        onChange={(e) => {
                                            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                                            setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, weight: v } : c));
                                        }}
                                        onBlur={(e) => {
                                            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                                            handleUpdateCategoryWeight(cat.id, cat.name, v);
                                        }}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </td>
                                <td className="py-2 px-3 text-right">
                                    {!cat.is_formative && (
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors inline-block"
                                            title="Удалить категорию"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {/* Input Row for New Category */}
                        <tr className="bg-blue-50/30">
                            <td className="py-2 px-3">
                                <input
                                    type="text"
                                    placeholder="Новая категория (напр. СОЧ)"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-2 py-1 border border-blue-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                                />
                            </td>
                            <td className="py-2 px-3 relative">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={newWeight || ''}
                                    onChange={(e) => setNewWeight(parseInt(e.target.value, 10) || 0)}
                                    placeholder="Вес"
                                    className="w-16 px-2 py-1 border border-blue-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white pr-6"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-xs text-blue-400">%</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                                <button
                                    onClick={handleCreateCategory}
                                    disabled={saving || !newName.trim()}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50 transition-colors"
                                    title="Добавить"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-2">
                <span className={`text-sm font-medium flex items-center gap-1.5 ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {totalWeight === 100 && <CheckCircle2 className="w-4 h-4" />}
                    Общий вес оценок: {totalWeight}%
                </span>
                {totalWeight !== 100 && (
                    <span className="text-xs text-amber-600/80">(Должно быть ровно 100%)</span>
                )}
            </div>
        </div>
    );
}

