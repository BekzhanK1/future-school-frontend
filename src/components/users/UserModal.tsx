'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    role: 'superadmin' | 'schooladmin' | 'teacher' | 'student' | 'parent';
    school?: number | null;
    is_active: boolean;
    kundelik_id?: string | null;
    iin?: string | null;
}

interface School {
    id: number;
    name: string;
}

interface UserModalProps {
    isOpen: boolean;
    user?: UserData | null;
    onSave: (data: Omit<UserData, 'id'> & { password?: string; password_confirm?: string }) => void;
    onClose: () => void;
    loading?: boolean;
}

export default function UserModal({
    isOpen,
    user,
    onSave,
    onClose,
    loading = false,
}: UserModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        role: 'student' as const,
        school: 0,
        kundelik_id: '',
        iin: '',
    });

    useEffect(() => {
        if (isOpen) {
            fetchSchools();
        }
    }, [isOpen]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const response = await axiosInstance.get('/schools/');
            const schoolsData = Array.isArray(response.data)
                ? response.data
                : response.data.results || [];
            setSchools(schoolsData);
        } catch (err) {
            console.error('Error fetching schools:', err);
        } finally {
            setLoadingSchools(false);
        }
    };

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone_number: user.phone_number || '',
                password: '',
                password_confirm: '',
                role: user.role,
                school: user.school || 0,
                kundelik_id: user.kundelik_id || '',
                iin: user.iin || '',
            });
        } else if (isOpen) {
            setFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                phone_number: '',
                password: '',
                password_confirm: '',
                role: 'student',
                school: 0,
                kundelik_id: '',
                iin: '',
            });
        }
    }, [user, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.username.trim()) {
            setError('Username обязателен');
            return;
        }

        if (!formData.email.trim()) {
            setError('Email обязателен');
            return;
        }

        // For new users, password is required
        if (!user) {
            if (!formData.password) {
                setError('Пароль обязателен');
                return;
            }
            if (formData.password.length < 6) {
                setError('Пароль должен быть не менее 6 символов');
                return;
            }
            if (formData.password !== formData.password_confirm) {
                setError('Пароли не совпадают');
                return;
            }
        } else {
            // For updates, only validate password if provided
            if (formData.password) {
                if (formData.password.length < 6) {
                    setError('Пароль должен быть не менее 6 символов');
                    return;
                }
                if (formData.password !== formData.password_confirm) {
                    setError('Пароли не совпадают');
                    return;
                }
            }
        }

        // Prepare data
        const submitData: any = {
            username: formData.username.trim(),
            email: formData.email.trim(),
            first_name: formData.first_name.trim() || '',
            last_name: formData.last_name.trim() || '',
            role: formData.role,
            is_active: true, // Always set to active by default
        };

        if (formData.phone_number.trim()) {
            submitData.phone_number = formData.phone_number.trim();
        }

        if (formData.school > 0) {
            submitData.school = formData.school;
        }

        if (formData.kundelik_id.trim()) {
            submitData.kundelik_id = formData.kundelik_id.trim();
        }

        if (formData.iin.trim()) {
            submitData.iin = formData.iin.trim();
        }

        // Only include password fields for new users or if password is being changed
        if (!user || formData.password) {
            submitData.password = formData.password;
            submitData.password_confirm = formData.password_confirm;
        }

        onSave(submitData);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const isEditing = !!user;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Редактировать пользователя' : 'Создать пользователя'}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            required
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            placeholder="email@example.com"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Имя
                        </label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Имя"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Фамилия
                        </label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Фамилия"
                        />
                    </div>
                </div>

                {!isEditing && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Пароль <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={!isEditing}
                                placeholder="Минимум 6 символов"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Подтвердите пароль <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="password_confirm"
                                value={formData.password_confirm}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={!isEditing}
                                placeholder="Повторите пароль"
                            />
                        </div>
                    </div>
                )}

                {isEditing && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Новый пароль (оставьте пустым, чтобы не менять)
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Минимум 6 символов"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Подтвердите новый пароль
                            </label>
                            <input
                                type="password"
                                name="password_confirm"
                                value={formData.password_confirm}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Повторите пароль"
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Роль <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="student">Ученик</option>
                            <option value="teacher">Учитель</option>
                            <option value="schooladmin">Администратор школы</option>
                            <option value="superadmin">Супер-администратор</option>
                            <option value="parent">Родитель</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Школа
                        </label>
                        <select
                            name="school"
                            value={formData.school}
                            onChange={handleChange}
                            disabled={loadingSchools}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            {loadingSchools ? (
                                <option>Загрузка школ...</option>
                            ) : (
                                <>
                                    <option value={0}>Не выбрано</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>
                                            {school.name}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Телефон
                        </label>
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+7 (XXX) XXX-XX-XX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kundelik ID
                        </label>
                        <input
                            type="text"
                            name="kundelik_id"
                            value={formData.kundelik_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Kundelik ID"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ИИН
                        </label>
                        <input
                            type="text"
                            name="iin"
                            value={formData.iin}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="12-значный ИИН"
                            maxLength={12}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading
                            ? 'Сохранение...'
                            : isEditing
                              ? 'Обновить'
                              : 'Создать'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
