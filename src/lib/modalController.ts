export type ModalType =
    | 'kundelik-integration'
    | 'other-modal'
    | 'event-modal'
    | 'events-list-modal'
    | 'course-section-add-item'
    | 'course-section-create'
    | 'file-viewer'
    | 'directory-viewer'
    | 'confirmation'
    | 'file-upload'
    | 'add-student'
    | 'add-file-to-directory';

export interface EventModalData {
    title: string;
    start: string;
    subject: string;
    teacher: string;
    time: string;
    description: string;
    url?: string;
    type?: 'test' | 'assignment' | 'schedule' | 'meeting' | 'gathering' | 'school_event' | 'other';
    room?: string;
    classroom?: string;
    /** Аудитория события: all, teachers, class, specific */
    target_audience?: string;
    /** Для класса — название класса */
    subject_group_display?: string;
    /** Для выбранных пользователей — список с именами и username */
    target_users?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
}

export interface EventsListModalData {
    events: Array<{
        id: string;
        title: string;
        subject: string;
        classroom: string;
        room?: string;
        teacher: string;
        time: string;
        type: string;
        start: string;
        end?: string;
        description?: string;
        target_audience?: string;
        subject_group_display?: string;
        target_users?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
    }>;
    date: string;
}

export interface CourseSectionAddItemModalData {
    courseSectionId: number;
    onItemCreated?: (itemType: 'resource' | 'assignment' | 'test') => void;
    /** Значение по умолчанию для поля дедлайна задания (datetime-local, YYYY-MM-DDTHH:MM) */
    defaultDueAt?: string;
    /** День недели для ресурса/задания внутри секции (0=Monday, 6=Sunday) */
    weekDay?: number | null;
}

export interface CourseSectionCreateModalData {
    subjectId: number;
    onSectionCreated?: () => void;
}

export interface FileViewerModalData {
    file: {
        url: string;
        title: string;
        type?: string;
        size?: number;
    };
}

export interface DirectoryModalData {
    directory: {
        title: string;
        files: Array<{
            id: number;
            title: string;
            type: string;
            file_url?: string;
            file?: string;
            size?: number;
            is_directory?: boolean;
        }>;
        parent_id?: number;
    };
    onFileClick?: (file: any) => void;
    onAddFile?: (parentId: number) => void;
    onDownloadFolder?: () => void;
}

export interface ConfirmationModalData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary' | 'secondary';
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onSuccess?: () => void;
}

export interface FileUploadModalData {
    title?: string;
    onFileSelect: (file: File) => void;
}

export interface AddStudentModalData {
    classroomId: number;
    classroomName: string;
    onStudentAdded: () => void;
}

export interface AddFileToDirectoryModalData {
    directoryId: number;
    directoryTitle: string;
    courseSectionId: number;
    onSuccess?: () => void;
}

export interface ModalState {
    isOpen: boolean;
    type: ModalType | null;
    data?: unknown;
}

class ModalController {
    private listeners: Set<(state: ModalState) => void> = new Set();
    private state: ModalState = {
        isOpen: false,
        type: null,
        data: undefined,
    };

    subscribe(listener: (state: ModalState) => void) {
        this.listeners.add(listener);
        listener(this.state);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    open(type: ModalType, data?: unknown) {
        this.state = {
            isOpen: true,
            type,
            data,
        };
        this.notify();
    }

    close() {
        this.state = {
            isOpen: false,
            type: null,
            data: undefined,
        };
        this.notify();
    }

    getState(): ModalState {
        return { ...this.state };
    }
}

export const modalController = new ModalController();
