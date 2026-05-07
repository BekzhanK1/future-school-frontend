import type {
    AssignmentEditBootstrap,
    AssignmentAttachmentSnapshot,
} from './courseSectionItems/AssignmentForm.types';

type ApiAttachment = {
    id: number;
    type: string;
    title: string;
    content?: string | null;
    file_url?: string | null;
    file?: string | null;
};

/** Map Django assignment detail JSON into AttachmentManager-ready rows + diff snapshots */
export function mapAssignmentApiToEditBootstrap(api: {
    id: number;
    teacher: number;
    title: string;
    description: string | null;
    due_at: string | null;
    max_grade: number;
    attachments?: ApiAttachment[];
}): AssignmentEditBootstrap {
    const list = api.attachments ?? [];
    /** Files only in the editor; legacy link/text stay on server via preserved ids in AssignmentForm */
    const attachments = list
        .filter(a => normalizeServerType(a.type) === 'file')
        .map(a => apiAttachmentToFormRowFile(a));
    const snapshots: AssignmentEditBootstrap['snapshots'] = {};
    for (const a of list) {
        snapshots[a.id] = {
            title: a.title,
            type: normalizeServerType(a.type),
            file_url: a.file_url ?? null,
            content: a.content ?? null,
            file: a.file ?? null,
        };
    }
    return {
        assignmentId: api.id,
        teacher: api.teacher,
        title: api.title,
        description: api.description ?? '',
        due_at: api.due_at ?? '',
        max_grade: api.max_grade,
        attachments,
        snapshots,
    };
}

function normalizeServerType(
    t: string
): AssignmentAttachmentSnapshot['type'] {
    if (t === 'file' || t === 'link' || t === 'text') return t;
    return 'file';
}

function apiAttachmentToFormRowFile(a: ApiAttachment) {
    const clientKey =
        globalThis.crypto?.randomUUID?.() ?? `att-${a.id}-${Date.now()}`;
    return {
        clientKey,
        id: a.id,
        serverType: 'file' as const,
        type: 'file' as const,
        title: a.title,
        file: null as File | null,
        existingFileUrl: a.file ?? null,
    };
}
