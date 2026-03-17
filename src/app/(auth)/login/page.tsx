'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Clock } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useApi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';

const loginSchema = z.object({
    username: z.string().min(1, 'Введите имя пользователя'),
    password: z.string().min(1, 'Введите пароль').min(6, 'Минимум 6 символов'),
});

export default function LoginPage() {
    const { t } = useLocale();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('session_expired') === 'true') setSessionExpiredMsg(true);
        }
    }, []);

    const { login, loading: isLoading, error: authError } = useAuth();
    const router = useRouter();

    const validateForm = (): boolean => {
        try {
            loginSchema.parse({ username, password });
            setErrors({});
            return true;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                const newErrors: { username?: string; password?: string } = {};
                error.issues.forEach((err: z.ZodIssue) => {
                    if (err.path[0] === 'username') newErrors.username = err.message;
                    else if (err.path[0] === 'password') newErrors.password = err.message;
                });
                setErrors(newErrors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        const result = await login({ username, password });
        if (result) router.push('/dashboard');
    };

    return (
        <div className="space-y-7">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Добро пожаловать
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Войдите в свой аккаунт Future School
                </p>
            </div>

            {/* Alerts */}
            {sessionExpiredMsg && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        Сессия истекла. Пожалуйста, войдите снова.
                    </p>
                </div>
            )}
            {authError && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{t(`auth.${authError}`)}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Имя пользователя
                    </label>
                    <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="student1"
                        className={`block w-full px-4 py-3 text-sm bg-gray-50 border rounded-xl placeholder-gray-400 text-gray-900 transition-colors focus:outline-none focus:bg-white focus:ring-2 ${
                            errors.username
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-gray-200 focus:border-violet-400 focus:ring-violet-100'
                        }`}
                    />
                    {errors.username && (
                        <p className="text-xs text-red-600 mt-1">{errors.username}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Пароль
                        </label>
                        <Link
                            href="/reset-password"
                            className="text-xs font-medium text-violet-600 hover:text-violet-700"
                        >
                            Забыли пароль?
                        </Link>
                    </div>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`block w-full px-4 py-3 pr-11 text-sm bg-gray-50 border rounded-xl placeholder-gray-400 text-gray-900 transition-colors focus:outline-none focus:bg-white focus:ring-2 ${
                                errors.password
                                    ? 'border-red-300 focus:ring-red-200'
                                    : 'border-gray-200 focus:border-violet-400 focus:ring-violet-100'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            {showPassword
                                ? <EyeOff className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />
                            }
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Входим...</span>
                        </>
                    ) : (
                        <>
                            <LogIn className="w-4 h-4" />
                            <span>Войти</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
