'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    Bell,
    HelpCircle,
    Settings,
    LogOut,
    Library,
    Building2,
    Users,
    MessageCircle,
    MessageSquare,
    CalendarDays,
    GraduationCap,
    ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { useUserState, useUserActions } from '@/contexts/UserContext';
import { useSidebar } from '@/contexts/SidebarContext';
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

const ROLE_COLORS: Record<string, string> = {
    superadmin: 'from-violet-600 to-purple-700',
    schooladmin: 'from-blue-600 to-indigo-700',
    teacher: 'from-emerald-500 to-teal-600',
    student: 'from-orange-500 to-amber-600',
    parent: 'from-pink-500 to-rose-600',
};

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Супер Админ',
    schooladmin: 'Администратор',
    teacher: 'Учитель',
    student: 'Ученик',
    parent: 'Родитель',
};

// Main nav sections
const navSections = [
    {
        label: 'Главное',
        items: [
            {
                key: 'home',
                href: '/dashboard',
                icon: LayoutDashboard,
                roles: ['teacher', 'student', 'superadmin', 'schooladmin', 'parent'],
            },
            {
                key: 'subjects',
                href: '/subjects',
                icon: BookOpen,
                roles: ['teacher', 'student'],
            },
            {
                key: 'diary',
                href: '/diary',
                icon: FileText,
                roles: ['teacher', 'student'],
            },
            {
                key: 'messages',
                href: '/messages',
                icon: MessageSquare,
                roles: ['teacher', 'parent'],
            },
            {
                key: 'questions',
                href: '/qa',
                icon: MessageCircle,
                roles: ['teacher'],
            },
        ],
    },
    {
        label: 'Управление',
        items: [
            {
                key: 'classrooms',
                href: '/classrooms',
                icon: GraduationCap,
                roles: ['schooladmin', 'superadmin'],
            },
            {
                key: 'courses',
                href: '/admin/courses',
                icon: Library,
                roles: ['superadmin', 'schooladmin'],
            },
            {
                key: 'schedule',
                href: '/admin/schedule',
                icon: CalendarDays,
                roles: ['superadmin', 'schooladmin'],
            },
            {
                key: 'users',
                href: '/admin/users',
                icon: Users,
                roles: ['superadmin'],
            },
            {
                key: 'schools',
                href: '/admin/schools',
                icon: Building2,
                roles: ['superadmin'],
            },
            {
                key: 'academic-years',
                href: '/admin/academic-years',
                icon: CalendarDays,
                roles: ['superadmin'],
            },
        ],
    },
];

const utilityItems = [
    { key: 'notifications', href: '/notifications', icon: Bell },
    { key: 'settings', href: '/settings', icon: Settings },
    { key: 'support', href: '/support', icon: HelpCircle },
];

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] || '?').toUpperCase();
}

export default function Sidebar() {
    const { sidebarOpen, setSidebarOpen } = useSidebar();
    const pathname = usePathname();
    const router = useRouter();

    const { user } = useUserState();
    const { logout } = useUserActions();
    const { t } = useLocale();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const response = await axiosInstance.get('/notifications/unread_count/');
            setUnreadCount(response.data.unread_count || 0);
        } catch {
            // silent
        }
    };

    const handleProfileClick = () => {
        router.push('/profile');
        setSidebarOpen(false);
    };

    const userDisplayName =
        user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.name || user?.username || '';

    const gradientClass = ROLE_COLORS[user?.role as string] || 'from-gray-500 to-gray-600';
    const roleLabel = ROLE_LABELS[user?.role as string] || user?.role || '';

    const avatarEmoji = AVATAR_OPTIONS.find(o => o.key === (user?.avatar ?? ''))?.emoji;

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden min-[576px]:block"
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </div>
            )}

            {/* Sidebar panel */}
            <div
                className={`h-screen fixed inset-y-0 top-0 left-0 z-50 w-[240px] transform transition-transform duration-300 ease-in-out hidden min-[576px]:flex flex-col ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
                style={{ background: '#ffffff', borderRight: '1px solid #e8eaed' }}
            >
                {/* Logo */}
                <div className="flex items-center px-5 pt-5 pb-4">
                    <Image
                        src="/Logo.svg"
                        alt="Future School"
                        width={140}
                        height={36}
                        className="h-8 w-auto"
                    />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 overflow-y-auto pb-2 space-y-5">
                    {navSections.map(section => {
                        const visibleItems = section.items.filter(
                            item => user?.role && item.roles.includes(user.role as string)
                        );
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.label}>
                                <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                                    {section.label}
                                </p>
                                <div className="space-y-0.5">
                                    {visibleItems.map(item => {
                                        const isActive =
                                            pathname === item.href ||
                                            pathname.startsWith(item.href + '/');
                                        return (
                                            <Link
                                                key={item.key}
                                                href={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                                    isActive
                                                        ? 'bg-violet-50 text-violet-700'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                            >
                                                {isActive && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-600 rounded-r-full" />
                                                )}
                                                <item.icon
                                                    className={`flex-shrink-0 w-[18px] h-[18px] ${
                                                        isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'
                                                    }`}
                                                />
                                                <span className="truncate">{t(`nav.${item.key}`)}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Utility */}
                    <div>
                        <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                            Сервисы
                        </p>
                        <div className="space-y-0.5">
                            {utilityItems.map(item => {
                                const isActive = pathname === item.href;
                                const showBadge = item.key === 'notifications' && unreadCount > 0;
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`group relative flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                            isActive
                                                ? 'bg-violet-50 text-violet-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-600 rounded-r-full" />
                                            )}
                                            <item.icon
                                                className={`flex-shrink-0 w-[18px] h-[18px] ${
                                                    isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'
                                                }`}
                                            />
                                            <span className="truncate">{t(`nav.${item.key}`)}</span>
                                        </div>
                                        {showBadge && (
                                            <span className="bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* Bottom: profile + logout */}
                <div className="p-3 border-t border-gray-100">
                    {/* Profile card */}
                    <button
                        onClick={handleProfileClick}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left"
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                            {avatarEmoji || getInitials(userDisplayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate leading-tight">
                                {userDisplayName || user?.username}
                            </div>
                            <div className="text-xs text-gray-400 truncate leading-tight mt-0.5">
                                {roleLabel}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                    </button>

                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                        {t('nav.logout')}
                    </button>
                </div>
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 text-gray-500 hover:text-gray-700"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </>
    );
}
