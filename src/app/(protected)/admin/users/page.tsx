'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Users, FileSpreadsheet, Download, Search, ChevronDown } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import axiosInstance from '@/lib/axios';
import UserModal from '@/components/users/UserModal';
import { useRouter } from 'next/navigation';
import ParentChildrenModal from '@/components/users/ParentChildrenModal';
import ImportStudentsExcelModal from '@/components/users/ImportStudentsExcelModal';
import ImportTeachersExcelModal from '@/components/users/ImportTeachersExcelModal';
import CredentialsFilesModal from '@/components/users/CredentialsFilesModal';

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    role: 'superadmin' | 'schooladmin' | 'teacher' | 'student' | 'parent';
    school?: number | null;
    school_name?: string;
    is_active: boolean;
    kundelik_id?: string | null;
}

const ROLE_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    superadmin:  { label: 'Супер-админ',  bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500' },
    schooladmin: { label: 'Админ школы',  bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500' },
    teacher:     { label: 'Учитель',      bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    parent:      { label: 'Родитель',     bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500' },
    student:     { label: 'Ученик',       bg: 'bg-sky-100',     text: 'text-sky-800',     dot: 'bg-sky-500' },
};

function getInitials(user: UserData): string {
    const f = user.first_name?.charAt(0) ?? '';
    const l = user.last_name?.charAt(0) ?? '';
    return (f + l).toUpperCase() || user.username.charAt(0).toUpperCase();
}

const AVATAR_COLORS = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
    'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500',
];

function getAvatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [parentForChildrenModal, setParentForChildrenModal] = useState<UserData | null>(null);
    const [showImportStudentsModal, setShowImportStudentsModal] = useState(false);
    const [showImportTeachersModal, setShowImportTeachersModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const { user } = useUserState();
    const router = useRouter();

    const canEdit = user?.role === 'superadmin';

    useEffect(() => {
        if (user && user.role !== 'superadmin') {
            router.push('/dashboard');
        } else {
            fetchUsers();
        }
    }, [user, router]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/users/');
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setUsers(data);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            alert(error?.response?.data?.detail || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (userData: Omit<UserData, 'id' | 'school_name'>) => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('/users/', userData);
            if (response.data?.id) {
                setUsers(prev => [...prev, response.data]);
                setShowCreateModal(false);
            } else {
                await fetchUsers();
                setShowCreateModal(false);
            }
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (id: number, userData: Partial<UserData>) => {
        setLoading(true);
        try {
            const response = await axiosInstance.put(`/users/${id}/`, userData);
            if (response.data?.id) {
                setUsers(prev => prev.map(u => u.id === id ? response.data : u));
                setEditingUser(null);
            } else {
                await fetchUsers();
                setEditingUser(null);
            }
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Удалить пользователя? Это действие нельзя отменить.')) return;
        setLoading(true);
        try {
            await axiosInstance.delete(`/users/${id}/`);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        total: users.length,
        students: users.filter(u => u.role === 'student').length,
        teachers: users.filter(u => u.role === 'teacher').length,
        parents: users.filter(u => u.role === 'parent').length,
        admins: users.filter(u => u.role === 'schooladmin' || u.role === 'superadmin').length,
    }), [users]);

    const filteredUsers = useMemo(() => users.filter(u => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            u.username.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.first_name?.toLowerCase().includes(q) ||
            u.last_name?.toLowerCase().includes(q);
        return matchesSearch && (roleFilter === 'all' || u.role === roleFilter);
    }), [users, searchQuery, roleFilter]);

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="mx-auto max-w-screen-xl px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{users.length} всего</p>
                    </div>
                    {canEdit && (
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setShowImportStudentsModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                                <FileSpreadsheet className="w-4 h-4" /> Импорт студентов
                            </button>
                            <button onClick={() => setShowImportTeachersModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">
                                <FileSpreadsheet className="w-4 h-4" /> Импорт учителей
                            </button>
                            <button onClick={() => setShowCredentialsModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium">
                                <Download className="w-4 h-4" /> Credentials
                            </button>
                            <button onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                                <Plus className="w-4 h-4" /> Добавить
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Всего', value: stats.total, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200', key: 'all' },
                        { label: 'Ученики', value: stats.students, color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-100', key: 'student' },
                        { label: 'Учителя', value: stats.teachers, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', key: 'teacher' },
                        { label: 'Родители', value: stats.parents, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', key: 'parent' },
                        { label: 'Админы', value: stats.admins, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', key: 'schooladmin' },
                    ].map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setRoleFilter(s.key)}
                            className={`${s.bg} border ${s.border} rounded-xl p-4 text-left transition-all hover:shadow-md ${roleFilter === s.key ? 'ring-2 ring-violet-400' : ''}`}
                        >
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </button>
                    ))}
                </div>

                {/* Search + filter */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Поиск по имени, username, email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-700"
                        >
                            <option value="all">Все роли</option>
                            <option value="student">Ученики</option>
                            <option value="teacher">Учителя</option>
                            <option value="schooladmin">Администраторы</option>
                            <option value="superadmin">Супер-админ</option>
                            <option value="parent">Родители</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">
                                {searchQuery || roleFilter !== 'all' ? 'Пользователи не найдены' : 'Нет пользователей'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/70">
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Пользователь</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Роль</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Школа</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
                                        {canEdit && <th className="px-5 py-3.5" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map(u => {
                                        const meta = ROLE_META[u.role] ?? ROLE_META.student;
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50/60 transition-colors group">
                                                {/* Avatar + name */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`${getAvatarColor(u.id)} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                                            {getInitials(u)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {u.first_name || u.last_name
                                                                    ? `${u.first_name} ${u.last_name}`.trim()
                                                                    : u.username}
                                                            </p>
                                                            <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">
                                                    {u.email || <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${meta.bg} ${meta.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[160px] truncate">
                                                    {u.school_name || <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                                        u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                                                        {u.is_active ? 'Активен' : 'Неактивен'}
                                                    </span>
                                                </td>
                                                {canEdit && (
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {u.role === 'parent' && (
                                                                <button
                                                                    onClick={() => setParentForChildrenModal(u)}
                                                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                                                    title="Дети родителя"
                                                                >
                                                                    <Users className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEditingUser(u)}
                                                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                                title="Редактировать"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                                title="Удалить"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredUsers.length > 0 && (
                                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
                                    Показано {filteredUsers.length} из {users.length}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <UserModal
                isOpen={showCreateModal || !!editingUser}
                user={editingUser}
                onSave={editingUser ? data => handleUpdateUser(editingUser.id, data) : handleCreateUser}
                onClose={() => { setShowCreateModal(false); setEditingUser(null); }}
                loading={loading}
            />
            <ImportStudentsExcelModal
                isOpen={showImportStudentsModal}
                onClose={() => setShowImportStudentsModal(false)}
                onImportComplete={() => { setShowImportStudentsModal(false); fetchUsers(); }}
            />
            <ImportTeachersExcelModal
                isOpen={showImportTeachersModal}
                onClose={() => setShowImportTeachersModal(false)}
                onImportComplete={() => { setShowImportTeachersModal(false); fetchUsers(); }}
            />
            <ParentChildrenModal
                isOpen={!!parentForChildrenModal}
                parentId={parentForChildrenModal?.id || null}
                parentName={parentForChildrenModal
                    ? `${parentForChildrenModal.first_name} ${parentForChildrenModal.last_name}`.trim() || parentForChildrenModal.username
                    : undefined}
                onClose={() => setParentForChildrenModal(null)}
            />
            <CredentialsFilesModal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
            />
        </div>
    );
}
