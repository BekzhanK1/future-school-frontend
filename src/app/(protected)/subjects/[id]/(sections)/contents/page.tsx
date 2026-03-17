'use client';

import { useSubject } from '../../layout';
import WeekMaterialsSection from '../../_components/WeekMaterialsSection';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MessageCircle, ChevronDown, ChevronUp, History, BookOpen } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import SubjectOverviewPanel from '../../_components/SubjectOverviewPanel.client';
import { useLocale } from '@/contexts/LocaleContext';

export default function SubjectContents() {
    const { subject, loading, error } = useSubject();
    const router = useRouter();
    const params = useParams();
    const { t } = useLocale();
    const subjectId = params?.id as string;
    const [overviewData, setOverviewData] = useState<any>(null);
    const [weekMaterialsData, setWeekMaterialsData] = useState<any[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    const handleForumClick = () => router.push(`/subjects/${subjectId}/qa`);

    const fetchSections = async () => {
        if (!subject) return;
        try {
            const response = await axiosInstance.get(`/course-sections/?subject_group=${subject.id}`);
            if (response.data.length > 0) {
                setOverviewData(response.data[0]);

                const addKindToItems = (items: any[], kind: string) =>
                    items.map((item: any) => ({
                        ...item,
                        kind,
                        id: item.id || item.item_id || Math.random().toString(),
                        title: item.title || item.name || item.label || 'Untitled',
                        actionHref: item.actionHref || item.href || `/${kind}s/${item.id}`,
                        actionLabel: item.actionLabel || 'Открыть',
                        grade_value: item.grade_value || item.student_grade,
                        max_grade: item.max_grade || item.max_points,
                        template_resource: item.template_resource,
                        template_assignment: item.template_assignment,
                        template_test: item.template_test,
                        is_unlinked_from_template: item.is_unlinked_from_template,
                        is_published: item.is_published,
                        student_submission: item.student_submission,
                    }));

                const transformed = response.data.slice(1).map((section: any) => ({
                    id: section.id || section.section_id || 'unknown',
                    title: section.title || section.name || 'Untitled Section',
                    start_date: section.start_date,
                    end_date: section.end_date,
                    is_current: section.is_current,
                    resources: addKindToItems(section.resources || section.materials || [], 'link'),
                    assignments: addKindToItems(section.assignments || section.tasks || [], 'task'),
                    tests: addKindToItems(section.tests || section.quizzes || [], 'test'),
                }));

                setWeekMaterialsData(transformed);
            }
        } catch (err) {
            console.error('Error fetching sections:', err);
        }
    };

    useEffect(() => { fetchSections(); }, [subject]);

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                        <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    if (error || !subject) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-red-800 mb-1">Ошибка</h3>
                    <p className="text-sm text-red-600">{error || 'Subject not found'}</p>
                </div>
            </div>
        );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastSections = weekMaterialsData.filter((d: any) => {
        if (d.end_date) {
            const end = new Date(d.end_date);
            end.setHours(0, 0, 0, 0);
            return end < today;
        }
        return false;
    });

    const activeSections = weekMaterialsData.filter((d: any) => {
        if (d.end_date) {
            const end = new Date(d.end_date);
            end.setHours(0, 0, 0, 0);
            return end >= today;
        }
        return true;
    });

    return (
        <div>
            {/* Slim sticky action bar — only the forum button */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="px-4 py-2.5 flex items-center gap-3">
                    <button
                        onClick={handleForumClick}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <MessageCircle className="w-4 h-4" />
                        {t('qa.title')}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Overview panel as a regular content card */}
                {overviewData && (
                    <SubjectOverviewPanel
                        data={overviewData}
                        courseSectionId={overviewData?.id}
                        onRefresh={fetchSections}
                    />
                )}

                {weekMaterialsData.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-violet-50 flex items-center justify-center">
                            <BookOpen className="w-7 h-7 text-violet-300" />
                        </div>
                        <p className="text-gray-500 font-medium">Разделы ещё не добавлены</p>
                    </div>
                ) : (
                    <>
                        {/* Archive toggle */}
                        {pastSections.length > 0 && (
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all ${
                                    showArchived
                                        ? 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                        : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                            >
                                <History className="w-4 h-4" />
                                {showArchived
                                    ? 'Скрыть прошедшие разделы'
                                    : `Показать прошедшие (${pastSections.length})`}
                                {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}

                        {/* Past sections */}
                        {showArchived && pastSections.map((data: any) => (
                            <WeekMaterialsSection
                                key={data.id}
                                data={data}
                                courseSectionId={data?.id}
                                onRefresh={fetchSections}
                            />
                        ))}

                        {/* Active sections */}
                        {activeSections.map((data: any) => (
                            <WeekMaterialsSection
                                key={data.id}
                                data={data}
                                courseSectionId={data?.id}
                                onRefresh={fetchSections}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
