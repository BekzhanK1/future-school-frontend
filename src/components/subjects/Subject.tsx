'use client';

interface SubjectProps {
    name: string;
    teacher_username: string;
    teacher_fullname: string;
    bgId: string;
    course_code?: string;
    grade?: number;
    type?: string;
    description?: string;
    classroom_display?: string;
    teacher_email?: string;
    color?: string | null;
}

export default function Subject({
    name,
    teacher_username,
    teacher_fullname,
    bgId,
    course_code,
    grade,
    type,
    description,
    classroom_display,
    teacher_email,
    color,
}: SubjectProps) {
    // Палитра и хеш должны совпадать с календарём, чтобы цвета были одинаковыми
    const SUBJECT_COLOR_PALETTE: Array<{
        bg: string;
        border: string;
        text: string;
    }> = [
        { bg: 'rgb(254, 242, 242)', border: 'rgb(248, 113, 113)', text: '#991b1b' }, // red
        { bg: 'rgb(255, 251, 235)', border: 'rgb(251, 191, 36)', text: '#92400e' }, // amber
        { bg: 'rgb(240, 249, 255)', border: 'rgb(56, 189, 248)', text: '#075985' }, // sky
        { bg: 'rgb(240, 253, 250)', border: 'rgb(45, 212, 191)', text: '#065f46' }, // teal
        { bg: 'rgb(243, 244, 255)', border: 'rgb(129, 140, 248)', text: '#3730a3' }, // indigo
        { bg: 'rgb(251, 244, 255)', border: 'rgb(216, 180, 254)', text: '#6b21a8' }, // violet
        { bg: 'rgb(255, 247, 237)', border: 'rgb(253, 186, 116)', text: '#9a3412' }, // orange
        { bg: 'rgb(240, 255, 244)', border: 'rgb(74, 222, 128)', text: '#166534' }, // green
        { bg: 'rgb(240, 249, 255)', border: 'rgb(96, 165, 250)', text: '#1d4ed8' }, // blue
        { bg: 'rgb(248, 250, 252)', border: 'rgb(148, 163, 184)', text: '#0f172a' }, // slate
    ];

    const subjectNameKey = (name || '').trim() || description || course_code || type || '';
    let hash = 0;
    for (let i = 0; i < subjectNameKey.length; i++) {
        hash = (hash * 31 + subjectNameKey.charCodeAt(i)) >>> 0;
    }
    const idx =
        subjectNameKey.length > 0
            ? hash % SUBJECT_COLOR_PALETTE.length
            : 0;
    
    // Use selected color or default to palette mapped color
    const colors = color ? {
        bg: color,
        border: color,
        text: '#111827' // Simple dark text for custom colors, could use contrast formula if needed
    } : SUBJECT_COLOR_PALETTE[idx];

    return (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group border-2"
            style={{
                borderColor: colors.border,
            }}
        >
            {/* Верх: цветной хедер по предмету */}
            <div
                className="relative h-24"
                style={{
                    backgroundColor: colors.bg,
                }}
            />

            {/* Низ: содержимое */}
            <div className="relative h-24 bg-white p-4 flex flex-col justify-between">
                {/* Subject Name and Course Code */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        {name}
                    </h3>
                    {/* {course_code && (
                        <p className="text-sm text-gray-600 mt-1">
                            {course_code}
                        </p>
                    )} */}
                </div>

                {/* Professor and Additional Info */}
                <div className="flex items-center justify-between">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg">
                        {teacher_fullname}
                    </span>
                    {classroom_display && (
                        <span className="text-xs text-gray-500">
                            {classroom_display}
                        </span>
                    )}
                </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 group-hover:from-black/5 group-hover:to-black/10 transition-all duration-300 pointer-events-none"></div>
        </div>
    );
}
