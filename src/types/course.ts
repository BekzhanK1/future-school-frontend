/**
 * TypeScript interfaces for Course Templates system
 */

export interface Course {
    id: number;
    course_code: string;
    name: string;
    description: string | null;
    grade: number; // 1-12
    language?: string; // Language of instruction (e.g., 'kazakh', 'russian', 'english')
}

export interface CourseSection {
    id: number;
    course: number | null; // null for derived sections
    subject_group: number | null; // null for template sections
    template_section: number | null; // ID of template section for derived sections
    title: string;
    position: number;
    is_general: boolean;
    start_date: string | null;
    end_date: string | null;
    quarter: number | null; // 1, 2, 3, 4, or null for all quarters
    // Template fields (only for template sections)
    template_week_index?: number | null;
    template_start_offset_days?: number | null;
    template_duration_days?: number | null;
    // Items in section
    resources?: Resource[];
    assignments?: Assignment[];
    tests?: any[]; // Test type can be defined later if needed
    // Counts (computed fields)
    resources_count?: number;
    assignments_count?: number;
}

export interface Resource {
    id: number;
    course_section: number;
    template_resource: number | null; // ID of template resource
    is_unlinked_from_template: boolean;
    parent_resource: number | null;
    type: 'file' | 'link' | 'text' | 'directory' | 'lesson_link';
    title: string;
    description: string | null;
    url: string | null;
    file: string | null;
    position: number;
    week_day?: number | null;
}

export interface Assignment {
    id: number;
    course_section: number;
    template_assignment: number | null; // ID of template assignment
    is_unlinked_from_template: boolean;
    teacher: number;
    title: string;
    description: string | null;
    due_at: string;
    // Template fields (only for template assignments)
    template_offset_days_from_section_start?: number | null;
    template_due_time?: string | null; // Format "HH:MM:SS"
    max_grade: number;
    file: string | null;
}

export interface SubjectGroup {
    id: number;
    course: number;
    classroom: number;
    teacher: number | null;
    external_id: string | null;
    // Read-only fields from serializer
    course_name?: string;
    course_code?: string;
    classroom_display?: string;
    teacher_username?: string;
    teacher_fullname?: string;
    teacher_email?: string;
}

export interface CourseWithStats extends Course {
    subject_groups_count?: number;
    template_sections_count?: number;
    last_synced_at?: string | null;
}

