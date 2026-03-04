'use client';
import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    Calendar,
    Clock,
    CheckCircle2,
    Info,
    Settings,
    Eye,
} from 'lucide-react';
import { QuestionEditor } from './QuestionEditor';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { useSearchParams } from 'next/navigation';
import { courseService } from '@/services/courseService';
import { testService } from '@/services/testService';

export interface Question {
    id: string;
    type: 'multiple_choice' | 'choose_all' | 'open_question' | 'matching';
    text: string;
    position: number;
    points: number;
    test: string;
    // Multiple choice and choose all properties
    options?: { id?: string | number; text: string; is_correct: boolean; position: number; image_url?: string }[];
    // Open question properties
    correct_answer_text?: string;
    key_words?: string;
    // Matching question properties
    matching_pairs_json?: { left: string; right: string }[];
}

export interface Test {
    title: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    scheduled_at?: string;
    subject_group?: number;
    course_section?: number;
    // Time settings
    has_time_limit: boolean;
    time_limit_minutes: number | null;
    has_dates: boolean;
    is_published: boolean;
    // Result visibility settings
    show_score_immediately: boolean;
    reveal_results_at: string | null;
    has_reveal_date: boolean;
    questions: Question[];
}

export default function TestCreator() {
    const { t, locale } = useLocale();
    const searchParams = useSearchParams();
    const subjectId = searchParams.get('subject');
    const templateSectionId = searchParams.get('template_section');
    const courseId = searchParams.get('course');
    const isTemplate = searchParams.get('template') === 'true';
    const testId = searchParams.get('testId'); // For editing existing test
    const [subject, setSubject] = useState<{
        id: number;
        course_name: string;
        course_code: string;
        classroom_display?: string;
    } | null>(null);
    const [templateSection, setTemplateSection] = useState<{
        id: number;
        title: string;
        course: number;
    } | null>(null);
    const [loadingSubject, setLoadingSubject] = useState(true);
    const [originalTest, setOriginalTest] = useState<{
        template_test: number | null;
        is_unlinked_from_template: boolean;
        questions: any[];
    } | null>(null);

    const [test, setTest] = useState<Test>({
        title: '',
        description: '',
        start_date: null,
        end_date: null,
        has_time_limit: false,
        time_limit_minutes: null,
        has_dates: false,
        is_published: true,
        show_score_immediately: false,
        reveal_results_at: null,
        has_reveal_date: false,
        questions: [],
    });

    // Fetch subject or template section information from query params, or existing test if editing
    React.useEffect(() => {
        const fetchData = async () => {
            // If editing existing test, load it first
            if (testId) {
                try {
                    setLoadingSubject(true);
                    const testData = await testService.getTestById(Number(testId));
                    
                    // Store original test data for comparison
                    setOriginalTest({
                        template_test: testData.template_test,
                        is_unlinked_from_template: testData.is_unlinked_from_template,
                        questions: testData.questions || [],
                    });
                    
                    // Set test data
                    setTest({
                        title: testData.title || '',
                        description: testData.description || '',
                        start_date: testData.start_date ? new Date(testData.start_date).toISOString().slice(0, 16) : null,
                        end_date: testData.end_date ? new Date(testData.end_date).toISOString().slice(0, 16) : null,
                        has_time_limit: !!testData.time_limit_minutes,
                        time_limit_minutes: testData.time_limit_minutes || null,
                        has_dates: !!(testData.start_date || testData.end_date),
                        is_published: testData.is_published,
                        show_score_immediately: testData.show_score_immediately || false,
                        reveal_results_at: testData.reveal_results_at ? new Date(testData.reveal_results_at).toISOString().slice(0, 16) : null,
                        has_reveal_date: !!testData.reveal_results_at,
                        course_section: testData.course_section || undefined,
                        subject_group: testData.subject_group || undefined,
                        questions: testData.questions?.map((q: any) => ({
                            id: q.id.toString(), // Keep as string for state management
                            test: testId ? testId.toString() : '',
                            type: q.type,
                            text: q.text,
                            points: q.points,
                            position: q.position,
                            options: q.options?.map((opt: any) => ({
                                id: opt.id ? opt.id.toString() : undefined, // Keep ID for existing options
                                text: opt.text,
                                is_correct: opt.is_correct,
                                position: opt.position,
                                image_url: opt.image_url,
                            })) || [],
                            correct_answer_text: q.correct_answer_text,
                            key_words: q.key_words,
                            matching_pairs_json: q.matching_pairs_json,
                        })) || [],
                    });
                    
                    // If test has course_section, fetch section info
                    if (testData.course_section) {
                        try {
                            const sectionData = await courseService.getCourseSectionById(testData.course_section);
                            setTemplateSection({
                                id: sectionData.id,
                                title: sectionData.title,
                                course: sectionData.course || 0,
                            });
                        } catch (error) {
                            console.error('Error fetching section:', error);
                        }
                    }
                    
                    // If test has subject_group, fetch subject info
                    if (testData.subject_group) {
                        try {
                            const response = await axiosInstance.get(`/subject-groups/${testData.subject_group}/`);
                            setSubject(response.data);
                        } catch (error) {
                            console.error('Error fetching subject:', error);
                        }
                    }
                } catch (error) {
                    console.error('Error loading test:', error);
                    alert('Не удалось загрузить тест для редактирования');
                } finally {
                    setLoadingSubject(false);
                }
                return;
            }
            
            if (templateSectionId) {
                // Fetch template section data - use courseService to get section by ID
                try {
                    setLoadingSubject(true);
                    // Use courseService.getCourseSectionById which properly handles template sections
                    const sectionData = await courseService.getCourseSectionById(Number(templateSectionId));
                    console.log('Loaded template section:', sectionData.id, sectionData.title);
                    setTemplateSection({
                        id: sectionData.id,
                        title: sectionData.title,
                        course: sectionData.course || 0,
                    });
                    setTest(prev => {
                        console.log('Setting course_section to:', sectionData.id);
                        return {
                            ...prev,
                            course_section: sectionData.id,
                        };
                    });
                } catch (error) {
                    console.error('Error fetching template section:', error);
                    alert('Не удалось загрузить информацию о шаблонной секции');
                } finally {
                    setLoadingSubject(false);
                }
            } else if (isTemplate) {
                // Template test without section - just set loading to false
                setLoadingSubject(false);
            } else if (subjectId) {
                // Fetch subject group data (existing logic)
                try {
                    setLoadingSubject(true);
                    const response = await axiosInstance.get(
                        `/subject-groups/${subjectId}/`
                    );
                    setSubject(response.data);
                    setTest(prev => ({
                        ...prev,
                        subject_group: response.data.id,
                    }));
                } catch (error) {
                    console.error('Error fetching subject:', error);
                } finally {
                    setLoadingSubject(false);
                }
            } else {
                setLoadingSubject(false);
            }
        };
        fetchData();
    }, [subjectId, templateSectionId, isTemplate, testId]);

    console.log(test, 'test');

    // Format date/time based on locale
    const formatDateTime = (dateString: string) => {
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

    const addQuestion = (type: Question['type']) => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            type,
            text: '',
            position: test.questions.length + 1,
            points: 1,
            test: '',
            ...getDefaultQuestionData(type),
        };

        setTest(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion],
        }));
    };

    const getDefaultQuestionData = (type: Question['type']) => {
        switch (type) {
            case 'multiple_choice':
                return {
                    options: [
                        { text: '', is_correct: true, position: 1 },
                        { text: '', is_correct: false, position: 2 },
                        { text: '', is_correct: false, position: 3 },
                        { text: '', is_correct: false, position: 4 },
                    ],
                };
            case 'choose_all':
                return {
                    options: [
                        { text: '', is_correct: true, position: 1 },
                        { text: '', is_correct: true, position: 2 },
                        { text: '', is_correct: false, position: 3 },
                        { text: '', is_correct: false, position: 4 },
                    ],
                };
            case 'open_question':
                return {
                    correct_answer_text: '',
                    key_words: '',
                };
            case 'matching':
                return {
                    matching_pairs_json: [
                        { left: '', right: '' },
                        { left: '', right: '' },
                    ],
                };
            default:
                return {};
        }
    };

    const updateQuestion = (questionId: string, updates: Partial<Question>) => {
        console.log(questionId, updates, 'questionId, updates');
        setTest(prev => ({
            ...prev,
            questions: prev.questions.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
            ),
        }));
    };

    const removeQuestion = (questionId: string) => {
        setTest(prev => {
            const filteredQuestions = prev.questions.filter(
                q => q.id !== questionId
            );
            // Update positions after removal
            const updatedQuestions = filteredQuestions.map((q, index) => ({
                ...q,
                position: index + 1,
            }));
            return {
                ...prev,
                questions: updatedQuestions,
            };
        });
    };

    const handleTestUpdate = (
        field: keyof Test,
        value: string | number | boolean | null
    ) => {
        setTest(prev => ({ ...prev, [field]: value }));
    };

    const toggleTimeLimit = () => {
        setTest(prev => ({
            ...prev,
            has_time_limit: !prev.has_time_limit,
            time_limit_minutes: !prev.has_time_limit ? 60 : null,
        }));
    };

    const toggleDates = () => {
        setTest(prev => ({
            ...prev,
            has_dates: !prev.has_dates,
            start_date: !prev.has_dates
                ? new Date().toLocaleString().toString()
                : null,
            end_date: !prev.has_dates
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .slice(0, 16)
                : null,
        }));
    };

    const toggleRevealDate = () => {
        setTest(prev => ({
            ...prev,
            has_reveal_date: !prev.has_reveal_date,
            reveal_results_at: !prev.has_reveal_date
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .slice(0, 16)
                : null,
        }));
    };

    const saveTest = async () => {
        // For template tests (when template=true or templateSectionId), course_section can be null
        const isTemplateTest = templateSectionId || searchParams.get('template') === 'true';
        
        // Check if we have either subject_group (for regular tests) or course_section/template flag (for template tests)
        if (!test.subject_group && !test.course_section && !isTemplateTest) {
            alert(templateSectionId 
                ? 'Необходимо выбрать секцию курса' 
                : t('test.subjectGroupRequired'));
            return;
        }

        // Create a copy of the test data
        const testData: Record<string, unknown> = {
            title: test.title,
            description: test.description,
            is_published: test.is_published,
            questions: test.questions.map(q => {
                // Include ID for existing questions (when editing)
                const questionId = q.id && !q.id.toString().startsWith('temp') 
                    ? parseInt(q.id.toString()) 
                    : undefined;
                
                return {
                    id: questionId, // Include ID for existing questions
                    type: q.type,
                    text: q.text,
                    points: q.points,
                    position: q.position,
                    options: (q.options || []).map(opt => {
                        // Include ID for existing options (when editing)
                        const optionId = opt.id && !opt.id.toString().startsWith('temp')
                            ? (typeof opt.id === 'number' ? opt.id : parseInt(opt.id.toString()))
                            : undefined;
                        
                        return {
                            id: optionId, // Include ID for existing options
                            text: opt.text,
                            is_correct: opt.is_correct,
                            position: opt.position,
                            image_url: opt.image_url,
                        };
                    }),
                    correct_answer_text: q.correct_answer_text,
                    key_words: q.key_words,
                    matching_pairs_json: q.matching_pairs_json,
                };
            }),
        };

        // Add course_section for template tests or subject_group for regular tests
        // IMPORTANT: course_section must be set explicitly for template tests to prevent auto-assignment
        // Set course_section FIRST before dates to ensure it's not overwritten
        if (test.course_section) {
            testData.course_section = test.course_section;
            console.log('Sending course_section to backend:', test.course_section);
        } else if (test.subject_group) {
            testData.subject_group = test.subject_group;
            console.log('Sending subject_group to backend:', test.subject_group);
        }

        // Add course for template tests
        if (isTemplateTest && courseId) {
            testData.course = parseInt(courseId);
            console.log('Sending course to backend:', parseInt(courseId));
        }

        // Add time limit if enabled
        if (test.has_time_limit && test.time_limit_minutes) {
            testData.time_limit_minutes = test.time_limit_minutes;
        }

        // Add dates if enabled
        // NOTE: For template tests with course_section already set, dates are just metadata
        // Backend will NOT auto-assign course_section if it's already provided
        // Convert dates to ISO format before sending
        if (test.has_dates) {
            if (test.start_date) {
                // datetime-local input returns format: YYYY-MM-DDTHH:mm
                // Convert to ISO string (UTC)
                const startDate = new Date(test.start_date);
                if (!isNaN(startDate.getTime())) {
                    testData.start_date = startDate.toISOString();
                    testData.scheduled_at = testData.start_date;
                }
            }
            if (test.end_date) {
                // datetime-local input returns format: YYYY-MM-DDTHH:mm
                // Convert to ISO string (UTC)
                const endDate = new Date(test.end_date);
                if (!isNaN(endDate.getTime())) {
                    testData.end_date = endDate.toISOString();
                }
            }
        } else {
            // If has_dates is false but we have subject_group and no course_section,
            // we need to provide start_date for auto-assignment of course_section
            // Check testData.subject_group (already set above) instead of test.subject_group
            if (testData.subject_group && !testData.course_section) {
                // Use current date/time for auto-assignment
                testData.start_date = new Date().toISOString();
                testData.scheduled_at = testData.start_date;
                console.log('Setting start_date for auto-assignment:', testData.start_date);
            } else {
                // Explicitly set dates to null if has_dates is false and we have course_section
                testData.start_date = null;
                testData.end_date = null;
                testData.scheduled_at = null;
            }
        }

        // Add result visibility settings
        testData.show_score_immediately = test.show_score_immediately;
        if (test.has_reveal_date && test.reveal_results_at) {
            const revealDate = new Date(test.reveal_results_at);
            if (!isNaN(revealDate.getTime())) {
                testData.reveal_results_at = revealDate.toISOString();
            }
        } else {
            testData.reveal_results_at = null;
        }

        try {
            let response;
            if (testId) {
                // Check if test is linked to template and questions were modified
                if (originalTest && originalTest.template_test && !originalTest.is_unlinked_from_template) {
                    // Check if questions were modified
                    const questionsChanged = 
                        test.questions.length !== originalTest.questions.length ||
                        test.questions.some((q, index) => {
                            const originalQ = originalTest.questions[index];
                            if (!originalQ) return true;
                            return (
                                q.text !== originalQ.text ||
                                q.type !== originalQ.type ||
                                q.points !== originalQ.points ||
                                q.correct_answer_text !== originalQ.correct_answer_text ||
                                q.key_words !== originalQ.key_words ||
                                JSON.stringify(q.matching_pairs_json) !== JSON.stringify(originalQ.matching_pairs_json) ||
                                (q.options?.length || 0) !== (originalQ.options?.length || 0) ||
                                q.options?.some((opt, optIndex) => {
                                    const originalOpt = originalQ.options?.[optIndex];
                                    if (!originalOpt) return true;
                                    return (
                                        opt.text !== originalOpt.text ||
                                        opt.is_correct !== originalOpt.is_correct ||
                                        opt.image_url !== originalOpt.image_url
                                    );
                                })
                            );
                        });
                    
                    if (questionsChanged) {
                        // Automatically unlink from template
                        await testService.unlinkFromTemplate(Number(testId));
                        alert('Тест автоматически отвязан от шаблона, так как были изменены вопросы.');
                    }
                }
                
                // Update existing test
                response = await testService.updateTest(Number(testId), testData);
                alert('Тест успешно обновлен');
            } else {
                // Create new test
                response = await testService.createTest(testData);
                alert(t('test.testSavedSuccess'));
            }
            console.log(response, 'response');
            
            // Redirect back to course page if template test, or to subject page if regular test
            if (templateSectionId && courseId) {
                window.location.href = `/admin/courses/${courseId}`;
            } else if (subjectId) {
                window.location.href = `/subjects/${subjectId}/contents`;
            } else if (testId && courseId) {
                // If editing template test, redirect back to course
                window.location.href = `/admin/courses/${courseId}`;
            }
        } catch (error: unknown) {
            console.error('Error saving test:', error);
            const errorMessage =
                (error as { response?: { data?: { detail?: string } } })
                    ?.response?.data?.detail ||
                (error as { message?: string })?.message ||
                t('test.testSaveError');
            alert(errorMessage);
        }
    };

    const getTotalPoints = () => {
        return test.questions.reduce(
            (total, question) => total + question.points,
            0
        );
    };

    if (loadingSubject) {
        return (
            <div className="mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">{t('test.loading')}</div>
                </div>
            </div>
        );
    }

    if (!subject && !templateSection && !isTemplate && (subjectId || templateSectionId)) {
        return (
            <div className="mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-600">
                        {templateSectionId 
                            ? 'Шаблонная секция не найдена' 
                            : t('test.subjectNotFound')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto p-6">
            <div className="border border-[#694CFD]/20 shadow-lg shadow-[#694CFD]/5 bg-white rounded-lg">
                <div className="bg-gradient-to-r from-[#694CFD]/5 to-[#694CFD]/10 border-b border-[#694CFD]/20 p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-[#694CFD] font-semibold text-xl mb-1">
                                <Calendar className="w-5 h-5" />
                                {testId 
                                    ? 'Редактирование теста' 
                                    : (templateSection || isTemplate ? 'Создание шаблонного теста' : t('test.testInformation'))}
                            </h2>
                            {templateSection && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Шаблонная секция: {templateSection.title}
                                </p>
                            )}
                            {isTemplate && !templateSection && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Шаблонный тест без привязки к секции
                                </p>
                            )}
                            {subject && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {subject.course_name} ({subject.course_code}
                                    {subject.classroom_display
                                        ? ` - ${subject.classroom_display}`
                                        : ''}
                                    )
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="title"
                                className="block text-sm font-medium text-gray-700"
                            >
                                {t('test.testTitle')}
                            </label>
                            <input
                                id="title"
                                type="text"
                                placeholder={t('forms.enterTitle')}
                                value={test.title}
                                onChange={e =>
                                    handleTestUpdate('title', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="total-points"
                                className="block text-sm font-medium text-gray-700"
                            >
                                {t('test.totalPoints')}
                            </label>
                            <input
                                id="total-points"
                                type="number"
                                value={getTotalPoints()}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                            />
                        </div>
                    </div>

                    {/* Test Settings Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-[#694CFD]" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {t('test.testSettings')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Time Limit Card */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:border-[#694CFD]/30 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-[#694CFD]" />
                                        <label className="text-sm font-medium text-gray-900">
                                            {t('test.timeLimit')}
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleTimeLimit}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            test.has_time_limit
                                                ? 'bg-[#694CFD]'
                                                : 'bg-gray-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                test.has_time_limit
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {test.has_time_limit && (
                                    <div className="mt-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="1440"
                                                value={
                                                    test.time_limit_minutes ||
                                                    ''
                                                }
                                                onChange={e =>
                                                    handleTestUpdate(
                                                        'time_limit_minutes',
                                                        parseInt(
                                                            e.target.value
                                                        ) || null
                                                    )
                                                }
                                                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent"
                                                placeholder="60"
                                            />
                                            <span className="text-sm text-gray-600">
                                                {t('test.minutes')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {t('test.timeLimitHint')}
                                        </p>
                                    </div>
                                )}
                                {!test.has_time_limit && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {t('test.noTimeLimit')}
                                    </p>
                                )}
                            </div>

                            {/* Date Range Card */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:border-[#694CFD]/30 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#694CFD]" />
                                        <label className="text-sm font-medium text-gray-900">
                                            {t('test.dateRange')}
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleDates}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            test.has_dates
                                                ? 'bg-[#694CFD]'
                                                : 'bg-gray-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                test.has_dates
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {test.has_dates && (
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                {t('test.startDateAndTime')}
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={test.start_date || ''}
                                                onChange={e =>
                                                    handleTestUpdate(
                                                        'start_date',
                                                        e.target.value || null
                                                    )
                                                }
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                {t('test.endDateAndTime')}
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={test.end_date || ''}
                                                onChange={e =>
                                                    handleTestUpdate(
                                                        'end_date',
                                                        e.target.value || null
                                                    )
                                                }
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                )}
                                {!test.has_dates && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {t('test.openTest')}
                                    </p>
                                )}
                            </div>

                            {/* Result Visibility Card */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:border-[#694CFD]/30 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-[#694CFD]" />
                                        <label className="text-sm font-medium text-gray-900">
                                            {t('test.resultVisibility')}
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {/* Show score immediately */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-gray-700">
                                            Показывать результаты сразу после завершения
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleTestUpdate('show_score_immediately', !test.show_score_immediately)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                test.show_score_immediately
                                                    ? 'bg-[#694CFD]'
                                                    : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    test.show_score_immediately
                                                        ? 'translate-x-6'
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    
                                    {!test.show_score_immediately && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700">
                                                    Установить дату открытия результатов
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={toggleRevealDate}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        test.has_reveal_date
                                                            ? 'bg-[#694CFD]'
                                                            : 'bg-gray-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            test.has_reveal_date
                                                                ? 'translate-x-6'
                                                                : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            {test.has_reveal_date && (
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">
                                                        Дата и время открытия результатов
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={test.reveal_results_at || ''}
                                                        onChange={e =>
                                                            handleTestUpdate(
                                                                'reveal_results_at',
                                                                e.target.value || null
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent"
                                                    />
                                                </div>
                                            )}
                                            {!test.has_reveal_date && (
                                                <p className="text-xs text-gray-500">
                                                    Результаты будут скрыты до открытия преподавателем
                                                </p>
                                            )}
                                        </>
                                    )}
                                    {test.show_score_immediately && (
                                        <p className="text-xs text-gray-500">
                                            Студенты увидят результаты сразу после завершения теста
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Test Preview Card */}
                        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        {t('test.testPreview')}
                                    </h4>
                                    <div className="space-y-1 text-sm text-gray-700">
                                        {test.has_time_limit &&
                                            test.time_limit_minutes && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {t('test.timeLimit')}:{' '}
                                                        {
                                                            test.time_limit_minutes
                                                        }{' '}
                                                        {t('test.minutes')}
                                                    </span>
                                                </div>
                                            )}
                                        {test.has_dates && (
                                            <>
                                                {test.start_date && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {t('test.startsAt')}
                                                            :{' '}
                                                            {formatDateTime(
                                                                test.start_date
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                {test.end_date && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {t('test.endsAt')}:{' '}
                                                            {formatDateTime(
                                                                test.end_date
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {!test.has_dates &&
                                            !test.has_time_limit && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    <span>
                                                        {t('test.openTest')}
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="description"
                            className="block text-sm font-medium text-gray-700"
                        >
                            {t('test.description')}
                        </label>
                        <textarea
                            id="description"
                            placeholder={t('forms.description')}
                            value={test.description}
                            onChange={e =>
                                handleTestUpdate('description', e.target.value)
                            }
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#694CFD] focus:border-transparent resize-vertical"
                        />
                    </div>
                </div>
            </div>

            <div className="border border-[#694CFD]/20 shadow-lg shadow-[#694CFD]/5 bg-white rounded-lg mb-2">
                <div className="bg-gradient-to-r from-[#694CFD]/5 to-[#694CFD]/10 border-b border-[#694CFD]/20 p-6 rounded-t-lg">
                    <h2 className="text-[#694CFD] font-semibold text-xl">
                        {t('test.question')} ({test.questions.length})
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => addQuestion('multiple_choice')}
                            className="flex items-center gap-2 px-4 py-2 border border-[#694CFD]/30 text-[#694CFD] rounded-md hover:bg-[#694CFD]/10 hover:border-[#694CFD]/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('test.multipleChoice')}
                        </button>
                        <button
                            onClick={() => addQuestion('choose_all')}
                            className="flex items-center gap-2 px-4 py-2 border border-[#694CFD]/30 text-[#694CFD] rounded-md hover:bg-[#694CFD]/10 hover:border-[#694CFD]/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('test.chooseAll')}
                        </button>
                        <button
                            onClick={() => addQuestion('open_question')}
                            className="flex items-center gap-2 px-4 py-2 border border-[#694CFD]/30 text-[#694CFD] rounded-md hover:bg-[#694CFD]/10 hover:border-[#694CFD]/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('test.openQuestion')}
                        </button>
                        <button
                            onClick={() => addQuestion('matching')}
                            className="flex items-center gap-2 px-4 py-2 border border-[#694CFD]/30 text-[#694CFD] rounded-md hover:bg-[#694CFD]/10 hover:border-[#694CFD]/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('test.matching')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {test.questions.map(question => (
                            <div
                                key={question.id}
                                className="border-l-4 border-l-[#694CFD] shadow-md hover:shadow-lg transition-shadow bg-white rounded-lg border border-gray-200"
                            >
                                <div className="bg-gradient-to-r from-[#694CFD]/5 to-transparent p-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[#694CFD] font-semibold">
                                                {t(
                                                    'questionEditor.questionLabel'
                                                )}{' '}
                                                {question.position}
                                            </span>
                                            <span className="px-2 py-1 bg-[#694CFD]/10 text-[#694CFD] rounded text-xs border border-[#694CFD]/20 font-medium">
                                                {t(
                                                    `questionEditor.questionTypes.${question.type}`
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() =>
                                                removeQuestion(question.id)
                                            }
                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <QuestionEditor
                                        question={question}
                                        onUpdate={updates =>
                                            updateQuestion(question.id, updates)
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {test.questions.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <p>{t('test.noQuestionsYet')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={saveTest}
                    className="px-4 py-2 bg-gradient-to-r from-[#694CFD] to-[#694CFD]/90 hover:from-[#694CFD]/90 hover:to-[#694CFD] shadow-lg shadow-[#694CFD]/25 text-white rounded-md transition-all"
                >
                    {t('test.saveTest')}
                </button>
            </div>
        </div>
    );
}
