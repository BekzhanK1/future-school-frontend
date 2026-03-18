'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState, createContext, useContext } from 'react';
import axiosInstance from '@/lib/axios';
import { Plus, Copy } from 'lucide-react';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import CopyTestFromTemplateModal from '@/components/modals/CopyTestFromTemplateModal';

interface SubjectData {
    id: string;
    name: string;
    teacher_username: string;
    teacher_fullname: string;
    bgId: string;
    urlPath: string;
    course_name: string;
    course_code?: string;
    grade?: number;
    type?: string;
    description?: string;
    classroom_display?: string;
    teacher_email?: string;
}

export const SubjectContext = createContext<{
    subject: SubjectData | null;
    loading: boolean;
    error: string | null;
    subjectGroupMembers: any[];
}>({
    subject: null,
    loading: true,
    error: null,
    subjectGroupMembers: [],
});

// Hook to use subject context
export const useSubject = () => {
    const context = useContext(SubjectContext);
    if (!context) {
        throw new Error('useSubject must be used within a SubjectProvider');
    }
    return context;
};

const tabs = [
    { href: 'contents', key: 'contents' },
    { href: 'participants', key: 'participants' },
    { href: 'grades', key: 'grades' },
    { href: 'attendance', key: 'attendance' },
    { href: 'ktp', key: 'ktp' },
];

function useParentPath() {
    const pathname = usePathname();
    return pathname.replace(/\/[^/]+\/?$/, '') || '/';
}

export default function SubjectSectionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const subjectId = decodeURIComponent(params.id as string);
    const pathName = usePathname();
    const parentPath = useParentPath();
    const { user } = useUserState();
    const { t } = useLocale();
    const [subject, setSubject] = useState<SubjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subjectGroupMembers, setSubjectGroupMembers] = useState<any[]>([]);
    const [isCopyTestModalOpen, setIsCopyTestModalOpen] = useState(false);
    const [courseId, setCourseId] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchSubjectData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [subjectResponse, membersResponse] = await Promise.all([
                    axiosInstance.get(`/subject-groups/${subjectId}/`),
                    axiosInstance.get(`/subject-groups/${subjectId}/members/`),
                ]);

                if (!isMounted) return;

                setSubject(subjectResponse.data);
                setCourseId(subjectResponse.data?.course || null);
                setSubjectGroupMembers(
                    Array.isArray(membersResponse.data) ? membersResponse.data : []
                );
            } catch (err: any) {
                if (!isMounted) return;
                console.error('Error loading subject page data:', err);
                const message =
                    err?.response?.data?.detail ||
                    err?.response?.data?.error ||
                    'Не удалось загрузить данные предмета';
                setError(message);
                setSubject(null);
                setCourseId(null);
                setSubjectGroupMembers([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void fetchSubjectData();

        return () => {
            isMounted = false;
        };
    }, [subjectId]);

    const currentTab = pathName.split('/')[pathName.split('/').length - 1];

    // Show loading state
    if (loading) {
        return (
            <div className="mx-auto px-4 py-8">
                <div className="mb-8 bg-white p-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error || !subject) {
        return (
            <div className="mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Предмет не найден
                    </h1>
                    <p className="text-gray-500">
                        {error || 'Предмет не существует'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto p-0 sm:px-4 sm:py-6">
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                                    Предмет
                                </span>
                                {subject?.teacher_fullname && (
                                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                        {subject.teacher_fullname}
                                    </span>
                                )}
                            </div>
                            <h1 className="truncate text-2xl font-bold text-gray-900 sm:text-[28px]">
                                {subject?.course_name}
                            </h1>
                        </div>

                        {user?.role === 'teacher' && (
                            <div className="flex flex-wrap items-center gap-2">
                                {courseId && (
                                    <button
                                        onClick={() => setIsCopyTestModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Скопировать из шаблона
                                    </button>
                                )}
                                <Link
                                    href={`/create-test/?subject=${subjectId}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('test.createTest')}
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-1.5">
                        <ul className="flex flex-wrap gap-1.5">
                            {tabs.map(tab => {
                                const active = currentTab === tab.href;
                                const url = `${parentPath}/${tab.href}`;
                                return (
                                    <li key={tab.href}>
                                        <Link
                                            href={url}
                                            className={[
                                                'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-all',
                                                active
                                                    ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-100'
                                                    : 'text-gray-500 hover:bg-white hover:text-gray-900',
                                            ].join(' ')}
                                        >
                                            {t(`subject.${tab.key}`)}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
            <SubjectContext.Provider
                value={{ subject, loading, error, subjectGroupMembers }}
            >
                {children}
            </SubjectContext.Provider>

            {/* Copy Test From Template Modal */}
            {courseId && subject && (
                <CopyTestFromTemplateModal
                    isOpen={isCopyTestModalOpen}
                    onClose={() => setIsCopyTestModalOpen(false)}
                    courseId={courseId}
                    subjectGroupId={parseInt(subjectId)}
                    onTestCopied={() => {
                        // Refresh page or show success message
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
