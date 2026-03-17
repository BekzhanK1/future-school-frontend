'use client';

import { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { GradeCategory } from './GradeCategoriesManager';

interface Student {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
}

interface AddManualGradeModalProps {
    subjectGroupId: number;
    subjectName?: string;
    students: Student[];
    defaultStudentId?: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddManualGradeModal({
    subjectGroupId,
    subjectName,
    students,
    defaultStudentId,
    onClose,
    onSuccess,
}: AddManualGradeModalProps) {
    const { t } = useLocale();
    const [categories, setCategories] = useState<GradeCategory[]>([]);
    const [fetchingCategories, setFetchingCategories] = useState(false);

    useEffect(() => {
        if (subjectGroupId) {
            setFetchingCategories(true);
            axiosInstance.get('/grade-categories/', { params: { subject_group: subjectGroupId } })
                .then(res => {
                    const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                    setCategories(list);
                    if (list.length > 0) {
                        setCategoryId(list[0].id);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setFetchingCategories(false));
        }
    }, [subjectGroupId]);

    const [studentId, setStudentId] = useState<number | ''>(defaultStudentId ?? '');
    const [value, setValue] = useState<string>('5');
    const [maxValue, setMaxValue] = useState<string>('5');
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState<number | ''>('');
    const [weightInCategory, setWeightInCategory] = useState<string>('100');
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const numValue = parseInt(value, 10);
        const numMax = parseInt(maxValue, 10);
        const numWeight = parseInt(weightInCategory, 10);
        if (!studentId || isNaN(numValue) || numValue < 0 || isNaN(numMax) || numMax < 1 || !categoryId || isNaN(numWeight)) {
            setError(t('manualGrade.selectStudentAndScore') || 'Заполните все поля: Ученик, Оценка, Категория, Вес');
            return;
        }
        if (numValue > numMax) {
            setError(t('manualGrade.scoreNotGreaterThanMax'));
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.post('/manual-grades/', {
                student: studentId,
                subject_group: subjectGroupId,
                value: numValue,
                max_value: numMax,
                title: title.trim() || undefined,
                category: categoryId,
                weight_in_category: numWeight,
                feedback: feedback.trim() || undefined,
            });
            onSuccess();
        } catch (err: unknown) {
            const msg = (err as { formattedMessage?: string })?.formattedMessage ?? t('manualGrade.saveError');
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={t('manualGrade.title')}>
            {subjectName && (
                <p className="text-sm text-gray-600 mb-4">{t('manualGrade.subjectLabel')}: {subjectName}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('manualGrade.studentLabel')}</label>
                    <select
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : '')}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">{t('manualGrade.selectStudent')}</option>
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.last_name} {s.first_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manualGrade.scoreLabel')}</label>
                        <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manualGrade.maxScoreLabel')}</label>
                        <select
                            value={maxValue}
                            onChange={(e) => setMaxValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="5">5</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Категория оценки</label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                        disabled={fetchingCategories}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.weight}%) {cat.is_formative ? ' [Авто ФО]' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Вес оценки внутри категории (%)</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={weightInCategory}
                        onChange={(e) => setWeightInCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Например, 100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Обычно весит 100%. Если в категории несколько оценок, их средний балл считается с учётом этого веса.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('manualGrade.titleOptional')}</label>
                    <input
                        type="text"
                        placeholder={t('manualGrade.titlePlaceholder')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('manualGrade.commentOptional')}</label>
                    <textarea
                        rows={2}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        {t('profile.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? t('actions.saving') : t('profile.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
