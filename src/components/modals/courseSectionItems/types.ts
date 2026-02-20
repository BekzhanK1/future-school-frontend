export type ItemType = 'resource' | 'assignment';

export type ResourceType =
    | 'file'
    | 'link'
    | 'text'
    | 'directory'
    | 'document'
    | 'image'
    | 'video'
    | 'lesson_link';

export interface ResourceFormData {
    title: string;
    url: string;
    type: ResourceType;
    file?: File | null;
    files?: File[];
    is_visible_to_students?: boolean;
}

export interface AssignmentAttachment {
    type: 'file' | 'link';
    title: string;
    file?: File | null;
    file_url?: string;
}

export interface AssignmentFormData {
    title: string;
    description: string;
    due_at: string;
    max_grade: number;
    teacher: number;
    attachments: AssignmentAttachment[];
}

export interface FormCallbacks {
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    onComplete: () => void;
}
