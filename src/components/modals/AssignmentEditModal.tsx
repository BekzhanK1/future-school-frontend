'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useLocale } from '@/contexts/LocaleContext';
import axiosInstance from '@/lib/axios';
import { AxiosError } from 'axios';
import AssignmentForm from './courseSectionItems/AssignmentForm';
import { AlertCircle } from 'lucide-react';
import { mapAssignmentApiToEditBootstrap } from './mapAssignmentEditBootstrap';

export interface AssignmentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignmentId: number;
    userId: number;
    onSaved?: () => void;
}

export default function AssignmentEditModal({
    isOpen,
    onClose,
    assignmentId,
    userId,
    onSaved,
}: AssignmentEditModalProps) {
    const { t } = useLocale();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [bootstrapVersion, setBootstrapVersion] = useState(0);
    type BootstrapPayload = ReturnType<typeof mapAssignmentApiToEditBootstrap>;
    const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormError(null);
    }, [isOpen, assignmentId]);

    useEffect(() => {
        if (!isOpen || !assignmentId) return;

        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        axiosInstance
            .get(`/assignments/${assignmentId}/`)
            .then(res => {
                if (cancelled) return;
                setBootstrap(mapAssignmentApiToEditBootstrap(res.data));
                setBootstrapVersion(v => v + 1);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg =
                    err instanceof AxiosError
                        ? String(
                              err.response?.data?.detail ||
                                  err.response?.data?.message ||
                                  err.message
                          )
                        : t('assignmentEditModal.loadFailed');
                setLoadError(msg);
                setBootstrap(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, assignmentId, t]);

    const handleClose = () => {
        setBootstrap(null);
        setLoadError(null);
        setFormError(null);
        setLoading(true);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('assignmentEditModal.title')}
            maxWidth="max-w-2xl"
        >
            {loading ? (
                <p className="text-sm text-gray-600">{t('assignmentEditModal.loading')}</p>
            ) : loadError ? (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600">{loadError}</p>
                </div>
            ) : bootstrap ? (
                <div className="space-y-4">
                    {formError && (
                        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-600">{formError}</p>
                        </div>
                    )}
                    <AssignmentForm
                        key={`${assignmentId}-${bootstrapVersion}`}
                        variant="edit"
                        editBootstrap={bootstrap}
                        userId={userId}
                        onSuccess={() => {
                            setFormError(null);
                        }}
                        onError={msg => setFormError(msg || null)}
                        onComplete={() => {
                            onSaved?.();
                            handleClose();
                        }}
                    />
                </div>
            ) : null}
        </Modal>
    );
}
