'use client';

import { useState } from 'react';
import { FileText, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
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
    defaultDueAt?: string;
    weekDay?: number | null;
}

const TABS: { id: ItemType; label: string; icon: React.ReactNode }[] = [
    { id: 'resource',   label: 'Материал',  icon: <FileText className="w-4 h-4" /> },
    { id: 'assignment', label: 'Задание',   icon: <BookOpen className="w-4 h-4" /> },
];

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
        setError(message || null);
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
            <div className="space-y-5">
                {/* Tab switcher */}
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setItemType(tab.id); setError(null); setSuccess(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                itemType === tab.id
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Feedback */}
                {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-700 font-medium">{success}</p>
                    </div>
                )}

                {/* Form */}
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
