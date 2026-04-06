'use client';

import { useState, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { AxiosError } from 'axios';
import { useUserState, useUserActions } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';

export default function ForcePasswordChangeGate() {
    const { user } = useUserState();
    const { logout } = useUserActions();
    const { t } = useLocale();
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!pwCurrent || !pwNew) {
            setPwError(t('profile.passwordRequired'));
            return;
        }
        if (pwNew !== pwConfirm) {
            setPwError(t('profile.passwordsMismatch'));
            return;
        }
        setPwSaving(true);
        setPwError(null);
        try {
            await axiosInstance.post('/auth/change-password/', {
                current_password: pwCurrent,
                new_password: pwNew,
            });
            logout();
        } catch (err: unknown) {
            const ax = err as AxiosError<unknown>;
            const raw = ax.response?.data;
            let msg = t('profile.passwordChangeError');
            if (typeof raw === 'string') {
                msg = raw;
            } else if (raw && typeof raw === 'object') {
                const d = raw as Record<string, unknown>;
                if (Array.isArray(d.current_password)) {
                    msg = String(d.current_password[0]);
                } else if (d.current_password) {
                    msg = String(d.current_password);
                } else if (Array.isArray(d.non_field_errors)) {
                    msg = String(d.non_field_errors[0]);
                } else if (d.non_field_errors) {
                    msg = String(d.non_field_errors);
                } else if (d.detail) {
                    msg = String(d.detail);
                }
            }
            setPwError(msg);
        } finally {
            setPwSaving(false);
        }
    }, [pwCurrent, pwNew, pwConfirm, logout, t]);

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                        <Lock className="h-7 w-7" aria-hidden />
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">
                        {t('profile.mustChangePasswordTitle')}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('profile.mustChangePasswordDescription')}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            {t('profile.currentPassword')}
                        </label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={pwCurrent}
                            onChange={e => setPwCurrent(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            {t('profile.newPassword')}
                        </label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={pwNew}
                            onChange={e => setPwNew(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            {t('profile.confirmPassword')}
                        </label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={pwConfirm}
                            onChange={e => setPwConfirm(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                    </div>

                    {pwError && (
                        <p className="text-sm text-red-600" role="alert">
                            {pwError}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={pwSaving}
                        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                    >
                        {pwSaving ? t('profile.savingPassword') : t('profile.changePasswordButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
