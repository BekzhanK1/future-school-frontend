'use client';

import { useEffect, useState } from 'react';
import { Search, Clock, Users, UserCheck, GraduationCap } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { useSubject } from '../../layout';

interface Member {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'teacher' | 'student';
    last_login: string | null;
}

function getInitials(first: string, last: string) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function getAvatarColor(name: string) {
    const colors = [
        'bg-violet-100 text-violet-700',
        'bg-blue-100 text-blue-700',
        'bg-emerald-100 text-emerald-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-cyan-100 text-cyan-700',
        'bg-indigo-100 text-indigo-700',
        'bg-orange-100 text-orange-700',
    ];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[hash % colors.length];
}

export default function ParticipantsPage() {
    const { subject } = useSubject();
    const { t } = useLocale();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'student'>('all');

    useEffect(() => {
        if (subject?.id) fetchMembers();
    }, [subject?.id]);

    const fetchMembers = async () => {
        if (!subject?.id) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/subject-groups/${subject.id}/members/`);
            setData(response.data);
            setError(null);
        } catch {
            setError(t('participantsPage.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const formatLastLogin = (lastLogin: string | null) => {
        if (!lastLogin) return t('participantsPage.lastLoginNever');
        const date = new Date(lastLogin);
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return t('participantsPage.lastLoginJustNow');
        if (minutes < 60) return t('participantsPage.lastLoginMinutesAgo', { minutes });
        if (hours < 24) return t('participantsPage.lastLoginHoursAgo', { hours });
        if (days < 7) return t('participantsPage.lastLoginDaysAgo', { days });
        return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const allMembers: Member[] = [
        ...(data?.teacher ? [data.teacher] : []),
        ...(data?.students || []),
    ];

    const filteredMembers = allMembers.filter((m) => {
        const matchSearch =
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch && (filterRole === 'all' || m.role === filterRole);
    });

    const neverLoggedIn = filteredMembers.filter((m) => !m.last_login).length;

    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                    <p className="text-red-600 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    const ROLE_TABS = [
        { id: 'all' as const, label: t('participantsPage.filterAll'), count: allMembers.length },
        { id: 'teacher' as const, label: t('participantsPage.filterTeachers'), count: allMembers.filter(m => m.role === 'teacher').length },
        { id: 'student' as const, label: t('participantsPage.filterStudents'), count: allMembers.filter(m => m.role === 'student').length },
    ];

    return (
        <div className="p-4 space-y-4">
            {/* Header stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Users className="w-4.5 h-4.5 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{allMembers.length}</p>
                        <p className="text-xs text-gray-500">{t('participantsPage.cardTotal')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{allMembers.filter(m => m.role === 'student').length}</p>
                        <p className="text-xs text-gray-500">{t('participantsPage.filterStudents')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4.5 h-4.5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600">{neverLoggedIn}</p>
                        <p className="text-xs text-gray-500">{t('participantsPage.cardNeverLoggedIn')}</p>
                    </div>
                </div>
            </div>

            {/* Search + filter */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('participantsPage.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                </div>
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    {ROLE_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterRole(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                filterRole === tab.id
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label} <span className="opacity-60">{tab.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/80">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-8">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('participantsPage.columnParticipant')}</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t('participantsPage.columnEmail')}</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('participantsPage.columnRole')}</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t('participantsPage.columnLastLogin')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                        <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p>Участники не найдены</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member, idx) => {
                                    const avatarColor = getAvatarColor(`${member.first_name}${member.last_name}`);
                                    const isTeacher = member.role === 'teacher';
                                    return (
                                        <tr key={`${member.role}-${member.id}`} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}>
                                                        {getInitials(member.first_name, member.last_name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{member.first_name} {member.last_name}</p>
                                                        <p className="text-xs text-gray-400">@{member.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                {member.email ? (
                                                    <a href={`mailto:${member.email}`} className="text-gray-500 text-xs hover:text-violet-600 transition-colors">
                                                        {member.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                                    isTeacher
                                                        ? 'bg-violet-100 text-violet-700'
                                                        : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {isTeacher ? t('participantsPage.roleTeacher') : t('participantsPage.roleStudent')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className={`flex items-center gap-1.5 text-xs ${member.last_login ? 'text-gray-500' : 'text-amber-600'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${member.last_login ? 'bg-gray-300' : 'bg-amber-400'}`} />
                                                    {formatLastLogin(member.last_login)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredMembers.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
                        <p className="text-xs text-gray-400">{t('participantsPage.foundCount', { count: filteredMembers.length })}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
