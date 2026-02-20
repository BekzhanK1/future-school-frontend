'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Home,
    Search,
    Box,
    FileText,
    Bell,
    HelpCircle,
    Settings,
    MoreVertical,
    LogOut,
    BookOpen,
    Building2,
    Users,
    MessageCircle,
    MessageSquare,
    Calendar,
} from 'lucide-react';
import Image from 'next/image';
import { useUserState, useUserActions } from '@/contexts/UserContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';

// Те же ключи аватаров, что и на странице профиля
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

const navigation = [
    {
        key: 'home',
        href: '/dashboard',
        icon: Home,
        roles: ['teacher', 'student', 'superadmin', 'schooladmin', 'parent'],
    },
    {
        key: 'subjects',
        href: '/subjects',
        icon: Box,
        roles: ['teacher', 'student'],
    },
    {
        key: 'questions',
        href: '/qa',
        icon: MessageCircle,
        roles: ['teacher'],
    },
    {
        key: 'messages',
        href: '/messages',
        icon: MessageSquare,
        roles: ['teacher', 'parent'],
    },
    // {
    //     key: 'assignments',
    //     href: '/assignments',
    //     icon: BookOpen,
    //     roles: ['teacher', 'student'],
    // },
    {
        key: 'diary',
        href: '/diary',
        icon: FileText,
        roles: ['teacher', 'student'],
    },
    {
        key: 'classrooms',
        href: '/classrooms',
        icon: Box,
        roles: ['schooladmin', 'superadmin'],
    },
    {
        key: 'courses',
        href: '/admin/courses',
        icon: BookOpen,
        roles: ['superadmin', 'schooladmin'],
    },
    {
        key: 'schools',
        href: '/admin/schools',
        icon: Building2,
        roles: ['superadmin'],
    },
    {
        key: 'users',
        href: '/admin/users',
        icon: Users,
        roles: ['superadmin'],
    },
    {
        key: 'academic-years',
        href: '/admin/academic-years',
        icon: Calendar,
        roles: ['superadmin'],
    },
    {
        key: 'schedule',
        href: '/admin/schedule',
        icon: Calendar,
        roles: ['superadmin', 'schooladmin'],
    },
];

const utilityItems = [
    { key: 'notifications', href: '/notifications', icon: Bell },
    { key: 'support', href: '/support', icon: HelpCircle },
    { key: 'settings', href: '/settings', icon: Settings },
];

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
            // Refresh every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const response = await axiosInstance.get('/notifications/unread_count/');
            setUnreadCount(response.data.unread_count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleProfileClick = () => {
        router.push('/profile');
        setSidebarOpen(false);
    };

    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden hidden min-[576px]:block"
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
                </div>
            )}

            <div
                className={`h-screen fixed inset-y-0 top-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out hidden min-[576px]:block ${
                    sidebarOpen
                        ? 'translate-x-0'
                        : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="flex h-full flex-col bg-white">
                    <div className="p-6 pt-14">
                        <div className="flex items-center justify-center space-x-3 mb-6">
                            <Image
                                src="/Logo.svg"
                                alt="logo"
                                width={160}
                                height={160}
                                className="w-full"
                            />
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('nav.search')}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    <nav className="flex-1 px-6 overflow-y-auto">
                        <div className="space-y-2">
                            {user?.role &&
                                navigation.map(item => {
                                    const isActive =
                                        pathname === item.href ||
                                        pathname.startsWith(item.href + '/');
                                    if (
                                        !item.roles.includes(
                                            user?.role as string
                                        )
                                    ) {
                                        return null;
                                    }
                                    return (
                                        <Link
                                            key={item.key}
                                            href={item.href}
                                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                isActive
                                                    ? 'bg-purple-100 text-purple-600'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                            onClick={() =>
                                                setSidebarOpen(false)
                                            }
                                        >
                                            <item.icon
                                                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                                                    isActive
                                                        ? 'text-purple-600'
                                                        : 'text-gray-500'
                                                }`}
                                            />
                                            {t(`nav.${item.key}`)}
                                        </Link>
                                    );
                                })}
                        </div>

                        <div className="mt-8 space-y-2">
                            {utilityItems.map(item => {
                                const isActive = pathname === item.href;
                                const showBadge = item.key === 'notifications' && unreadCount > 0;
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className={`group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                            isActive
                                                ? 'bg-purple-100 text-purple-600'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <div className="flex items-center">
                                            <item.icon className="mr-3 h-5 w-5 text-gray-500" />
                                            {t(`nav.${item.key}`)}
                                        </div>
                                        {showBadge && (
                                            <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[24px] text-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="p-6 space-y-3">
                        <div
                            className="bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={handleProfileClick}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        {(() => {
                                            const avatarKey = user?.avatar ?? '';
                                            const baseName =
                                                (user?.first_name &&
                                                    `${user.first_name} ${user.last_name || ''}`.trim()) ||
                                                user?.name ||
                                                user?.username ||
                                                '';
                                            const firstLetter =
                                                baseName.trim().charAt(0).toUpperCase() || '?';
                                            const option = AVATAR_OPTIONS.find(
                                                o => o.key === avatarKey
                                            );
                                            const showLetter =
                                                !avatarKey || !option?.emoji;
                                            return (
                                                <>
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                                                        {showLetter ? (
                                                            <span className="font-semibold text-gray-700">
                                                                {firstLetter}
                                                            </span>
                                                        ) : (
                                                            <span>{option?.emoji}</span>
                                                        )}
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">
                                            {user?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {user?.username}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {user?.role}
                                        </div>
                                    </div>
                                </div>

                                <button className="p-1 hover:bg-gray-200 rounded">
                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                            {t('nav.logout')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:hidden">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="fixed top-4 left-4 z-50 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 bg-white shadow-lg"
                >
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
            </div>
        </>
    );
}
