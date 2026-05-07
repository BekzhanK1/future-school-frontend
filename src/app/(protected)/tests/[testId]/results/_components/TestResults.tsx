'use client';
import axiosInstance from '@/lib/axios';
import { formatSchoolDateTime } from '@/lib/formatSchoolDateTime';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResultsProps {
    testId: string;
    attemptId?: string;
}

interface AnswerOption {
    id: number;
    text: string;
    is_correct: boolean;
    position: number;
}

interface QuestionResult {
    id: number;
    position: number;
    text: string;
    type: 'multiple_choice' | 'choose_all' | 'open_question' | 'matching';
    points: number;
    options?: AnswerOption[];
    correct_answer_text?: string;
    matching_pairs_json?: Array<{
        left: string;
        right: string;
    }>;
}

interface AnswerResult {
    id: number;
    attempt: number;
    question: QuestionResult;
    selected_options: number[];
    text_answer: string | null;
    matching_answers_json: Array<{ left: string; right: string }> | null;
    score: number;
    max_score: number;
    is_correct: boolean;
    auto_feedback: string | null;
    teacher_feedback: string | null;
    created_at: string;
    updated_at: string;
}

interface AttemptResult {
    id: number;
    test: number;
    test_title: string;
    score: number;
    max_score: number;
    percentage: number;
    submitted_at: string;
    started_at: string;
    time_spent_minutes: number;
    is_completed: boolean;
    is_graded: boolean;
    can_view_results: boolean;
    student: number;
    student_email: string;
    student_first_name: string;
    student_last_name: string;
    student_username: string;
    answers: AnswerResult[];
}

export default function TestResults({ attemptId }: TestResultsProps) {
    const [attemptData, setAttemptData] = useState<AttemptResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    useEffect(() => {
        const fetchAttemptData = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(
                    `/attempts/${attemptId}`
                );
                setAttemptData(response.data);
            } catch (error) {
                console.error('Failed to fetch attempt data:', error);
                setAttemptData(null);
            } finally {
                setLoading(false);
            }
        };

        if (attemptId) {
            fetchAttemptData();
        }
    }, [attemptId]);

    const getQuestionStatus = (answer: AnswerResult) => {
        if (answer.is_correct) {
            return {
                status: 'correct',
                label: `Правильно (${answer.score}/${answer.max_score})`,
                color: 'bg-green-100 text-green-800 border-green-200',
            };
        } else if (answer.score > 0) {
            return {
                status: 'partial',
                label: `Частично правильно (${answer.score}/${answer.max_score})`,
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            };
        } else {
            return {
                status: 'incorrect',
                label: `Неправильно (${answer.score}/${answer.max_score})`,
                color: 'bg-red-100 text-red-800 border-red-200',
            };
        }
    };

    const getNavigationButtonColor = (answer: AnswerResult) => {
        const status = getQuestionStatus(answer);
        switch (status.status) {
            case 'correct':
                return 'bg-green-500 hover:bg-green-600';
            case 'partial':
                return 'bg-yellow-500 hover:bg-yellow-600';
            case 'incorrect':
                return 'bg-red-500 hover:bg-red-600';
            default:
                return 'bg-gray-300 hover:bg-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                                <div className="space-y-3">
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!attemptData) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Результаты не найдены
                    </h2>
                    <p className="text-gray-600">
                        Не удалось загрузить результаты теста.
                    </p>
                </div>
            </div>
        );
    }

    const currentAnswer = attemptData.answers[currentQuestionIndex];
    const questionStatus = getQuestionStatus(currentAnswer);

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {attemptData.test_title}
                </h1>
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Общий балл</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {attemptData.score}/{attemptData.max_score}
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Процент</div>
                        <div className="text-2xl font-bold text-green-600">
                            {attemptData.percentage.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Время</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {Math.round(attemptData.time_spent_minutes)} мин
                        </div>
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    <p>
                        Студент: {attemptData.student_first_name}{' '}
                        {attemptData.student_last_name}
                    </p>
                    <p>
                        Завершен:{' '}
                        {formatSchoolDateTime(
                            attemptData.submitted_at,
                            'ru-RU',
                            { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        {/* Question Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                Вопрос {currentQuestionIndex + 1}
                            </h2>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium border ${questionStatus.color}`}
                            >
                                {questionStatus.label}
                            </span>
                        </div>

                        {/* Question Text */}
                        <div className="mb-6">
                            <p className="text-lg text-gray-900 mb-4">
                                {currentAnswer.question.text}
                            </p>
                        </div>

                        {/* Question Content */}
                        {currentAnswer.question.type === 'multiple_choice' && (
                            <div className="space-y-3">
                                {currentAnswer.question.options?.map(option => {
                                    const isSelected =
                                        currentAnswer.selected_options?.includes(
                                            option.id
                                        );
                                    const isCorrect = option.is_correct;

                                    return (
                                        <div
                                            key={option.id}
                                            className={`p-4 rounded-lg border-2 ${
                                                isSelected
                                                    ? isCorrect
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-red-500 bg-red-50'
                                                    : isCorrect
                                                      ? 'border-green-300 bg-green-25'
                                                      : 'border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center">
                                                <div
                                                    className={`w-4 h-4 rounded-full mr-3 ${
                                                        isSelected
                                                            ? isCorrect
                                                                ? 'bg-green-500'
                                                                : 'bg-red-500'
                                                            : isCorrect
                                                              ? 'bg-green-300'
                                                              : 'bg-gray-300'
                                                    }`}
                                                ></div>
                                                <span className="text-gray-900">
                                                    {option.text}
                                                </span>
                                                {isCorrect && (
                                                    <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                                                )}
                                                {isSelected && !isCorrect && (
                                                    <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {currentAnswer.question.type === 'choose_all' && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 italic mb-4">
                                    Select all that apply
                                </p>
                                {currentAnswer.question.options?.map(option => {
                                    const isSelected =
                                        currentAnswer.selected_options?.includes(
                                            option.id
                                        );
                                    const isCorrect = option.is_correct;

                                    return (
                                        <div
                                            key={option.id}
                                            className={`p-4 rounded-lg border-2 ${
                                                isSelected
                                                    ? isCorrect
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-red-500 bg-red-50'
                                                    : isCorrect
                                                      ? 'border-green-300 bg-green-25'
                                                      : 'border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-start">
                                                <div className="flex items-center flex-1">
                                                    <div
                                                        className={`w-5 h-5 rounded mr-3 flex items-center justify-center shrink-0 ${
                                                            isSelected
                                                                ? isCorrect
                                                                    ? 'bg-green-500'
                                                                    : 'bg-red-500'
                                                                : isCorrect
                                                                  ? 'bg-green-300'
                                                                  : 'bg-gray-300'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <span className="text-white text-xs font-bold">
                                                                ✓
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-900 flex-1">
                                                        {option.text}
                                                    </span>
                                                </div>
                                                <div className="ml-3 flex items-center gap-2">
                                                    {isCorrect && (
                                                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                                            Правильный
                                                        </span>
                                                    )}
                                                    {isSelected &&
                                                        isCorrect && (
                                                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                                        )}
                                                    {isSelected &&
                                                        !isCorrect && (
                                                            <>
                                                                <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                                                    Неправильно
                                                                </span>
                                                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                                            </>
                                                        )}
                                                    {!isSelected &&
                                                        isCorrect && (
                                                            <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                                                Не выбрано
                                                            </span>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Feedback section */}
                                {(currentAnswer.auto_feedback ||
                                    currentAnswer.teacher_feedback) && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="text-sm font-medium text-blue-900 mb-2">
                                            Обратная связь:
                                        </div>
                                        {currentAnswer.teacher_feedback && (
                                            <div className="text-sm text-blue-800 mb-2">
                                                <span className="font-medium">
                                                    От учителя:
                                                </span>{' '}
                                                {currentAnswer.teacher_feedback}
                                            </div>
                                        )}
                                        {currentAnswer.auto_feedback && (
                                            <div className="text-sm text-blue-700">
                                                <span className="font-medium">
                                                    Автоматически:
                                                </span>{' '}
                                                {currentAnswer.auto_feedback}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentAnswer.question.type === 'open_question' && (
                            <div className="space-y-4">
                                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                                    <div className="text-sm text-gray-600 mb-2">
                                        Ваш ответ:
                                    </div>
                                    <div className="text-gray-900">
                                        {currentAnswer.text_answer ||
                                            'Нет ответа'}
                                    </div>
                                </div>
                                {currentAnswer.question.correct_answer_text && (
                                    <div className="p-4 border border-green-300 rounded-lg bg-green-50">
                                        <div className="text-sm text-gray-600 mb-2">
                                            Правильный ответ:
                                        </div>
                                        <div className="text-gray-900">
                                            {
                                                currentAnswer.question
                                                    .correct_answer_text
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentAnswer.question.type === 'matching' && (
                            <div className="space-y-4">
                                <div className="text-sm text-gray-600 mb-4">
                                    Соедините выражения с правильными ответами:
                                </div>
                                <div className="space-y-3">
                                    {currentAnswer.matching_answers_json?.map(
                                        (pair, index) => {
                                            const correctAnswer =
                                                currentAnswer.question
                                                    .matching_pairs_json?.[
                                                    index
                                                ];

                                            const userAnswer = pair.right;
                                            const isCorrect =
                                                correctAnswer?.right ===
                                                userAnswer;

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 border rounded-lg"
                                                >
                                                    <span className="font-medium">
                                                        {pair.left}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span
                                                                className={`px-3 py-1 rounded ${
                                                                    isCorrect
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}
                                                            >
                                                                {userAnswer ||
                                                                    'Не выбрано'}
                                                            </span>
                                                            {!isCorrect &&
                                                                correctAnswer && (
                                                                    <span className="px-3 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                                                                        Правильный
                                                                        ответ:{' '}
                                                                        {
                                                                            correctAnswer.right
                                                                        }
                                                                    </span>
                                                                )}
                                                        </div>
                                                        {isCorrect ? (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-3 sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Навигация
                        </h3>
                        <div className="flex flex-wrap gap-4">
                            {attemptData.answers.map((answer, index) => {
                                const buttonColor =
                                    getNavigationButtonColor(answer);

                                return (
                                    <button
                                        key={answer.id}
                                        onClick={() =>
                                            setCurrentQuestionIndex(index)
                                        }
                                        className={`w-10 h-10 rounded text-white font-medium transition-colors ${buttonColor} ${
                                            currentQuestionIndex === index &&
                                            `ring-2 ring-blue-500 ring-offset-2`
                                        }`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
