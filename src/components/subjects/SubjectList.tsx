'use client';

import { useRouter } from 'next/navigation';
import { Trash2, Palette } from 'lucide-react';
import Subject from './Subject';
import { useLocale } from '@/contexts/LocaleContext';

interface SubjectData {
    id: string;
    name: string;
    teacher_username: string;
    teacher_fullname: string;
    bgId: string;
    course_code?: string;
    grade?: number;
    type?: string;
    description?: string;
    classroom_display?: string;
    teacher_email?: string;
    color?: string | null;
}

interface SubjectListProps {
    subjects: SubjectData[];
    searchQuery?: string;
    canEdit?: boolean;
    onEdit?: (subject: SubjectData) => void;
    onDelete?: (id: string) => void;
    onUpdateColor?: (id: string, color: string) => void;
    canEditColor?: boolean;
    loading?: boolean;
}

export default function SubjectList({
    subjects,
    searchQuery = '',
    canEdit = false,
    canEditColor = false,
    onDelete,
    onUpdateColor,
    loading = false,
}: SubjectListProps) {
    const router = useRouter();
    const { t } = useLocale();

    const handleSubjectClick = (subject: SubjectData) => {
        console.log('Subject clicked:', subject);
        const urlPathName = subject.id;
        router.push(`/subjects/${urlPathName}`);
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subjects.map(subject => (
                    <div key={subject.id} className="relative group">
                        <div
                            onClick={() => handleSubjectClick(subject)}
                            className="transition-transform duration-200 hover:scale-105 cursor-pointer"
                        >
                            <Subject
                                name={subject.name}
                                teacher_username={subject.teacher_username}
                                teacher_fullname={subject.teacher_fullname}
                                bgId={subject.bgId}
                                course_code={subject.course_code}
                                grade={subject.grade}
                                type={subject.type}
                                description={subject.description}
                                classroom_display={subject.classroom_display}
                                teacher_email={subject.teacher_email}
                                color={subject.color}
                            />
                        </div>

                        {canEditColor && (
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="relative p-1.5 bg-white/90 shadow text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center">
                                    <Palette className="w-4 h-4" />
                                    <input
                                        type="color"
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                        value={subject.color || '#DBEAFE'}
                                        onChange={(e) => {
                                            if (onUpdateColor) {
                                                onUpdateColor(subject.id, e.target.value);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </label>
                            </div>
                        )}

                        {canEdit && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onEdit?.(subject);
                                    }}
                                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    disabled={loading}
                                >
                                    <Edit className="w-3 h-3" />
                                </button> */}
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onDelete?.(subject.id);
                                    }}
                                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    disabled={loading}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {subjects.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery
                            ? t('subject.noSubjectsFound')
                            : t('subject.noSubjectsAvailable')}
                    </h3>
                    <p className="text-gray-500">
                        {searchQuery
                            ? t('subject.noResultsFor', { query: searchQuery })
                            : t('subject.subjectsWillAppear')}
                    </p>
                </div>
            )}
        </div>
    );
}
