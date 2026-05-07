import { AssignmentAttachment, ResourceType } from './types';

export const fileTypes: ResourceType[] = [
    'image',
    'video',
    'file',
    'directory',
];

/**
 * Get accepted file types for file input based on resource type
 */
export function getFileAcceptTypes(type: ResourceType): string {
    switch (type) {
        case 'image':
            return 'image/*';
        case 'video':
            return 'video/*';
        case 'file':
            return '*/*';
        case 'directory':
            return '*/*';
        case 'document':
            return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf';
        default:
            return '*/*';
    }
}

/**
 * Validate if an attachment has all required fields
 */
export function isAttachmentValid(attachment: AssignmentAttachment): boolean {
    if (!attachment.title?.trim()) {
        return false;
    }

    return !!(attachment.file || attachment.existingFileUrl?.trim());
}

export function makeEmptyAssignmentAttachment(clientKey?: string): AssignmentAttachment {
    return {
        clientKey: clientKey ?? globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}-${Math.random()}`,
        type: 'file',
        title: '',
        file: null,
    };
}
