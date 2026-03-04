'use client';

import { useState } from 'react';
import { FileText, BookOpen } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useUserState } from '@/contexts/UserContext';
import { useLocale } from '@/contexts/LocaleContext';
import ResourceForm from './courseSectionItems/ResourceForm';
import AssignmentForm from './courseSectionItems/AssignmentForm';
import { ItemType } from './courseSectionItems/types';

interface CourseSectionAddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseSectionId: number;
    onItemCreated?: (itemType: 'resource' | 'assignment' | 'test') => void;
    /** Значение по умолчанию для дедлайна задания (datetime-local, YYYY-MM-DDTHH:MM) */
    defaultDueAt?: string;
    /** День недели внутри секции (0=Monday, 6=Sunday) */
    weekDay?: number | null;
}

export default function CourseSectionAddItemModal({
    isOpen,
    onClose,
    courseSectionId,
    onItemCreated,
    defaultDueAt,
    weekDay,
}: CourseSectionAddItemModalProps) {
    const [itemType, setItemType] = useState<ItemType>('resource');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { user } = useUserState();
    const { t } = useLocale();

    const handleClose = () => {
        setError(null);
        setSuccess(null);
        setItemType('resource');
        onClose();
    };

    const handleSuccess = (message: string) => {
        setSuccess(message);
        setError(null);
    };

    const handleError = (message: string) => {
        setError(message);
    };

    const handleComplete = () => {
        handleClose();
        onItemCreated?.(itemType);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('courseSectionModal.title')}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Item Type Toggle */}
                <div className="flex space-x-4">
                    <button
                        type="button"
                        onClick={() => setItemType('resource')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                            itemType === 'resource'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>{t('courseSectionModal.resource')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setItemType('assignment')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                            itemType === 'assignment'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>{t('courseSectionModal.assignment')}</span>
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-600">{success}</p>
                    </div>
                )}

                {/* Form Components */}
                {itemType === 'resource' && (
                    <ResourceForm
                        courseSectionId={courseSectionId}
                        weekDay={weekDay ?? undefined}
                        onSuccess={handleSuccess}
                        onError={handleError}
                        onComplete={handleComplete}
                    />
                )}

                {itemType === 'assignment' && (
                    <AssignmentForm
                        courseSectionId={courseSectionId}
                        userId={typeof user?.id === 'number' ? user.id : 0}
                        defaultDueAt={defaultDueAt}
                        onSuccess={handleSuccess}
                        onError={handleError}
                        onComplete={handleComplete}
                    />
                )}
            </div>
        </Modal>
    );
}
