'use client';

import { useState, useCallback } from 'react';
import {
    User, Mail, Phone, BookOpen, Award, Settings,
    Edit, CheckCircle, Clock, LogOut, Save, X, Lock, Shield,
} from 'lucide-react';
import { useUserState, useUserActions } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';

const AVATAR_OPTIONS: { key: string; emoji: string }[] = [
    { key: '', emoji: '' },
    { key: '1', emoji: '👤' },
    { key: '2', emoji: '🧑' },
    { key: '3', emoji: '👩' },
    { key: '4', emoji: '👨' },
    { key: '5', emoji: '🧒' },
    { key: '6', emoji: '👴' },
    { key: '7', emoji: '👵' },
    { key: '8', emoji: '🦊' },
];

const ROLE_META: Record<string, { label: string; bg: string; text: string; Icon: any }> = {
    student:     { label: 'Ученик',       bg: 'bg-sky-100',     text: 'text-sky-800',     Icon: BookOpen },
    teacher:     { label: 'Учитель',      bg: 'bg-emerald-100', text: 'text-emerald-800', Icon: Award },
    schooladmin: { label: 'Администратор', bg: 'bg-blue-100',    text: 'text-blue-800',    Icon: Settings },
    superadmin:  { label: 'Супер-админ',  bg: 'bg-violet-100',  text: 'text-violet-800',  Icon: Shield },
};

function getRoleMeta(role: string) {
    return ROLE_META[role] ?? { label: role, bg: 'bg-gray-100', text: 'text-gray-700', Icon: User };
}

const AVATAR_COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-600',
];

export default function ProfilePage() {
    const { user, isAuthenticated, isLoading, error } = useUserState();
    const { logout, clearError, loginSuccess } = useUserActions();
    const { t } = useLocale();
    const [isEditing, setIsEditing] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [editAvatar, setEditAvatar] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-gray-500">{t('profile.notAuthenticated')}</p>
                <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
                    {t('profile.logout')}
                </button>
            </div>
        );
    }

    const fullName = user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.name || user.username;
    const firstLetter = fullName.charAt(0).toUpperCase();
    const roleInfo = getRoleMeta(user.role);

    const displayAvatarKey = isEditing ? editAvatar : (user.avatar ?? '');
    const avatarOpt = AVATAR_OPTIONS.find(o => o.key === displayAvatarKey);
    const showEmoji = displayAvatarKey && avatarOpt?.emoji;

    const colorIdx = (user.id ?? 0) % AVATAR_COLORS.length;
    const avatarGradient = AVATAR_COLORS[colorIdx];

    const startEditing = () => {
        setEditPhone(user.phone_number ?? '');
        setEditAvatar(user.avatar ?? '');
        setSaveError(null);
        setIsEditing(true);
    };

    const cancelEditing = () => { setIsEditing(false); setSaveError(null); };

    const saveProfile = useCallback(async () => {
        if (!user?.id) return;
        setSaving(true);
        setSaveError(null);
        try {
            const payload: any = {};
            if (editPhone !== (user.phone_number ?? '')) payload.phone_number = editPhone || '';
            if (editAvatar !== (user.avatar ?? '')) payload.avatar = editAvatar || '';
            const { data } = await axiosInstance.patch(`/users/${user.id}/`, payload);
            const merged = { ...user, ...data };
            loginSuccess(merged);
            if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(merged));
            setIsEditing(false);
        } catch (err: any) {
            setSaveError(err?.formattedMessage || t('profile.saveError'));
        } finally {
            setSaving(false);
        }
    }, [user, editPhone, editAvatar, loginSuccess, t]);

    const handleChangePassword = useCallback(async () => {
        if (!pwCurrent || !pwNew) { setPwError(t('profile.passwordRequired')); return; }
        if (pwNew !== pwConfirm) { setPwError(t('profile.passwordsMismatch')); return; }
        setPwSaving(true);
        setPwError(null);
        setPwSuccess(null);
        try {
            await axiosInstance.post('/auth/change-password/', { current_password: pwCurrent, new_password: pwNew });
            setPwSuccess(t('profile.passwordChanged'));
            setPwCurrent(''); setPwNew(''); setPwConfirm('');
            logout();
        } catch (err: any) {
            const d = err?.response?.data;
            let msg = t('profile.passwordChangeError');
            if (d) {
                if (typeof d === 'string') msg = d;
                else if (d.current_password) msg = Array.isArray(d.current_password) ? d.current_password[0] : String(d.current_password);
                else if (d.non_field_errors) msg = Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : String(d.non_field_errors);
                else if (d.detail) msg = String(d.detail);
            }
            setPwError(msg);
        } finally {
            setPwSaving(false);
        }
    }, [pwCurrent, pwNew, pwConfirm, logout, t]);

    const classroom = user.student_data?.classrooms?.[0];

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Profile hero card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Banner */}
                    <div className={`h-24 bg-gradient-to-r ${avatarGradient} opacity-20`} />

                    <div className="px-6 pb-6 -mt-12">
                        <div className="flex items-end justify-between gap-4">
                            {/* Avatar */}
                            <div className="relative">
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white shadow-lg border-4 border-white`}>
                                    {showEmoji ? (
                                        <span className="text-3xl">{avatarOpt?.emoji}</span>
                                    ) : (
                                        <span className="text-2xl font-bold">{firstLetter}</span>
                                    )}
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={startEditing}
                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                                    >
                                        <Edit className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                )}
                            </div>

                            {/* Role badge */}
                            <div className="mb-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${roleInfo.bg} ${roleInfo.text}`}>
                                    <roleInfo.Icon className="w-4 h-4" />
                                    {roleInfo.label}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3">
                            <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>

                        {/* Info row */}
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                            {user.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {user.email}
                                </div>
                            )}
                            {user.phone_number && !isEditing && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {user.phone_number}
                                </div>
                            )}
                            {classroom && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <BookOpen className="w-4 h-4 text-gray-400" />
                                    {classroom.grade}{classroom.letter} класс
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                        {t('profile.phone')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={e => setEditPhone(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                        placeholder={t('profile.phonePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                        {t('profile.avatar')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVATAR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.key || 'default'}
                                                type="button"
                                                onClick={() => setEditAvatar(opt.key)}
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 transition-all ${
                                                    editAvatar === opt.key
                                                        ? 'border-violet-500 bg-violet-50 shadow-sm'
                                                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                                }`}
                                            >
                                                {opt.key ? opt.emoji : <span className="text-sm font-bold text-gray-500">{firstLetter}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={saveProfile}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? '...' : t('profile.save')}
                                </button>
                                <button
                                    onClick={cancelEditing}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    {t('profile.cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Change password card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <h2 className="text-sm font-bold text-gray-900">{t('profile.changePassword')}</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: t('profile.currentPassword'), value: pwCurrent, setter: setPwCurrent },
                                { label: t('profile.newPassword'),      value: pwNew,     setter: setPwNew },
                                { label: t('profile.confirmPassword'),  value: pwConfirm, setter: setPwConfirm },
                            ].map(({ label, value, setter }) => (
                                <div key={label}>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                                    <input
                                        type="password"
                                        value={value}
                                        onChange={e => setter(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                </div>
                            ))}
                        </div>
                        {pwError && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{pwError}</div>
                        )}
                        {pwSuccess && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">{pwSuccess}</div>
                        )}
                        <div className="mt-4">
                            <button
                                onClick={handleChangePassword}
                                disabled={pwSaving}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <Lock className="w-4 h-4" />
                                {pwSaving ? '...' : (t('profile.changePasswordButton') || t('profile.changePassword'))}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Student stats (if student) */}
                {user.role === 'student' && (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: BookOpen, label: t('profile.totalSubjects'), value: user.student_data?.subjects?.length || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { icon: CheckCircle, label: t('profile.completedTasks'), value: 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { icon: Clock, label: t('profile.pendingTasks'), value: 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map(({ icon: Icon, label, value, color, bg }) => (
                            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Logout */}
                <div className="flex justify-end">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('profile.logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
