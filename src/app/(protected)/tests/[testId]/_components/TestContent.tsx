'use client';
import axiosInstance from '@/lib/axios';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Question from '../questions/[questionOrder]/_components/Question';
import { useRouter } from 'next/navigation';
import TestReviewModal from './TestReviewModal';

interface TestContentProps {
    testId: string;
}

interface QuestionData {
    id: string;
    position: number;
    text: string;
    type: 'multiple_choice' | 'choose_all' | 'open_question' | 'matching';
    options?: Array<{
        text: string;
        is_correct: boolean;
        position: number;
    }>;
    correct_answer_text?: string;
    matching_pairs_json?: Array<{
        left: string;
        right: string;
    }>;
}

type AnswerValue = number[] | string | Array<{ left: string; right: string }>;

interface TestData {
    id: number;
    course_section: number;
    teacher: number;
    title: string;
    description: string;
    is_published: boolean;
    scheduled_at: string | null;
    start_date: string | null;
    end_date: string | null;
    time_limit_minutes: number | null;
    reveal_results_at: string | null;
    allow_multiple_attempts: boolean;
    max_attempts: number | null;
    show_correct_answers: boolean;
    show_feedback: boolean;
    show_score_immediately: boolean;
    course_section_title: string;
    course_name: string;
    course_code: string;
    subject_group: number;
    classroom_name: string;
    classroom_grade: number;
    classroom_letter: string;
    teacher_username: string;
    teacher_first_name: string;
    teacher_last_name: string;
    teacher_fullname: string;
    total_points: number;
    attempt_count: number;
    is_available: boolean;
    can_see_results: boolean;
    can_attempt: boolean;
    is_deadline_passed: boolean;
    has_attempted: boolean;
    my_active_attempt_id: number | null;
    my_latest_attempt_can_view_results: boolean;
    last_submitted_attempt_id: number | null;
    created_at: string;
    questions: QuestionData[];
}

export default function TestContent({ testId }: TestContentProps) {
    const [testData, setTestData] = useState<TestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
    const [isTestStarted, setIsTestStarted] = useState(false);
    const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const router = useRouter();
    useEffect(() => {
        const fetchTestData = async () => {
            setLoading(true);

            try {
                const response = await axiosInstance.get(`/tests/${testId}`);
                const testData = response.data;

                setTestData(testData);
            } catch (error) {
                console.error('Failed to fetch test data:', error);
                setTestData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchTestData();
    }, [testId]);

    useEffect(() => {
        if (!testData || !isTestStarted || !attemptStartedAt) return;

        // Only calculate time remaining if test has time limit
        if (!testData.time_limit_minutes) {
            setTimeRemaining(null);
            return;
        }

        const calculateTimeRemaining = () => {
            const startedAt = new Date(attemptStartedAt).getTime();
            const now = new Date().getTime();
            const timeLimitMs = testData.time_limit_minutes! * 60 * 1000;
            const endTime = startedAt + timeLimitMs;
            const remaining = Math.max(0, endTime - now);
            setTimeRemaining(remaining);

            // Auto-submit when time runs out
            if (remaining === 0 && activeAttemptId && !showReviewModal) {
                // Save all answers first, then show review or submit directly
                handleAutoSubmit();
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testData, isTestStarted, activeAttemptId, attemptStartedAt, showReviewModal]);

    const formatTimeRemaining = (ms: number | null): string => {
        if (ms === null) return '--:--';

        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleStartTest = async () => {
        try {
            console.log('Starting test:', testId);
            const response = await axiosInstance.post('/attempts/start/', {
                test: parseInt(testId),
            });

            const attempt = response.data;
            setActiveAttemptId(attempt.id);
            setAttemptStartedAt(attempt.started_at);
            setIsTestStarted(true);
            setCurrentQuestionIndex(0);

            if (attempt.answers && attempt.answers.length > 0) {
                const existingAnswers: Record<number, AnswerValue> = {};
                attempt.answers.forEach(
                    (answer: {
                        question_id: number;
                        selected_option_ids?: number[];
                        text_answer?: string;
                        matching_answers_json?: Array<{
                            left: string;
                            right: string;
                        }>;
                    }) => {
                        if (answer.question_id) {
                            if (answer.selected_option_ids) {
                                existingAnswers[answer.question_id] =
                                    answer.selected_option_ids;
                            } else if (answer.text_answer) {
                                existingAnswers[answer.question_id] =
                                    answer.text_answer;
                            } else if (answer.matching_answers_json) {
                                existingAnswers[answer.question_id] =
                                    answer.matching_answers_json;
                            }
                        }
                    }
                );
                setAnswers(existingAnswers);
            } else {
                // Clear answers for a new attempt
                setAnswers({});
            }
        } catch (error) {
            console.error('Failed to start test:', error);
        }
    };

    const handleViewResults = () => {
        console.log('Viewing results for test:', testId);
        if (testData?.last_submitted_attempt_id) {
            router.push(
                `/tests/${testId}/student-results?attempt=${testData.last_submitted_attempt_id}`
            );
        }
    };

    const handleAnswerChange = (questionIndex: number, answer: AnswerValue) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: answer,
        }));
    };

    const submitCurrentAnswer = async (questionIndex: number) => {
        console.log('Submitting current answer for question:', questionIndex);
        if (!activeAttemptId || !testData) return;

        const currentQuestion = testData.questions[questionIndex];
        const currentAnswer = answers[questionIndex];
        console.log('answers', answers, currentAnswer);
        console.log('Current question:', currentQuestion);
        console.log('Current answer:', currentAnswer);
        if (!currentQuestion || !currentAnswer) return;

        try {
            const submitData: {
                question_id: string;
                selected_option_ids?: number[];
                text_answer?: string;
                matching_answers_json?: Array<{ left: string; right: string }>;
            } = {
                question_id: currentQuestion.id,
            };

            // Format answer based on question type
            if (currentQuestion.type === 'multiple_choice') {
                submitData.selected_option_ids = Array.isArray(currentAnswer)
                    ? (currentAnswer as number[])
                    : [currentAnswer as unknown as number];
            } else if (currentQuestion.type === 'choose_all') {
                // For choose_all, selected_answer should be an array of option IDs
                submitData.selected_option_ids = Array.isArray(currentAnswer)
                    ? (currentAnswer as number[])
                    : [];
            } else if (currentQuestion.type === 'open_question') {
                submitData.text_answer = currentAnswer as string;
            } else if (currentQuestion.type === 'matching') {
                submitData.matching_answers_json = currentAnswer as Array<{
                    left: string;
                    right: string;
                }>;
            }

            await axiosInstance.post(
                `/attempts/${activeAttemptId}/submit-answer/`,
                submitData
            );
        } catch (error) {
            console.error('Failed to submit answer:', error);
        }
    };

    const handleNextQuestion = async () => {
        // Submit current answer before moving to next question
        await submitCurrentAnswer(currentQuestionIndex);

        if (testData && currentQuestionIndex < testData.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleAutoSubmit = async () => {
        // Auto-submit when time runs out - save all answers and submit directly
        if (!activeAttemptId || !testData) return;

        try {
            // Save all answers first (only if they exist)
            for (let i = 0; i < testData.questions.length; i++) {
                if (answers[i] !== undefined) {
                    await submitCurrentAnswer(i);
                }
            }

            // Small delay to ensure all answers are saved
            await new Promise(resolve => setTimeout(resolve, 500));

            // Submit the test
            await axiosInstance.post(
                `/attempts/${activeAttemptId}/submit/`,
                {}
            );

            // Navigate to results
            router.push(
                `/tests/${testId}/student-results?attempt=${activeAttemptId}`
            );
        } catch (error) {
            console.error('Failed to auto-submit test:', error);
            // Even if there's an error, try to submit
            try {
                await axiosInstance.post(
                    `/attempts/${activeAttemptId}/submit/`,
                    {}
                );
            } catch (submitError) {
                console.error('Failed to submit after error:', submitError);
            }
            alert('Время истекло. Тест будет автоматически завершен.');
            router.push(
                `/tests/${testId}/student-results?attempt=${activeAttemptId}`
            );
        }
    };

    const handleSubmitTest = async () => {
        // Show review modal before final submission
        setShowReviewModal(true);
    };

    const handleFinalSubmit = async () => {
        try {
            if (!activeAttemptId) {
                console.error('No active attempt found');
                return;
            }

            // Close modal first
            setShowReviewModal(false);

            // Submit current answer before submitting the test
            if (answers[currentQuestionIndex] !== undefined) {
                await submitCurrentAnswer(currentQuestionIndex);
            }

            // Save all answers (only if they exist)
            if (testData) {
                for (let i = 0; i < testData.questions.length; i++) {
                    if (answers[i] !== undefined) {
                        await submitCurrentAnswer(i);
                    }
                }
            }

            // Small delay to ensure all answers are saved
            await new Promise(resolve => setTimeout(resolve, 500));

            const response = await axiosInstance.post(
                `/attempts/${activeAttemptId}/submit/`,
                {}
            );
            console.log('Test submitted successfully:', response.data);

            // Navigate to results with the attempt ID
            router.push(
                `/tests/${testId}/student-results?attempt=${activeAttemptId}`
            );
        } catch (error) {
            console.error('Failed to submit test:', error);
            alert('Не удалось завершить тест. Попробуйте еще раз.');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Не указано';
        return formatSchoolDateTime(dateString, 'ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!testData) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Тест не найден
                    </h2>
                    <p className="text-gray-600">
                        Запрашиваемый тест не существует или был удален.
                    </p>
                </div>
            </div>
        );
    }

    // If test is started, show question interface
    if (isTestStarted && testData && testData.questions) {
        const currentQuestion = testData.questions[currentQuestionIndex];
        const isLastQuestion =
            currentQuestionIndex === testData.questions.length - 1;
        const isFirstQuestion = currentQuestionIndex === 0;

        const isTimeRunningOut =
            timeRemaining !== null && timeRemaining < 300000;

        return (
            <div className="max-w-6xl mx-auto">
                <div className="flex gap-6">
                    <div
                        className={`hidden lg:block sticky top-6 self-start transition-colors ${
                            isTimeRunningOut
                                ? 'bg-red-50 border-red-500'
                                : 'bg-blue-50 border-blue-500'
                        } rounded-lg border-2 p-6 shadow-md`}
                        style={{ width: '200px' }}
                    >
                        <div className="text-center">
                            <Clock
                                className={`w-8 h-8 mx-auto mb-3 ${
                                    isTimeRunningOut
                                        ? 'text-red-600'
                                        : 'text-blue-600'
                                }`}
                            />
                            <p className="text-sm text-gray-600 mb-2">
                                Осталось времени
                            </p>
                            <div
                                className={`text-2xl font-mono font-bold ${
                                    isTimeRunningOut
                                        ? 'text-red-700'
                                        : 'text-blue-700'
                                }`}
                            >
                                {formatTimeRemaining(timeRemaining)}
                            </div>
                            {isTimeRunningOut && (
                                <p className="text-xs text-red-600 mt-2 font-medium">
                                    Торопитесь!
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Вопрос {currentQuestionIndex + 1} из{' '}
                                        {testData.questions.length}
                                    </h1>
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {currentQuestion.type ===
                                        'multiple_choice'
                                            ? 'Выбор ответа'
                                            : currentQuestion.type ===
                                                'open_question'
                                              ? 'Открытый вопрос'
                                              : 'Сопоставление'}
                                    </span>
                                </div>

                                <div
                                    className={`lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${
                                        isTimeRunningOut
                                            ? 'bg-red-50 border-red-500 text-red-700'
                                            : 'bg-blue-50 border-blue-500 text-blue-700'
                                    }`}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-mono font-semibold">
                                        {formatTimeRemaining(timeRemaining)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-8">
                                {currentQuestion.text}
                            </h2>

                            <div className="mb-8">
                                <Question
                                    questionData={currentQuestion}
                                    selectedAnswers={
                                        answers[currentQuestionIndex] || []
                                    }
                                    onAnswerChange={answer =>
                                        handleAnswerChange(
                                            currentQuestionIndex,
                                            answer
                                        )
                                    }
                                    onNext={handleNextQuestion}
                                    onPrevious={handlePreviousQuestion}
                                    onSubmit={handleSubmitTest}
                                    isFirstQuestion={isFirstQuestion}
                                    isLastQuestion={isLastQuestion}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Review Modal */}
                {testData && (
                    <TestReviewModal
                        isOpen={showReviewModal}
                        onClose={() => setShowReviewModal(false)}
                        onConfirm={handleFinalSubmit}
                        questions={testData.questions}
                        answers={answers}
                        timeRemaining={timeRemaining}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        {testData.title}
                    </h1>
                    <p className="text-lg text-gray-600">
                        {testData.description}
                    </p>
                </div>

                {/* Test Information */}
                <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-8">
                    {testData.start_date && testData.end_date ? (
                        <>
                            <div className="bg-green-50 rounded-lg p-4 md:col-span-3">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-green-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Начало теста
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {formatDate(testData.start_date)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-4 md:col-span-3">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-red-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Окончание теста
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {formatDate(testData.end_date)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 md:col-span-6">
                            <div className="flex items-center gap-3">
                                <Clock className="w-6 h-6 text-gray-600" />
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Период доступности
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Открытый тест - доступен в любое время
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {testData.time_limit_minutes && (
                        <div className="bg-blue-50 rounded-lg p-4 md:col-span-2">
                            <div className="flex items-center gap-3">
                                <Clock className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Лимит времени
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {testData.time_limit_minutes} мин
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-purple-50 rounded-lg p-4 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                            <div>
                                <p className="text-sm text-gray-600">
                                    Максимум баллов
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {testData.total_points}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Информация о курсе
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Предмет</p>
                            <p className="font-medium text-gray-900">
                                {testData.course_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Код курса</p>
                            <p className="font-medium text-gray-900">
                                {testData.course_code}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Класс</p>
                            <p className="font-medium text-gray-900">
                                {testData.classroom_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">
                                Преподаватель
                            </p>
                            <p className="font-medium text-gray-900">
                                {testData.teacher_first_name}{' '}
                                {testData.teacher_last_name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <div className="text-center">
                    {testData.is_available &&
                        testData.can_attempt &&
                        !testData.has_attempted && (
                            <>
                                <div className="mb-6">
                                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                        Готов к прохождению
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Нажмите кнопку ниже, чтобы начать
                                        прохождение теста.
                                    </p>
                                </div>
                                <button
                                    onClick={handleStartTest}
                                    className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                    Начать тест
                                </button>
                            </>
                        )}

                    {testData.my_active_attempt_id && (
                        <>
                            <div className="mb-6">
                                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Продолжить тест
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    У вас есть незавершенная попытка. Продолжите
                                    или начните заново.
                                </p>
                            </div>
                            <button
                                onClick={handleStartTest}
                                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Продолжить тест
                            </button>
                        </>
                    )}

                    {testData.has_attempted &&
                        testData.my_latest_attempt_can_view_results && (
                            <>
                                <div className="mb-6">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                        Тест завершен
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Вы уже прошли этот тест. Можете
                                        посмотреть результаты.
                                    </p>
                                </div>
                                <button
                                    onClick={handleViewResults}
                                    className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                                >
                                    Посмотреть результаты
                                </button>
                            </>
                        )}

                    {testData.is_deadline_passed && (
                        <div className="mb-6">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                Срок истек
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Время для прохождения этого теста истекло.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
