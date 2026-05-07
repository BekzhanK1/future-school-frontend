import type { AssignmentAttachment } from './types';

/** Raw snapshot of an attachment row returned from GET /assignments/:id/ (for PATCH diff). */
export type AssignmentAttachmentSnapshot = {
    title: string;
    type: 'file' | 'link' | 'text';
    file_url: string | null;
    content: string | null;
    file: string | null;
};

export type AssignmentEditBootstrap = {
    assignmentId: number;
    teacher: number;
    title: string;
    description: string;
    due_at: string;
    max_grade: number;
    attachments: AssignmentAttachment[];
    snapshots: Record<number, AssignmentAttachmentSnapshot>;
};
