import WeekMaterialsPanel from './WeekMaterialsPanel.client';

export type WeekItem =
    | {
          id: string;
          kind: 'link';
          title: string;
          file?: string;
          week_day?: number | null;
          type?:
              | 'meet'
              | 'document'
              | 'folder'
              | 'link'
              | 'file'
              | 'info'
              | 'test'
              | 'video'
              | 'image'
              | 'recording'; // icon type
          // Template fields
          template_resource?: number | null;
          is_unlinked_from_template?: boolean;
      }
    | {
          id: string;
          kind: 'task';
          title: string;
          file?: string;
          actionHref: string;
          actionLabel: string;
          type?:
              | 'meet'
              | 'document'
              | 'folder'
              | 'link'
              | 'file'
              | 'info'
              | 'test'
              | 'video'
              | 'image'
              | 'recording'; // icon type
          is_available?: boolean;
          is_deadline_passed?: boolean;
          is_submitted?: boolean;
          score?: string;
          grade_value?: number;
          max_grade?: number;
          icon?: React.ReactNode;
          // Template fields
          template_assignment?: number | null;
          is_unlinked_from_template?: boolean;
          // Student submission (for status display)
          student_submission?: {
              grade_value?: number | null;
              [key: string]: unknown;
          } | null;
      }
    | {
          id: string;
          kind: 'test';
          title: string;
          file?: string;
          type?: 'test';
          is_available?: boolean;
          is_deadline_passed?: boolean;
          is_submitted?: boolean;
          score?: string;
          grade_value?: number;
          max_grade?: number;
          icon?: React.ReactNode;
          // Template fields
          template_test?: number | null;
          is_unlinked_from_template?: boolean;
          // Test settings
          is_published?: boolean;
      };

export type WeekMaterialsData = {
    id: string;
    title: string;
    resources: WeekItem[];
    assignments: WeekItem[];
    tests: WeekItem[];
    is_current?: boolean;
    start_date?: string | null;
    end_date?: string | null;
};

interface WeekMaterialsSectionProps {
    data: WeekMaterialsData;
    courseSectionId?: number;
    onRefresh?: () => void;
    onDeleteItem?: (
        itemId: string,
        itemType: 'resource' | 'assignment'
    ) => void;
    onDeleteSection?: (sectionId: string) => void;
}

export default function WeekMaterialsSection({
    data,
    courseSectionId,
    onRefresh,
}: WeekMaterialsSectionProps) {
    if (!data?.title) return null;

    return (
        <WeekMaterialsPanel
            data={data}
            courseSectionId={courseSectionId}
            onRefresh={onRefresh}
        />
    );
}
