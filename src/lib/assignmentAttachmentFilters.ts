/** Normalize API attachment type for display / filtering */
export function isAssignmentFileAttachment(type: string | undefined): boolean {
    return type === 'file';
}
