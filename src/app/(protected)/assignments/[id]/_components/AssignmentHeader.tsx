'use client';

import { ArrowDown, ClipboardList } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { Assignment } from './types';

interface AssignmentHeaderProps {
    assignment: Assignment;
    userRole?: string;
}

export default function AssignmentHeader({
    assignment,
    userRole,
}: AssignmentHeaderProps) {
    const { t } = useLocale();

    const getStatusColor = (a: Assignment) => {
        if (a.is_submitted === true) {
            return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
        }
        if (a.is_deadline_passed === true) {
            return 'bg-red-50 text-red-800 ring-1 ring-red-200';
        }
        return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
    };

    const getStatusText = (a: Assignment) => {
        if (a.is_submitted === true) {
            return t('assignmentPage.submitted');
        }
        if (a.is_deadline_passed === true) {
            return t('assignmentPage.overdue');
        }
        return t('assignmentPage.pending');
    };

    return (
        <header className="border-b border-gray-100 pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"
                        aria-hidden
                    >
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                            {assignment.title}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {userRole === 'student' && (
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(assignment)}`}
                                >
                                    {getStatusText(assignment)}
                                </span>
                            )}
                            {userRole === 'teacher' && (
                                <a
                                    href="#assignment-submissions"
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {t('assignmentPage.goToSubmissions')}
                                    <ArrowDown className="h-4 w-4" aria-hidden />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
