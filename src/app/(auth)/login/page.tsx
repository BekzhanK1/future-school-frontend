'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useApi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
    const { t } = useLocale();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{
        username?: string;
        password?: string;
    }>({});

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
                    if (err.path[0] === 'username') {
                        newErrors.username = err.message;
                    } else if (err.path[0] === 'password') {
                        newErrors.password = err.message;
                    }
                });
                setErrors(newErrors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const result = await login({ username, password });
        console.log(result);

        if (result) {
            if (typeof window !== 'undefined') {
                router.push('/dashboard');
            }
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    Добро пожаловать!
                </h2>

                {authError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">
                            {t(`auth.${authError}`)}
                        </p>
                    </div>
                )}
            </div>

            {/* Form */}
            <form
                className="space-y-6 sm:space-y-8 md:space-y-10"
                onSubmit={handleSubmit}
            >
                <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                        <label
                            htmlFor="username"
                            className="block text-sm text-gray-700 font-bold mb-1"
                        >
                            Имя пользователя / Email / ИИН
                        </label>
                        <div className="relative">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg shadow-sm placeholder-gray-400 border ${
                                    errors.username
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } bg-white text-gray-900 focus:outline-none focus:ring-2`}
                                placeholder="student1, email@ex.com, или 123456789012"
                            />
                        </div>
                        {errors.username && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600">
                                {errors.username}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm text-gray-700 font-bold mb-1"
                        >
                            Пароль
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg shadow-sm placeholder-gray-400 ${
                                    errors.password
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } bg-white text-gray-900 focus:outline-none focus:ring-2`}
                                placeholder={t('auth.password')}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                                ) : (
                                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600">
                                {errors.password}
                            </p>
                        )}
                        <div className="text-xs text-gray-400 mt-1.5 sm:mt-2">
                            <Link
                                href="/reset-password"
                                className="font-medium float-end hover:text-gray-600"
                            >
                                <u className="font-semibold">
                                    {t('auth.forgotPassword')}
                                </u>
                            </Link>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-lg main-button text-white bg-gradient-to-r to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    {isLoading ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            {t('auth.signingIn')}
                        </div>
                    ) : (
                        <div className="flex items-center">
                            {t('auth.login')}
                        </div>
                    )}
                </button>
            </form>
        </div>
    );
}
