'use client';

import { BookOpen, Calendar, Clock, Layers, User } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { Assignment } from './types';

interface AssignmentMetadataProps {
    assignment: Assignment;
}

export default function AssignmentMetadata({
    assignment,
}: AssignmentMetadataProps) {
    const { t, locale } = useLocale();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);

        if (locale === 'en') {
            return formatSchoolDateTime(date, 'en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }

        return formatSchoolDateTime(date, 'ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const contextItems = [
        {
            icon: User,
            label: t('assignmentPage.teacher'),
            value: assignment.teacher_username,
        },
        {
            icon: Layers,
            label: t('assignmentPage.week'),
            value: assignment.course_section_title,
        },
        {
            icon: BookOpen,
            label: t('assignmentPage.subject'),
            value: `${assignment.subject_group_course_name} (${assignment.subject_group_course_code})`,
        },
    ];

    return (
        <div className="space-y-6 pt-5">
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {t('assignmentPage.contextTitle')}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                            <Clock className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500">
                                {t('assignmentPage.dueDate')}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                {formatDate(assignment.due_at)}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                            <Calendar className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500">
                                {t('assignmentPage.maxGrade')}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                {assignment.max_grade}{' '}
                                {t('assignmentPage.points')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                {contextItems.map(item => (
                    <li
                        key={item.label}
                        className="flex gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
                    >
                        <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className="text-sm font-medium text-gray-900">
                                {item.value}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>

            {assignment.description?.trim() ? (
                <section
                    aria-labelledby="assignment-description-heading"
                    className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5"
                >
                    <h2
                        id="assignment-description-heading"
                        className="text-sm font-semibold text-gray-900"
                    >
                        {t('assignmentPage.descriptionTitle')}
                    </h2>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {assignment.description}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
