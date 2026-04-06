'use client';
import React, {
    useMemo,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { modalController } from '@/lib/modalController';
import CreateEventModal from './CreateEventModal';
import type { EventModalData } from '@/lib/modalController';
import axiosInstance from '@/lib/axios';
import { useLocale } from '@/contexts/LocaleContext';
import { useUserState } from '@/contexts/UserContext';
import './calendar.css';

interface Test {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    due_at?: string;
    course_name: string;
    teacher_username: string;
    description?: string;
}

interface Assignment {
    id: number;
    title: string;
    due_at: string;
    course_name: string;
    teacher_username: string;
    description?: string;
}

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface ScheduleSlot {
    id: number;
    subject_group: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
    start_date?: string;
    end_date?: string;
    quarter?: number | null;
    subject_group_course_name?: string;
    subject_group_classroom_display?: string;
    subject_group_classroom_id?: number | null;
    subject_group_teacher_fullname?: string;
    subject_group_teacher_username?: string;
    subject_group_color?: string;
}

interface AcademicYear {
    id: number;
    name?: string;
    start_date: string;
    end_date: string;
    quarter1_weeks?: number;
    quarter2_weeks?: number;
    quarter3_weeks?: number;
    quarter4_weeks?: number;
    quarters?: Array<{
        id: number;
        quarter_index: number;
        start_date: string;
        end_date: string;
    }>;
    autumn_holiday_start?: string;
    autumn_holiday_end?: string;
    winter_holiday_start?: string;
    winter_holiday_end?: string;
    spring_holiday_start?: string;
    spring_holiday_end?: string;
    is_active?: boolean;
}

export interface CustomCalendarEvent {
    id: number;
    title: string;
    description?: string;
    type: string;
    start_at: string;
    end_at: string | null;
    is_all_day: boolean;
    location?: string;
    target_audience: string;
    school: number | null;
    subject_group: number | null;
    subject_group_display?: string;
    target_users: number[];
    target_users_details?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
    created_by?: number;
}

export interface DayScheduleEventFromCalendar {
    id: string;
    title: string;
    start: string;
    subject: string;
    teacher: string;
    time: string;
    description: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    type?: string;
    classroom?: string;
    room?: string;
    target_audience?: string;
    subject_group_display?: string;
    target_users?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
    url?: string;
    /** Minutes from midnight for stable sidebar sort (optional) */
    sortKeyMinutes?: number;
}

function formatLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseScheduleTimeStartMinutes(
    timeStr: string | undefined | null,
    isoFallback?: string | null
): number {
    if (timeStr) {
        const head = timeStr.split(' - ')[0]?.trim() ?? '';
        const m = head.match(/^(\d{1,2}):(\d{2})/);
        if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    }
    if (isoFallback) {
        const d = new Date(isoFallback);
        if (!Number.isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    }
    return 24 * 60;
}

function eventLocalYmdEquals(isoStart: string | undefined | null, dateStr: string): boolean {
    if (!isoStart) return false;
    const d = new Date(isoStart);
    if (Number.isNaN(d.getTime())) return false;
    return formatLocalYmd(d) === dateStr;
}

interface CalendarProps {
    selectedDate?: Date;
    onDateChange?: (date: Date, events: DayScheduleEventFromCalendar[]) => void;
    rightSlot?: React.ReactNode;
}

// Палитра цветов для предметов (уроков)
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

const subjectColorCache: Record<
    string,
    { bg: string; border: string; text: string }
> = {};

function getSubjectColors(subjectName: string | undefined | null) {
    const key = subjectName?.trim() || '';
    if (!key) {
        return {
            bg: 'rgb(219, 234, 254)',
            border: 'rgb(147, 197, 253)',
            text: '#1e40af',
        };
    }
    if (subjectColorCache[key]) return subjectColorCache[key];

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const idx = hash % SUBJECT_COLOR_PALETTE.length;
    const colors = SUBJECT_COLOR_PALETTE[idx];
    subjectColorCache[key] = colors;
    return colors;
}

const Calendar = ({ selectedDate = new Date(), onDateChange, rightSlot }: CalendarProps) => {
    const { user } = useUserState();
    const [tests, setTests] = useState<Test[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
    const [customEvents, setCustomEvents] = useState<CustomCalendarEvent[]>([]);
    const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [view, setView] = useState<CalendarView>('timeGridWeek');
    const [currentDateRange, setCurrentDateRange] = useState<{
        start: Date | null;
        end: Date | null;
    }>({ start: null, end: null });
    const calendarRef = useRef<any>(null);
    const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
    const { t, locale } = useLocale();

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 576;
            setIsMobile(mobile);
            setView((prev) => {
                // На мобилке по умолчанию дневной режим,
                // но не трогаем, если пользователь уже выбрал другой режим вручную.
                if (mobile && (prev === 'timeGridWeek' || prev === 'dayGridMonth')) {
                    return 'timeGridDay';
                }
                // На десктопе ничего не меняем — остаётся то, что выбрал пользователь.
                return prev;
            });
        };

        if (typeof window !== 'undefined') {
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }
    }, []);

    const handleViewChange = (newView: CalendarView) => {
        setView(newView);
    };

    const handleTodayClick = () => {
        const api = calendarRef.current?.getApi?.();
        if (!api) return;
        api.today();
        const today = new Date();
        if (onDateChange) {
            const dayEvents = getEventsForDay(today);
            onDateChange(today, dayEvents);
        }
    };

    const handlePrev = () => calendarRef.current?.getApi?.()?.prev();
    const handleNext = () => calendarRef.current?.getApi?.()?.next();

    // Format date range for display
    const formatDateRange = useCallback(() => {
        if (!currentDateRange.start || !currentDateRange.end) {
            return '';
        }

        const startDate = currentDateRange.start;
        const endDate = currentDateRange.end;

        if (locale === 'kk') {
            const monthsLong = [
                'қаңтар',
                'ақпан',
                'наурыз',
                'сәуір',
                'мамыр',
                'маусым',
                'шілде',
                'тамыз',
                'қыркүйек',
                'қазан',
                'қараша',
                'желтоқсан',
            ];
            const monthsShort = [
                'қаңт',
                'ақп',
                'нау',
                'сәу',
                'мам',
                'мау',
                'шіл',
                'там',
                'қыр',
                'қаз',
                'қар',
                'жел',
            ];
            const weekdays = [
                'жексенбі',
                'дүйсенбі',
                'сейсенбі',
                'сәрсенбі',
                'бейсенбі',
                'жұма',
                'сенбі',
            ];

            if (view === 'timeGridDay') {
                const w = weekdays[startDate.getDay()];
                const m = monthsLong[startDate.getMonth()];
                return `${w}, ${startDate.getDate()} ${m} ${startDate.getFullYear()} ж.`;
            } else if (view === 'timeGridWeek') {
                const startDay = startDate.getDate();
                const endDay = endDate.getDate();
                const startMonthIdx = startDate.getMonth();
                const endMonthIdx = endDate.getMonth();
                const year = startDate.getFullYear();

                if (
                    startMonthIdx === endMonthIdx &&
                    startDate.getFullYear() === endDate.getFullYear()
                ) {
                    const m = monthsLong[startMonthIdx];
                    return `${startDay} - ${endDay} ${m} ${year} ж.`;
                }
                if (startDate.getFullYear() === endDate.getFullYear()) {
                    const sm = monthsShort[startMonthIdx];
                    const em = monthsShort[endMonthIdx];
                    return `${startDay} ${sm} - ${endDay} ${em} ${year} ж.`;
                }
                const sm = monthsShort[startMonthIdx];
                const em = monthsShort[endMonthIdx];
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();
                return `${startDay} ${sm} ${startYear} ж. - ${endDay} ${em} ${endYear} ж.`;
            }
        } else {
            // Get locale string based on current locale
            const localeMap: Record<string, string> = {
                en: 'en-GB',
                ru: 'ru-RU',
                kk: 'kk-KZ',
            };
            const dateLocale = localeMap[locale] || 'en-GB';

            if (view === 'timeGridDay') {
                // For daily view, show full date with weekday
                return startDate.toLocaleDateString(dateLocale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            } else if (view === 'timeGridWeek') {
                // For weekly view, show date range in a readable format
                const startDay = startDate.getDate();
                const endDay = endDate.getDate();
                const startMonth = startDate.toLocaleDateString(dateLocale, {
                    month: 'long',
                });
                const endMonth = endDate.toLocaleDateString(dateLocale, {
                    month: 'long',
                });
                const year = startDate.getFullYear();

                // If same month and year
                if (
                    startDate.getMonth() === endDate.getMonth() &&
                    startDate.getFullYear() === endDate.getFullYear()
                ) {
                    return `${startDay} - ${endDay} ${startMonth} ${year}`;
                }
                // If same year but different months
                if (startDate.getFullYear() === endDate.getFullYear()) {
                    const startMonthShort = startDate.toLocaleDateString(
                        dateLocale,
                        {
                            month: 'short',
                        }
                    );
                    const endMonthShort = endDate.toLocaleDateString(
                        dateLocale,
                        {
                            month: 'short',
                        }
                    );
                    return `${startDay} ${startMonthShort} - ${endDay} ${endMonthShort} ${year}`;
                }
                // Different years
                const startMonthShort = startDate.toLocaleDateString(
                    dateLocale,
                    {
                        month: 'short',
                    }
                );
                const endMonthShort = endDate.toLocaleDateString(dateLocale, {
                    month: 'short',
                });
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();
                return `${startDay} ${startMonthShort} ${startYear} - ${endDay} ${endMonthShort} ${endYear}`;
            }
        }
        return '';
    }, [currentDateRange, view, locale]);

    // Fetch tests, assignments, schedule slots, and academic year
    const fetchCalendarData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch tests, assignments, schedule slots, custom events, and academic year in parallel
            const [testsResponse, assignmentsResponse, scheduleResponse, eventsResponse, academicYearResponse] = await Promise.allSettled([
                axiosInstance.get('/tests/'),
                axiosInstance.get('/assignments/'),
                axiosInstance.get('/schedule-slots/'),
                axiosInstance.get('/events/'),
                axiosInstance.get('/academic-years/current/'),
            ]);

            // Handle tests
            if (testsResponse.status === 'fulfilled') {
                setTests(testsResponse.value.data.results || testsResponse.value.data || []);
            } else {
                console.error('Error fetching tests:', testsResponse.reason);
                setTests([]);
            }
            
            // Handle assignments
            if (assignmentsResponse.status === 'fulfilled') {
                setAssignments(assignmentsResponse.value.data.results || assignmentsResponse.value.data || []);
            } else {
                console.error('Error fetching assignments:', assignmentsResponse.reason);
                setAssignments([]);
            }
            
            // Handle schedule slots
            if (scheduleResponse.status === 'fulfilled') {
                const slots = scheduleResponse.value.data.results || scheduleResponse.value.data || [];
                setScheduleSlots(slots);
            } else {
                if (scheduleResponse.reason?.response?.status !== 404) {
                    console.error('Error fetching schedule slots:', scheduleResponse.reason);
                }
                setScheduleSlots([]);
            }

            // Handle custom calendar events
            if (eventsResponse.status === 'fulfilled') {
                const eventsData = eventsResponse.value.data.results ?? eventsResponse.value.data ?? [];
                setCustomEvents(Array.isArray(eventsData) ? eventsData : []);
            } else {
                if (eventsResponse.reason?.response?.status !== 404) {
                    console.error('Error fetching events:', eventsResponse.reason);
                }
                setCustomEvents([]);
            }
            
            // Handle academic year (активный учебный год — доступен всем авторизованным)
            if (academicYearResponse.status === 'fulfilled') {
                const data = academicYearResponse.value.data;
                setAcademicYear(data && typeof data === 'object' && data.start_date ? data : null);
            } else {
                const statusCode = academicYearResponse.reason?.response?.status;
                if (statusCode !== 404) {
                    console.error('Error fetching academic year:', academicYearResponse.reason);
                }
                setAcademicYear(null);
            }
        } catch (err) {
            console.error('Error fetching calendar data:', err);
            setError('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data on component mount
    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    // Helper function to calculate quarter start dates
    const calculateQuarterDates = (year: AcademicYear) => {
        const quarters: Array<{ start: Date; end: Date }> = [];
        
        if (year.quarters && year.quarters.length > 0) {
            // Sort by index just in case and convert to Date objects
            const sorted = [...year.quarters].sort((a, b) => a.quarter_index - b.quarter_index);
            for (const q of sorted) {
                quarters.push({
                    start: new Date(q.start_date),
                    end: new Date(q.end_date)
                });
            }
            return quarters;
        }

        // Fallback for purely local calculation if quarters aren't fetched
        const startDate = new Date(year.start_date);
        const weeksPerQuarter = [
            year.quarter1_weeks || 8,
            year.quarter2_weeks || 8,
            year.quarter3_weeks || 10,
            year.quarter4_weeks || 8,
        ];
        
        let currentDate = new Date(startDate);
        
        for (let q = 0; q < 4; q++) {
            const quarterStart = new Date(currentDate);
            const weeks = weeksPerQuarter[q];
            const quarterEnd = new Date(currentDate);
            quarterEnd.setDate(quarterEnd.getDate() + (weeks * 7) - 1);
            
            quarters.push({ start: quarterStart, end: quarterEnd });
            currentDate = new Date(quarterEnd);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return quarters;
    };
    
    // Helper function to get quarter number for a date
    const getQuarterForDate = (date: Date, quarterDates: Array<{ start: Date; end: Date }>) => {
        for (let i = 0; i < quarterDates.length; i++) {
            if (date >= quarterDates[i].start && date <= quarterDates[i].end) {
                return i + 1; // Quarters are 1-indexed
            }
        }
        return null;
    };

    // Generate schedule events from schedule slots
    const generateScheduleEvents = useCallback((slots: ScheduleSlot[], year: AcademicYear | null) => {
        const events: Array<{
            id: string;
            title: string;
            start: string;
            end: string;
            backgroundColor: string;
            borderColor: string;
            textColor: string;
            display: string;
            description?: string;
            subject?: string;
            room?: string;
            type: string;
            extendedProps?: any;
        }> = [];
        
        if (slots.length === 0) return events;

        // Если нет учебного года — показываем слоты на ближайшие 3 месяца от сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDate: Date;
        let endDate: Date;
        if (year) {
            startDate = new Date(year.start_date);
            endDate = new Date(year.end_date);
        } else {
            // Без года: понедельник текущей недели — +3 месяца
            const day = today.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            startDate = new Date(today);
            startDate.setDate(today.getDate() + mondayOffset);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
        }
        const holidays: Array<{ start: Date; end: Date }> = [];
        
        // Add holidays (only when academic year is set)
        if (year?.autumn_holiday_start && year?.autumn_holiday_end) {
            holidays.push({
                start: new Date(year.autumn_holiday_start),
                end: new Date(year.autumn_holiday_end),
            });
        }
        if (year?.winter_holiday_start && year?.winter_holiday_end) {
            holidays.push({
                start: new Date(year.winter_holiday_start),
                end: new Date(year.winter_holiday_end),
            });
        }
        if (year?.spring_holiday_start && year?.spring_holiday_end) {
            holidays.push({
                start: new Date(year.spring_holiday_start),
                end: new Date(year.spring_holiday_end),
            });
        }
        
        // Helper to check if date is holiday (выходные не скрываем — слоты на сб/вс показываем)
        const isHoliday = (date: Date) => {
            for (const holiday of holidays) {
                if (date >= holiday.start && date <= holiday.end) return true;
            }
            return false;
        };
        
        // Generate events for each week from start to end date
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayOfWeek = (currentDate.getDay() + 6) % 7; // Convert to Monday=0, Sunday=6
            
            // Find slots for this day of week
            const daySlots = slots.filter(slot => slot.day_of_week === dayOfWeek);
            
            for (const slot of daySlots) {
                // Skip only holidays (not weekends — слоты на воскресенье/субботу показываем)
                if (isHoliday(currentDate)) continue;
                
                // Check if slot has a specific quarter and if current date is in that quarter (only when year is set)
                if (slot.quarter && year) {
                    const quarterStartDates = calculateQuarterDates(year);
                    const currentQuarter = getQuarterForDate(currentDate, quarterStartDates);
                    if (currentQuarter !== slot.quarter) {
                        continue;
                    }
                }
                
                // Check if slot has date range restrictions
                if (slot.start_date) {
                    const slotStartDate = new Date(slot.start_date);
                    if (currentDate < slotStartDate) {
                        continue; // Skip if current date is before slot start date
                    }
                }
                if (slot.end_date) {
                    const slotEndDate = new Date(slot.end_date);
                    if (currentDate > slotEndDate) {
                        continue; // Skip if current date is after slot end date
                    }
                }
                
                // Create event for this date
                const [hours, minutes] = slot.start_time.split(':').map(Number);
                const startDateTime = new Date(currentDate);
                startDateTime.setHours(hours, minutes, 0, 0);
                
                const [endHours, endMinutes] = slot.end_time.split(':').map(Number);
                const endDateTime = new Date(currentDate);
                endDateTime.setHours(endHours, endMinutes, 0, 0);
                
                const subjectName = slot.subject_group_course_name || 'Предмет';
                const classroomName = slot.subject_group_classroom_display || '';
                const teacherFullName = slot.subject_group_teacher_fullname || slot.subject_group_teacher_username || '';
                
                // Extract only last name (surname) from full name
                const getLastName = (fullName: string) => {
                    if (!fullName) return '';
                    const parts = fullName.trim().split(/\s+/);
                    return parts[parts.length - 1] || fullName; // Return last word (surname)
                };
                const teacherName = getLastName(teacherFullName);
                
                const roomText = slot.room ? `Каб. ${slot.room}` : '';
                
                // Format time without seconds (HH:MM:SS -> HH:MM)
                const formatTime = (timeStr: string) => {
                    if (!timeStr) return '';
                    // Remove seconds if present (HH:MM:SS -> HH:MM)
                    return timeStr.split(':').slice(0, 2).join(':');
                };
                const timeStr = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
                
                // Build title with more information
                let title = subjectName;
                if (classroomName) {
                    title += ` • ${classroomName}`;
                }
                if (roomText) {
                    title += ` • ${roomText}`;
                }
                
                const subjectColors = slot.subject_group_color ? {
                    bg: slot.subject_group_color,
                    border: slot.subject_group_color,
                    text: '#111827',
                } : getSubjectColors(subjectName);

                const localYmd = formatLocalYmd(currentDate);
                events.push({
                    id: `schedule-${slot.id}-${localYmd}`,
                    title: title,
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    backgroundColor: subjectColors.bg,
                    borderColor: subjectColors.border,
                    textColor: subjectColors.text,
                    display: 'auto',
                    type: 'schedule',
                    extendedProps: {
                        description: classroomName,
                        subject: subjectName,
                        room: slot.room,
                        classroom: classroomName,
                        classroomId:
                            slot.subject_group_classroom_id != null
                                ? slot.subject_group_classroom_id
                                : null,
                        teacher: teacherName, // Only last name for display
                        teacherFullName: teacherFullName, // Keep full name for modal
                        time: timeStr,
                        type: 'schedule',
                        subject_group: slot.subject_group,
                    },
                });
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return events;
    }, []);
    
    // Function to detect and group overlapping events
    const groupOverlappingEvents = useCallback((events: any[]) => {
        const grouped: any[] = [];
        const processed = new Set<string>();
        
        for (let i = 0; i < events.length; i++) {
            if (processed.has(events[i].id)) continue;
            
            const currentEvent = events[i];
            const overlapping: any[] = [currentEvent];
            
            // Find all overlapping events
            for (let j = i + 1; j < events.length; j++) {
                if (processed.has(events[j].id)) continue;
                
                const otherEvent = events[j];
                
                // Check if events overlap (same type and time overlap)
                // Get type from extendedProps if not directly on event
                const currentType = currentEvent.type || currentEvent.extendedProps?.type;
                const otherType = otherEvent.type || otherEvent.extendedProps?.type;
                
                if (currentType === otherType && 
                    currentType === 'schedule' &&
                    currentEvent.start && otherEvent.start &&
                    currentEvent.end && otherEvent.end) {
                    
                    const currentStart = new Date(currentEvent.start);
                    const currentEnd = new Date(currentEvent.end);
                    const otherStart = new Date(otherEvent.start);
                    const otherEnd = new Date(otherEvent.end);
                    
                    // Check if events are on the same day
                    const sameDay = 
                        currentStart.getDate() === otherStart.getDate() &&
                        currentStart.getMonth() === otherStart.getMonth() &&
                        currentStart.getFullYear() === otherStart.getFullYear();
                    
                    if (!sameDay) continue;

                    const currentClassId =
                        currentEvent.extendedProps?.classroomId ?? null;
                    const otherClassId =
                        otherEvent.extendedProps?.classroomId ?? null;
                    if (
                        currentClassId == null ||
                        otherClassId == null ||
                        currentClassId !== otherClassId
                    ) {
                        continue;
                    }

                    // Check if events overlap in time
                    const currentStartTime = currentStart.getTime();
                    const currentEndTime = currentEnd.getTime();
                    const otherStartTime = otherStart.getTime();
                    const otherEndTime = otherEnd.getTime();
                    
                    // Events overlap if: currentStart < otherEnd AND currentEnd > otherStart
                    // This handles all cases: partial overlap, complete overlap, same time
                    // Also handle exact same time (currentStartTime === otherStartTime && currentEndTime === otherEndTime)
                    const overlaps = (currentStartTime < otherEndTime && currentEndTime > otherStartTime) ||
                                    (currentStartTime === otherStartTime && currentEndTime === otherEndTime);
                    
                    if (overlaps) {
                        overlapping.push(otherEvent);
                        processed.add(otherEvent.id);
                    }
                }
            }
            
            if (overlapping.length > 1) {
                // Create grouped event with min start and max end time
                const firstEvent = overlapping[0];
                const starts = overlapping.map(e => new Date(e.start).getTime());
                const ends = overlapping.map(e => new Date(e.end).getTime());
                const minStart = new Date(Math.min(...starts));
                const maxEnd = new Date(Math.max(...ends));
                
                const groupedEvent = {
                    ...firstEvent,
                    id: `grouped-${firstEvent.id}`,
                    title: `${overlapping.length} урока`,
                    start: minStart.toISOString(),
                    end: maxEnd.toISOString(),
                    backgroundColor: 'rgb(219, 234, 254)',
                    borderColor: 'rgb(147, 197, 253)',
                    textColor: '#1e40af',
                    extendedProps: {
                        ...firstEvent.extendedProps,
                        groupedEvents: overlapping, // Store all events in the group
                        isGrouped: true,
                    },
                };
                grouped.push(groupedEvent);
                processed.add(currentEvent.id);
            } else {
                // Only add if not already processed (not part of a group)
                if (!processed.has(currentEvent.id)) {
                    grouped.push(currentEvent);
                    processed.add(currentEvent.id);
                }
            }
        }
        
        return grouped;
    }, []);
    
    const calendarEvents = useMemo(() => {
        const events: Array<{
            id: string;
            title: string;
            start: string;
            end?: string;
            backgroundColor: string;
            borderColor: string;
            textColor: string;
            display: string;
            description?: string;
            subject?: string;
            teacher?: string;
            time?: string;
            type?: string;
            room?: string;
            groupedEvents?: any[];
            isGrouped?: boolean;
            extendedProps?: any;
        }> = [];
        
        // Add schedule events
        const scheduleEvents = generateScheduleEvents(scheduleSlots, academicYear);
        
        // Group overlapping schedule events
        const groupedScheduleEvents = groupOverlappingEvents(scheduleEvents);
        events.push(...groupedScheduleEvents);

        tests.forEach(test => {
            const testDate = new Date(test.start_date);
            const testTime = testDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const endDate = test.end_date
                ? new Date(test.end_date)
                : new Date(testDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration

            const isSameDay = 
                testDate.getDate() === endDate.getDate() &&
                testDate.getMonth() === endDate.getMonth() &&
                testDate.getFullYear() === endDate.getFullYear();

            if (isSameDay) {
                events.push({
                    id: `test-${test.id}`,
                    title: `Тест: ${test.title}`,
                    start: test.start_date,
                    end: endDate.toISOString(),
                    backgroundColor: 'rgb(224, 242, 254)',
                    borderColor: 'rgb(224, 242, 254)',
                    textColor: '#374151',
                    display: 'auto',
                    extendedProps: {
                        description: test.description || '',
                        subject: test.course_name,
                        teacher: test.teacher_username,
                        time: testTime,
                        type: 'test',
                    },
                });
            } else {
                // Different days - create two separate events
                events.push({
                    id: `test-start-${test.id}`,
                    title: `Начало теста: ${test.title}`,
                    start: test.start_date,
                    end: new Date(testDate.getTime() + 60 * 60 * 1000).toISOString(),
                    backgroundColor: 'rgb(224, 242, 254)',
                    borderColor: 'rgb(224, 242, 254)',
                    textColor: '#374151',
                    display: 'auto',
                    extendedProps: {
                        description: test.description || '',
                        subject: test.course_name,
                        teacher: test.teacher_username,
                        time: testTime,
                        type: 'test',
                    },
                });
                
                const endTime = endDate.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                events.push({
                    id: `test-end-${test.id}`,
                    title: `Конец теста: ${test.title}`,
                    start: endDate.toISOString(),
                    end: new Date(endDate.getTime() + 60 * 60 * 1000).toISOString(),
                    backgroundColor: 'rgb(254, 226, 226)',
                    borderColor: 'rgb(254, 226, 226)',
                    textColor: '#991b1b',
                    display: 'auto',
                    extendedProps: {
                        description: test.description || '',
                        subject: test.course_name,
                        teacher: test.teacher_username,
                        time: endTime,
                        type: 'test',
                    },
                });
            }
        });

        assignments.forEach(assignment => {
            const assignmentDate = new Date(assignment.due_at);
            const assignmentTime = assignmentDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const endDate = new Date(assignmentDate.getTime() + 60 * 60 * 1000);

            events.push({
                id: `assignment-${assignment.id}`,
                title: assignment.title,
                start: assignment.due_at,
                end: endDate.toISOString(),
                backgroundColor: 'rgb(255, 237, 213)',
                borderColor: 'rgb(255, 237, 213)',
                textColor: '#374151',
                display: 'auto',
                extendedProps: {
                    description: assignment.description || '',
                    subject: assignment.course_name,
                    teacher: assignment.teacher_username,
                    time: assignmentTime,
                    type: 'assignment',
                },
            });
        });

        customEvents.forEach(ev => {
            const startDate = new Date(ev.start_at);
            const endDate = ev.end_at ? new Date(ev.end_at) : new Date(startDate.getTime() + 60 * 60 * 1000);
            const timeStr = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const categoryLabels: Record<string, string> = {
                meeting: 'Собрание',
                gathering: 'Встреча',
                school_event: 'Школьное событие',
                other: 'Другое',
            };
            events.push({
                id: `event-${ev.id}`,
                title: ev.title,
                start: ev.start_at,
                end: endDate.toISOString(),
                backgroundColor: 'rgb(233, 213, 255)',
                borderColor: 'rgb(233, 213, 255)',
                textColor: '#374151',
                display: 'auto',
                extendedProps: {
                    description: ev.description || '',
                    subject: ev.title,
                    teacher: '',
                    time: timeStr,
                    type: ev.type,
                    categoryLabel: categoryLabels[ev.type] || ev.type,
                    location: ev.location,
                    target_audience: ev.target_audience,
                    subject_group_display: ev.subject_group_display,
                    target_users_details: ev.target_users_details || [],
                },
            });
        });

        return events;
    }, [tests, assignments, scheduleSlots, customEvents, academicYear, generateScheduleEvents, groupOverlappingEvents]);

    // События на выбранный день для сайдбара (формат для DaySchedule)
    const getEventsForDay = useCallback(
        (date: Date | string): DayScheduleEventFromCalendar[] => {
            const dateStr =
                typeof date === 'string' ? date : formatLocalYmd(date);
            const dayEvents: DayScheduleEventFromCalendar[] = [];
            for (const ev of calendarEvents) {
                const start = ev.start;
                if (!start || !eventLocalYmdEquals(String(start), dateStr)) continue;
                const props = (ev as any).extendedProps || {};
                const isGrouped = props?.isGrouped && props?.groupedEvents?.length;
                if (isGrouped) {
                    for (const sub of props.groupedEvents) {
                        const subStart = sub.start;
                        if (!subStart || !eventLocalYmdEquals(String(subStart), dateStr))
                            continue;
                        const subProps = sub.extendedProps || {};
                        let timeStr = subProps.time || '';
                        if (!timeStr && sub.start) {
                            const s = new Date(sub.start);
                            timeStr = s.toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                        }
                        const displayTime = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                        // URL для модалки/перехода
                        let url: string | undefined;
                        const subType = subProps.type;
                        if (subType === 'test') {
                            const idMatch = String(sub.id).match(/test-(\d+)/);
                            const testId = idMatch?.[1];
                            if (testId) url = `/tests/${testId}`;
                        } else if (subType === 'assignment') {
                            const idMatch = String(sub.id).match(
                                /assignment-(\d+)/
                            );
                            const assignId = idMatch?.[1];
                            if (assignId) url = `/assignments/${assignId}`;
                        } else if (
                            subType === 'schedule' &&
                            subProps.subject_group
                        ) {
                            url = `/subjects/${subProps.subject_group}/contents`;
                        }

                        dayEvents.push({
                            id: sub.id,
                            title: subProps.type === 'schedule' ? 'Урок' : sub.title || '',
                            start: dateStr,
                            subject: subProps.subject || '',
                            teacher: subProps.teacherFullName || subProps.teacher || '',
                            time: displayTime,
                            description: subProps.description || '',
                            backgroundColor: ev.backgroundColor || 'rgb(219, 234, 254)',
                            borderColor: ev.borderColor || ev.backgroundColor || 'rgb(147, 197, 253)',
                            textColor: ev.textColor || '#1e40af',
                            type: subProps.type,
                            url,
                            sortKeyMinutes: parseScheduleTimeStartMinutes(
                                subProps.time || displayTime,
                                sub.start
                            ),
                        });
                    }
                } else {
                    let timeStr = props.time || '';
                    if (!timeStr && ev.start) {
                        const s = new Date(ev.start);
                        timeStr = s.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    } else if (timeStr) {
                        timeStr = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                    }
                    const title =
                        props.type === 'schedule'
                            ? 'Урок'
                            : props.type === 'test'
                              ? 'Тест'
                              : props.type === 'assignment'
                                ? 'Домашнее Задание'
                                : (ev as any).title || '';
                    // URL для модалки/перехода
                    let url: string | undefined;
                    if (props.type === 'test') {
                        const idMatch = String((ev as any).id).match(
                            /test-(\d+)/
                        );
                        const testId = idMatch?.[1];
                        if (testId) url = `/tests/${testId}`;
                    } else if (props.type === 'assignment') {
                        const idMatch = String((ev as any).id).match(
                            /assignment-(\d+)/
                        );
                        const assignId = idMatch?.[1];
                        if (assignId) url = `/assignments/${assignId}`;
                    } else if (
                        props.type === 'schedule' &&
                        props.subject_group
                    ) {
                        url = `/subjects/${props.subject_group}/contents`;
                    }

                    dayEvents.push({
                        id: (ev as any).id,
                        title,
                        start: dateStr,
                        subject: props.subject || '',
                        teacher: props.teacherFullName || props.teacher || '',
                        time: timeStr,
                        description: props.description || '',
                        backgroundColor: ev.backgroundColor || 'rgb(219, 234, 254)',
                        borderColor: ev.borderColor || ev.backgroundColor || 'rgb(147, 197, 253)',
                        textColor: ev.textColor || '#374151',
                        type: props.type,
                        classroom: props.classroom,
                        room: props.room,
                        target_audience: props.target_audience,
                        subject_group_display: props.subject_group_display,
                        target_users: props.target_users_details,
                        url,
                        sortKeyMinutes: parseScheduleTimeStartMinutes(
                            props.time || timeStr,
                            typeof ev.start === 'string' ? ev.start : null
                        ),
                    });
                }
            }
            dayEvents.sort(
                (a, b) =>
                    (a.sortKeyMinutes ?? 24 * 60) - (b.sortKeyMinutes ?? 24 * 60)
            );
            return dayEvents;
        },
        [calendarEvents]
    );

    useEffect(() => {
        if (onDateChange) {
            onDateChange(selectedDate, getEventsForDay(selectedDate));
        }
    }, [selectedDate, calendarEvents, getEventsForDay, onDateChange]);

    const isAdmin = user?.role === 'superadmin' || user?.role === 'schooladmin';

    const calendarOptions = useMemo(
        () => ({
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: view,
            headerToolbar: false,
            height: 'auto',
            aspectRatio:
                view === 'timeGridDay'
                    ? 0.8
                    : view === 'timeGridWeek'
                      ? 0.9
                      : isMobile
                        ? 1.0
                        : 1.1,
            dayMaxEvents:
                view === 'dayGridMonth' ? (isMobile ? false : 5) : false,
            moreLinkClick: 'popover',
            events: calendarEvents,
            eventOrder: 'time,title',
            eventDisplay: 'auto',
            allDaySlot: false,
            eventContent: function(arg: any) {
                const event = arg.event;
                const props = event.extendedProps;
                const type = props?.type || '';
                const isGrouped = props?.isGrouped || false;
                const groupedCount = props?.groupedEvents?.length || 0;
                const subject = props?.subject || '';
                const classroom = props?.classroom || '';
                const room = props?.room || '';
                const teacher = props?.teacher || props?.teacherFullName || '';

                const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

                // Reusable block builder
                const block = (rows: string[]) =>
                    `<div style="padding:3px 5px;height:100%;display:flex;flex-direction:column;gap:1px;overflow:hidden;">${rows.join('')}</div>`;
                const row = (cls: string, content: string) =>
                    `<div class="${cls}">${content}</div>`;

                // ── Grouped schedule slots (admin) ──────────────────────────
                if (type === 'schedule' && isGrouped) {
                    const groupedEvents: any[] = props?.groupedEvents || [];
                    if (isAdmin) {
                        const items = groupedEvents.slice(0, 4).map((e: any) => {
                            const p = e.extendedProps || {};
                            const dot = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${esc(e.borderColor || e.backgroundColor || '#6366f1')};flex-shrink:0"></span>`;
                            const label = [p.subject, p.classroom].filter(Boolean).join(' · ');
                            return `<div class="fc-ev-grouped-item">${dot}<span style="overflow:hidden;text-overflow:ellipsis;">${esc(label)}</span></div>`;
                        }).join('');
                        const more = groupedCount > 4 ? `<div class="fc-ev-meta" style="margin-top:1px;">+${groupedCount - 4} ещё...</div>` : '';
                        return { html: block([
                            row('fc-ev-time', `${groupedCount} ${t('schedule.lessonsCount')}`),
                            items,
                            more,
                        ]) };
                    }
                    // Non-admin grouped
                    return { html: block([
                        row('fc-ev-title', `${groupedCount} ${t('schedule.lessonsCount')}`),
                        row('fc-ev-meta', t('schedule.clickToView')),
                    ]) };
                }

                // ── Schedule ────────────────────────────────────────────────
                if (type === 'schedule') {
                    const timeStr = props?.time ? String(props.time).replace(/(\d{2}:\d{2}):\d{2}/g, '$1') : '';
                    if (isAdmin) {
                        return { html: block([
                            timeStr ? row('fc-ev-time', esc(timeStr)) : '',
                            row('fc-ev-title', esc(subject)),
                            classroom ? row('fc-ev-meta', esc(classroom)) : '',
                            room ? row('fc-ev-meta', `каб. ${esc(room)}`) : '',
                            teacher ? row('fc-ev-meta', esc(teacher)) : '',
                        ]) };
                    }
                    const isTeacher = user?.role === 'teacher';
                    return { html: block([
                        timeStr ? row('fc-ev-time', esc(timeStr)) : '',
                        row('fc-ev-title', esc(subject)),
                        isTeacher && classroom ? row('fc-ev-meta', esc(classroom)) : '',
                        room ? row('fc-ev-meta', `каб. ${esc(room)}`) : '',
                        !isTeacher && teacher ? row('fc-ev-meta', esc(teacher)) : '',
                    ]) };
                }

                // ── Test ────────────────────────────────────────────────────
                if (type === 'test') {
                    const testSubject = props?.subject || '';
                    const timeStr = props?.time ? String(props.time).replace(/(\d{2}:\d{2}):\d{2}/g, '$1') : '';
                    return { html: block([
                        timeStr ? row('fc-ev-time', esc(timeStr)) : '',
                        row('fc-ev-title', esc(event.title || '')),
                        testSubject ? row('fc-ev-meta', esc(testSubject)) : '',
                        isAdmin && teacher ? row('fc-ev-meta', esc(teacher)) : '',
                    ]) };
                }

                // ── Assignment ──────────────────────────────────────────────
                if (type === 'assignment') {
                    const assignSubject = props?.subject || '';
                    const timeStr = props?.time ? String(props.time).replace(/(\d{2}:\d{2}):\d{2}/g, '$1') : '';
                    return { html: block([
                        timeStr ? row('fc-ev-time', `Сдать до ${esc(timeStr)}`) : '',
                        row('fc-ev-title', esc(event.title || '')),
                        assignSubject ? row('fc-ev-meta', esc(assignSubject)) : '',
                    ]) };
                }

                // ── Meeting / school event / other ─────────────────────────
                if (['meeting','gathering','school_event','other'].includes(type)) {
                    const categoryLabel = props?.categoryLabel || type;
                    const loc = props?.location || '';
                    const timeStr = props?.time ? String(props.time).replace(/(\d{2}:\d{2}):\d{2}/g, '$1') : '';
                    return { html: block([
                        timeStr ? row('fc-ev-time', esc(timeStr)) : '',
                        row('fc-ev-title', esc(event.title || '')),
                        row('fc-ev-meta', esc(categoryLabel)),
                        loc ? row('fc-ev-meta', esc(loc)) : '',
                    ]) };
                }

                // Default
                return { html: block([row('fc-ev-title', esc(event.title || ''))]) };
            },
            dayHeaderFormat: {
                weekday: 'short' as const,
            },
            dayHeaderContent: (arg: any) => {
                const date = arg.date;
                const day = date.getDay();
                const key =
                    day === 1 ? 'mon'
                    : day === 2 ? 'tue'
                    : day === 3 ? 'wed'
                    : day === 4 ? 'thu'
                    : day === 5 ? 'fri'
                    : day === 6 ? 'sat'
                    : 'sun';
                const today = new Date();
                const isToday =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                const dayName = t(`calendar.daysShort.${key}`);
                const dateNum = date.getDate();
                return {
                    html: `<div class="fc-day-header-inner">
                        <span class="fc-day-header-name">${dayName}</span>
                        <span class="fc-day-header-num${isToday ? ' is-today' : ''}">${dateNum}</span>
                    </div>`,
                };
            },
            titleFormat: {
                month: 'long' as const,
            },
            buttonText: {
                today: t('dashboard.calendarButtons.today'),
                month: t('dashboard.calendarButtons.month'),
                week: t('dashboard.calendarButtons.week'),
                day: t('dashboard.calendarButtons.day'),
            },
            selectable: true,
            selectMirror: true,
            weekends: true,
            firstDay: 1,
            locale: locale === 'kk' ? 'kk' : locale === 'ru' ? 'ru' : 'en',
            slotMinTime: '08:00:00',
            slotMaxTime: '22:00:00',
            scrollTime: '08:00:00',
            scrollTimeReset: false,
            eventClick: function (eventInfo: EventClickArg) {
                if (eventInfo.event.start) {
                    const props = eventInfo.event.extendedProps;
                    const isGrouped = props?.isGrouped || false;
                    const groupedEvents = props?.groupedEvents || [];
                    
                    // If this is a grouped event, open the events list modal
                    if (isGrouped && groupedEvents.length > 0) {
                        const eventsForModal = groupedEvents.map((event: any) => {
                            const eventType = event.extendedProps?.type || 'schedule';
                            const ep = event.extendedProps || {};
                            let timeStr = ep.time || '';
                            if (!timeStr && event.start) {
                                const startTime = new Date(event.start);
                                const endTime = event.end ? new Date(event.end) : new Date(startTime.getTime() + 60 * 60 * 1000);
                                const localeCode = locale === 'en' ? 'en-GB' : 'ru-RU';
                                timeStr = `${startTime.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' })}`;
                            } else if (timeStr) {
                                timeStr = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                            }
                            return {
                                id: event.id,
                                title: event.title || '',
                                subject: ep.subject || '',
                                classroom: ep.classroom || '',
                                room: ep.room || '',
                                teacher: ep.teacherFullName || ep.teacher || '',
                                time: timeStr,
                                type: eventType,
                                start: event.start,
                                end: event.end,
                                description: ep.description || '',
                                target_audience: ep.target_audience,
                                subject_group_display: ep.subject_group_display,
                                target_users: ep.target_users_details,
                            };
                        });
                        
                        modalController.open('events-list-modal', {
                            date: eventInfo.event.start.toISOString().split('T')[0],
                            events: eventsForModal,
                        });
                        return;
                    }
                    
                    // Handle single event click
                    const eventType = props?.type;
                    const eventId = eventInfo.event.id.replace(
                        `${eventType}-`,
                        ''
                    );
                    
                    let url: string | undefined;
                    if (eventType === 'test') {
                        url = `/tests/${eventId}`;
                    } else if (eventType === 'assignment') {
                        url = `/assignments/${eventId}`;
                    } else if (eventType === 'schedule' && props?.subject_group) {
                        url = `/subjects/${props.subject_group}/contents`;
                    }

                    // Format time for display
                    let timeStr = props?.time || '';
                    if (!timeStr && eventInfo.event.start) {
                        const startTime = new Date(eventInfo.event.start);
                        const endTime = eventInfo.event.end 
                            ? new Date(eventInfo.event.end)
                            : new Date(startTime.getTime() + 60 * 60 * 1000);
                        timeStr = `${startTime.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })} - ${endTime.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}`;
                    } else if (timeStr) {
                        // Remove seconds from time string if present (HH:MM:SS -> HH:MM)
                        // Match pattern like "09:00:00" or "09:00:00 - 10:30:00" and remove :SS part
                        timeStr = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                    }

                    // For schedule events, use full name in modal; for others, use what's available
                    const teacherForModal = eventType === 'schedule' 
                        ? (props?.teacherFullName || props?.teacher || '')
                        : (props?.teacher || '');

                    const eventData: EventModalData = {
                        title: eventInfo.event.title,
                        start: eventInfo.event.start
                            ? (typeof eventInfo.event.start === 'string'
                                ? eventInfo.event.start
                                : eventInfo.event.start.toISOString()
                              ).split('T')[0]
                            : '',
                        subject: props?.subject || '',
                        teacher: teacherForModal,
                        time: timeStr,
                        description: props?.description || '',
                        url: url,
                        type: eventType as EventModalData['type'],
                        room: props?.room,
                        classroom: props?.classroom,
                        target_audience: props?.target_audience,
                        subject_group_display: props?.subject_group_display,
                        target_users: props?.target_users_details,
                    };
                    modalController.open('event-modal', eventData);
                }
            },
            dateClick: function (info: { date: Date; dateStr: string; allDay: boolean; view: any }) {
                const clickedDate = info.date;
                // Обновить сайдбар «Расписание на день» при клике по дню
                if (onDateChange) {
                    onDateChange(clickedDate, getEventsForDay(info.dateStr));
                }
                // Find all events at this date/time
                const clickedTime = clickedDate.getHours() * 60 + clickedDate.getMinutes(); // minutes from midnight
                
                // Find events that overlap with this time
                const overlappingEvents = calendarEvents.filter(event => {
                    if (!event.start) return false;
                    
                    const eventStart = new Date(event.start);
                    const eventEnd = event.end ? new Date(event.end) : new Date(eventStart.getTime() + 60 * 60 * 1000);
                    
                    // Check if clicked time is within event time range
                    const eventStartTime = eventStart.getHours() * 60 + eventStart.getMinutes();
                    const eventEndTime = eventEnd.getHours() * 60 + eventEnd.getMinutes();
                    
                    // Check if same day
                    const sameDay = 
                        eventStart.getDate() === clickedDate.getDate() &&
                        eventStart.getMonth() === clickedDate.getMonth() &&
                        eventStart.getFullYear() === clickedDate.getFullYear();
                    
                    if (!sameDay) return false;
                    
                    // Check if clicked time overlaps with event
                    return clickedTime >= eventStartTime && clickedTime <= eventEndTime;
                });
                
                // If more than one event, show list modal
                if (overlappingEvents.length > 1) {
                    const eventsData = overlappingEvents.map(event => {
                        const props = (event as any).extendedProps || {};
                        const eventType = props.type || '';
                        const eventId = (event.id || '').replace(`${eventType}-`, '');
                        let url: string | undefined;
                        if (eventType === 'test') url = `/tests/${eventId}`;
                        else if (eventType === 'assignment') url = `/assignments/${eventId}`;
                        let timeStr = props.time || '';
                        if (!timeStr && event.start) {
                            const startTime = new Date(event.start);
                            const endTime = event.end ? new Date(event.end) : new Date(startTime.getTime() + 60 * 60 * 1000);
                            timeStr = `${startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
                        } else if (timeStr) timeStr = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                        const teacherForModal = eventType === 'schedule' ? (props.teacherFullName || props.teacher || '') : (props.teacher || '');
                        return {
                            id: event.id,
                            title: event.title || '',
                            start: typeof event.start === 'string' ? event.start.split('T')[0] : (event.start as Date).toISOString().split('T')[0],
                            subject: props.subject || '',
                            teacher: teacherForModal,
                            time: timeStr,
                            description: props.description || '',
                            url,
                            type: eventType,
                            room: props.room,
                            classroom: props.classroom,
                            target_audience: props.target_audience,
                            subject_group_display: props.subject_group_display,
                            target_users: props.target_users_details,
                        };
                    });
                    modalController.open('events-list-modal', {
                        events: eventsData,
                        date: clickedDate.toISOString().split('T')[0],
                    });
                } else if (overlappingEvents.length === 1) {
                    // Single event - show normal event modal
                    const event = overlappingEvents[0];
                    const props = (event as any).extendedProps || {};
                    const eventType = props.type || '';
                    const eventId = (event.id || '').replace(`${eventType}-`, '');
                    
                    let url: string | undefined;
                    if (eventType === 'test') {
                        url = `/tests/${eventId}`;
                    } else if (eventType === 'assignment') {
                        url = `/assignments/${eventId}`;
                    }
                    
                    let timeStr = props.time || '';
                    if (!timeStr && event.start) {
                        const startTime = new Date(event.start);
                        const endTime = event.end 
                            ? new Date(event.end)
                            : new Date(startTime.getTime() + 60 * 60 * 1000);
                        timeStr = `${startTime.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })} - ${endTime.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}`;
                        } else if (timeStr) {
                        // Remove seconds from time string if present (HH:MM:SS -> HH:MM)
                        // Match pattern like "09:00:00" or "09:00:00 - 10:30:00" and remove :SS part
                        timeStr = timeStr.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
                    }
                    
                    // For schedule events, use full name in modal; for others, use what's available
                    const teacherForModal = eventType === 'schedule'
                        ? (props.teacherFullName || props.teacher || '')
                        : (props.teacher || '');
                    
                    const eventData: EventModalData = {
                        title: event.title || '',
                        start: event.start || '',
                        subject: props.subject || '',
                        teacher: teacherForModal,
                        time: timeStr,
                        description: props.description || '',
                        url: url,
                        type: eventType as EventModalData['type'],
                        room: props.room,
                        classroom: props.classroom,
                        target_audience: props.target_audience,
                        subject_group_display: props.subject_group_display,
                        target_users: props.target_users_details,
                    };
                    modalController.open('event-modal', eventData);
                }
            },
            datesSet: function (arg: { start: Date; end: Date; view: any }) {
                setCurrentDateRange({
                    start: arg.start,
                    end: arg.end,
                });
            },
        }),
        [calendarEvents, isMobile, view, t, locale, onDateChange, getEventsForDay, isAdmin, user?.role]
    );

    // Show loading state
    if (loading) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="pl-8 pr-6 pt-6 pb-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">
                            Загрузка календаря...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="pl-8 pr-6 pt-6 pb-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-red-500">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    // View labels for segmented switcher
    const VIEW_OPTIONS: { key: CalendarView; label: string }[] = [
        { key: 'dayGridMonth',  label: t('dashboard.calendarButtons.month') },
        { key: 'timeGridWeek',  label: t('dashboard.calendarButtons.week')  },
        { key: 'timeGridDay',   label: t('dashboard.calendarButtons.day')   },
    ];

    return (
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
            {/* ── Toolbar ── */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                {/* Left: nav arrows + date title */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Date range */}
                <span className="text-sm font-semibold text-gray-800 min-w-0 truncate flex-1">
                    {formatDateRange()}
                </span>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Today */}
                    <button
                        type="button"
                        onClick={handleTodayClick}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        {t('dashboard.calendarButtons.today')}
                    </button>

                    {/* Segmented view switcher */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        {VIEW_OPTIONS.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleViewChange(key)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                                    view === key
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Create event (admin) */}
                    {(user?.role === 'schooladmin' || user?.role === 'superadmin') && (
                        <button
                            type="button"
                            onClick={() => setCreateEventModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('schedule.createEvent')}</span>
                        </button>
                    )}

                    {/* Injected right slot (e.g. panel toggle from dashboard) */}
                    {rightSlot}
                </div>
            </div>

            {/* ── Calendar grid ── */}
            <div className="px-4 pb-4 pt-0">
                <div className="calendar-container">
                    <FullCalendar
                        ref={calendarRef}
                        key={`${view}-${isMobile ? 'mobile' : 'desktop'}`}
                        {...calendarOptions}
                    />
                </div>
            </div>
            <CreateEventModal
                isOpen={createEventModalOpen}
                onClose={() => setCreateEventModalOpen(false)}
                onSuccess={fetchCalendarData}
            />
        </div>
    );
};

export default Calendar;
