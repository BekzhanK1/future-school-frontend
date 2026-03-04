'use client';

import { Clock, BarChart3 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
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
            // English: 12-hour format with AM/PM
            return date.toLocaleString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } else {
            // Russian/Kazakh: 24-hour format
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                            <p className="text-sm text-gray-600">
                                {t('assignmentPage.dueDate')}
                            </p>
                            <p className="font-medium text-gray-900">
                                {formatDate(assignment.due_at)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        <div>
                            <p className="text-sm text-gray-600">
                                {t('assignmentPage.maxGrade')}
                            </p>
                            <p className="font-medium text-gray-900">
                                {assignment.max_grade}{' '}
                                {t('assignmentPage.points')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <p>
                    {t('assignmentPage.teacher')}: {assignment.teacher_username}
                </p>
                <p>
                    {t('assignmentPage.week')}:{' '}
                    {assignment.course_section_title}
                </p>
                <p>
                    {t('assignmentPage.subject')}:{' '}
                    {assignment.subject_group_course_name} (
                    {assignment.subject_group_course_code})
                </p>
            </div>

            {assignment.description && (
                <div className="rounded-lg p-4 mb-6">
                    <p>{assignment.description}</p>
                </div>
            )}
        </div>
    );
}
