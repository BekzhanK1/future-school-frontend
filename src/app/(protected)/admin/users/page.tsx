'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, FileSpreadsheet, Download } from 'lucide-react';
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
            const usersData = Array.isArray(response.data)
                ? response.data
                : response.data.results || response.data.data || [];
            setUsers(usersData);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            const errorMessage =
                error?.formattedMessage ||
                error?.response?.data?.detail ||
                'Failed to load users';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (userData: Omit<UserData, 'id' | 'school_name'>) => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('/users/', userData);
            
            // The backend should return full user data, but ensure we have all fields
            if (response.data && response.data.id) {
                const newUser: UserData = {
                    id: response.data.id,
                    username: response.data.username,
                    email: response.data.email,
                    first_name: response.data.first_name || '',
                    last_name: response.data.last_name || '',
                    phone_number: response.data.phone_number || null,
                    role: response.data.role,
                    school: response.data.school || null,
                    school_name: response.data.school_name || null,
                    is_active: response.data.is_active !== undefined ? response.data.is_active : true,
                    kundelik_id: response.data.kundelik_id || null,
                };
                
                setUsers(prev => [...prev, newUser]);
                setShowCreateModal(false);
            } else {
                // Fallback: refetch users if response doesn't have expected structure
                console.warn('Unexpected response structure, refetching users...', response.data);
                await fetchUsers();
                setShowCreateModal(false);
            }
        } catch (error: any) {
            console.error('Error creating user:', error);
            const errorMessage =
                error?.formattedMessage ||
                error?.response?.data?.detail ||
                'Failed to create user. Please check the form data.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (
        id: number,
        userData: Partial<UserData>
    ) => {
        setLoading(true);
        try {
            const response = await axiosInstance.put(`/users/${id}/`, userData);
            
            // Ensure we have all fields from the response
            if (response.data && response.data.id) {
                const updatedUser: UserData = {
                    id: response.data.id,
                    username: response.data.username,
                    email: response.data.email,
                    first_name: response.data.first_name || '',
                    last_name: response.data.last_name || '',
                    phone_number: response.data.phone_number || null,
                    role: response.data.role,
                    school: response.data.school || null,
                    school_name: response.data.school_name || null,
                    is_active: response.data.is_active !== undefined ? response.data.is_active : true,
                    kundelik_id: response.data.kundelik_id || null,
                };
                
                setUsers(prev =>
                    prev.map(user => (user.id === id ? updatedUser : user))
                );
                setEditingUser(null);
            } else {
                // Fallback: refetch users if response doesn't have expected structure
                console.warn('Unexpected response structure, refetching users...', response.data);
                await fetchUsers();
                setEditingUser(null);
            }
        } catch (error: any) {
            console.error('Error updating user:', error);
            const errorMessage =
                error?.formattedMessage ||
                error?.response?.data?.detail ||
                'Failed to update user. Please check the form data.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        setLoading(true);
        try {
            await axiosInstance.delete(`/users/${id}/`);
            setUsers(prev => prev.filter(user => user.id !== id));
        } catch (error: any) {
            console.error('Error deleting user:', error);
            const errorMessage =
                error?.formattedMessage ||
                error?.response?.data?.detail ||
                'Failed to delete user.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto px-4 pb-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Поиск пользователей..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Все роли</option>
                            <option value="student">Ученики</option>
                            <option value="teacher">Учителя</option>
                            <option value="schooladmin">Администраторы школ</option>
                            <option value="superadmin">Супер-администраторы</option>
                            <option value="parent">Родители</option>
                        </select>
                    </div>
                    {canEdit && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportStudentsModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Импорт студентов
                            </button>
                            <button
                                onClick={() => setShowImportTeachersModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Импорт учителей
                            </button>
                            <button
                                onClick={() => setShowCredentialsModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Credentials
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Добавить пользователя
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Username
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Имя
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Фамилия
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Роль
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Школа
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    Статус
                                </th>
                                {canEdit && (
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                        Действия
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {user.first_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {user.last_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.role === 'superadmin'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : user.role === 'schooladmin'
                                                          ? 'bg-blue-100 text-blue-800'
                                                          : user.role === 'teacher'
                                                            ? 'bg-green-100 text-green-800'
                                                            : user.role === 'parent'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {user.role === 'superadmin'
                                                    ? 'Супер-админ'
                                                    : user.role === 'schooladmin'
                                                      ? 'Админ школы'
                                                      : user.role === 'teacher'
                                                        ? 'Учитель'
                                                        : user.role === 'parent'
                                                          ? 'Родитель'
                                                          : 'Ученик'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.school_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {user.is_active ? 'Активен' : 'Неактивен'}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    {user.role === 'parent' && (
                                                        <button
                                                            onClick={() =>
                                                                setParentForChildrenModal(user)
                                                            }
                                                            className="p-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                                                            disabled={loading}
                                                            title="Дети родителя"
                                                        >
                                                            <Users className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            setEditingUser(user)
                                                        }
                                                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                        disabled={loading}
                                                        title="Редактировать"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteUser(user.id)
                                                        }
                                                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                        disabled={loading}
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={canEdit ? 8 : 7}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        {searchQuery || roleFilter !== 'all'
                                            ? 'Пользователи не найдены'
                                            : 'Нет пользователей'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <UserModal
                isOpen={showCreateModal || !!editingUser}
                user={editingUser}
                onSave={
                    editingUser
                        ? data => handleUpdateUser(editingUser.id, data)
                        : handleCreateUser
                }
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                }}
                loading={loading}
            />

            {/* Import Students Excel Modal */}
            <ImportStudentsExcelModal
                isOpen={showImportStudentsModal}
                onClose={() => setShowImportStudentsModal(false)}
                onImportComplete={() => {
                    setShowImportStudentsModal(false);
                    fetchUsers(); // Refresh users list
                }}
            />

            {/* Import Teachers Excel Modal */}
            <ImportTeachersExcelModal
                isOpen={showImportTeachersModal}
                onClose={() => setShowImportTeachersModal(false)}
                onImportComplete={() => {
                    setShowImportTeachersModal(false);
                    fetchUsers(); // Refresh users list
                }}
            />

            {/* Parent–Children Modal */}
            <ParentChildrenModal
                isOpen={!!parentForChildrenModal}
                parentId={parentForChildrenModal?.id || null}
                parentName={
                    parentForChildrenModal
                        ? `${parentForChildrenModal.first_name} ${parentForChildrenModal.last_name}`.trim() ||
                          parentForChildrenModal.username
                        : undefined
                }
                onClose={() => setParentForChildrenModal(null)}
            />

            <CredentialsFilesModal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
            />
        </div>
    );
}
