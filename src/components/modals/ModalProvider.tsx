'use client';

import { useEffect, useState } from 'react';
import { modalController } from '@/lib/modalController';
import KundelikIntegrationModal from './KundelikIntegrationModal';
import EventModal from './EventModal';
import CourseSectionAddItemModal from './CourseSectionAddItemModal';
import CourseSectionCreateModal from './CourseSectionCreateModal';
import FileViewerModal from './FileViewerModal';
import DirectoryModal from './DirectoryModal';
import ConfirmationModal from './ConfirmationModal';
import FileUploadModal from './FileUploadModal';
import AddStudentModal from './AddStudentModal';
import AddFileToDirectoryModal from './AddFileToDirectoryModal';
import type {
    ModalState,
    EventModalData,
    EventsListModalData,
    CourseSectionAddItemModalData,
    CourseSectionCreateModalData,
    FileViewerModalData,
    DirectoryModalData,
    ConfirmationModalData,
    FileUploadModalData,
    AddStudentModalData,
    AddFileToDirectoryModalData,
} from '@/lib/modalController';
import EventsListModal from './EventsListModal';

export default function ModalProvider() {
    const [modalState, setModalState] = useState<ModalState>({
        isOpen: false,
        type: null,
        data: undefined,
    });

    useEffect(() => {
        const unsubscribe = modalController.subscribe(setModalState);
        return unsubscribe;
    }, []);

    if (!modalState.isOpen) {
        return null;
    }

    switch (modalState.type) {
        case 'kundelik-integration':
            return (
                <KundelikIntegrationModal
                    onClose={() => modalController.close()}
                />
            );
        case 'event-modal':
            return (
                <EventModal
                    event={modalState.data as EventModalData}
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                />
            );
        case 'events-list-modal':
            return (
                <EventsListModal
                    data={modalState.data as EventsListModalData}
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                />
            );
        case 'course-section-add-item':
            return (
                <CourseSectionAddItemModal
                    courseSectionId={
                        (modalState.data as CourseSectionAddItemModalData)
                            ?.courseSectionId || 0
                    }
                    weekDay={
                        (modalState.data as CourseSectionAddItemModalData)
                            ?.weekDay ?? null
                    }
                    defaultDueAt={
                        (modalState.data as CourseSectionAddItemModalData)
                            ?.defaultDueAt
                    }
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                    onItemCreated={
                        (modalState.data as CourseSectionAddItemModalData)
                            ?.onItemCreated
                    }
                />
            );
        case 'course-section-create':
            return (
                <CourseSectionCreateModal
                    subjectId={
                        (modalState.data as CourseSectionCreateModalData)
                            ?.subjectId || 0
                    }
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                    onSectionCreated={
                        (modalState.data as CourseSectionCreateModalData)
                            ?.onSectionCreated
                    }
                />
            );
        case 'file-viewer':
            return (
                <FileViewerModal
                    file={
                        (modalState.data as FileViewerModalData)?.file || {
                            url: '',
                            title: '',
                        }
                    }
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                />
            );
        case 'directory-viewer':
            return (
                <DirectoryModal
                    directory={
                        (modalState.data as DirectoryModalData)?.directory || {
                            title: '',
                            files: [],
                        }
                    }
                    onFileClick={
                        (modalState.data as DirectoryModalData)?.onFileClick
                    }
                    onAddFile={
                        (modalState.data as DirectoryModalData)?.onAddFile
                    }
                    onDownloadFolder={
                        (modalState.data as DirectoryModalData)
                            ?.onDownloadFolder
                    }
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                />
            );
        case 'confirmation':
            return (
                <ConfirmationModal
                    data={modalState.data as ConfirmationModalData}
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                />
            );
        case 'file-upload':
            return (
                <FileUploadModal
                    isOpen={modalState.isOpen}
                    onClose={() => modalController.close()}
                    onFileSelect={
                        (modalState.data as FileUploadModalData)
                            ?.onFileSelect || (() => {})
                    }
                    title={(modalState.data as FileUploadModalData)?.title}
                />
            );
        case 'add-student':
            return (
                <AddStudentModal
                    isOpen={modalState.isOpen}
                    classroomId={
                        (modalState.data as AddStudentModalData)?.classroomId ||
                        0
                    }
                    classroomName={
                        (modalState.data as AddStudentModalData)
                            ?.classroomName || ''
                    }
                    onClose={() => modalController.close()}
                    onStudentAdded={
                        (modalState.data as AddStudentModalData)
                            ?.onStudentAdded || (() => {})
                    }
                />
            );
        case 'add-file-to-directory':
            return (
                <AddFileToDirectoryModal
                    isOpen={modalState.isOpen}
                    directoryId={
                        (modalState.data as AddFileToDirectoryModalData)
                            ?.directoryId || 0
                    }
                    directoryTitle={
                        (modalState.data as AddFileToDirectoryModalData)
                            ?.directoryTitle || ''
                    }
                    courseSectionId={
                        (modalState.data as AddFileToDirectoryModalData)
                            ?.courseSectionId || 0
                    }
                    onClose={() => modalController.close()}
                    onSuccess={
                        (modalState.data as AddFileToDirectoryModalData)
                            ?.onSuccess
                    }
                />
            );
        default:
            return null;
    }
}
