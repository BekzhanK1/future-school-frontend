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
    week_day?: number | null;
}

/** Stable React list key — always set when rows are added in the UI */
export interface AssignmentAttachment {
    clientKey: string;
    /** Server attachment id when loaded for edit */
    id?: number;
    type: 'file';
    serverType?: 'file';
    title: string;
    file?: File | null;
    /** When editing: absolute URL from API (already stored on server). */
    existingFileUrl?: string | null;
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
