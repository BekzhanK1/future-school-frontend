'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    maxWidth?: string;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-md',
}: ModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 md:p-6"
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 w-full ${maxWidth} max-h-[90vh] sm:max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col`}
            >
                {title && (
                    <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate pr-2">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 -mr-1 sm:mr-0 sm:p-0 rounded-full hover:bg-gray-100 active:bg-gray-200"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-2 pr-2 sm:mr-0 sm:pr-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
