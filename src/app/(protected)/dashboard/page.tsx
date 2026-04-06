'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUserState } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import Calender from '@/components/dashboard/Calender';
import DaySchedule from '@/components/dashboard/DaySchedule';
import PendingAssignments from '@/components/dashboard/PendingAssignments';
import AverageGradeBlock from '@/components/dashboard/AverageGradeBlock';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DayScheduleEvent {
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
    url?: string;
    sortKeyMinutes?: number;
}

const PANEL_KEY = 'dashboard_right_panel_open';

const PANEL_WIDTH = 340;

export default function DashboardPage() {
    const { user } = useUserState();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
    const [dayEvents, setDayEvents] = useState<DayScheduleEvent[]>([]);
    const [panelOpen, setPanelOpen] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(PANEL_KEY);
            return stored === null ? true : stored === 'true';
        }
        return true;
    });

    const handleDateChange = useCallback((date: Date, events: DayScheduleEvent[]) => {
        setSelectedDate(date);
        setDayEvents(events);
    }, []);

    const handleDayOffset = useCallback((delta: number) => {
        setSelectedDate(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + delta);
            return next;
        });
    }, []);

    const togglePanel = () => {
        setPanelOpen(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') localStorage.setItem(PANEL_KEY, String(next));
            return next;
        });
    };

    useEffect(() => {
        if (user?.role === 'parent') router.push('/parent/dashboard');
    }, [user, router]);

    if (user?.role === 'parent') return null;

    const panelToggle: ReactNode = (
        <button
            onClick={togglePanel}
            title={panelOpen ? 'Скрыть расписание' : 'Показать расписание'}
            className="
                hidden lg:flex items-center gap-1.5 px-3 py-1.5
                border border-gray-200 rounded-lg
                text-xs font-medium text-gray-500
                hover:text-violet-600 hover:bg-violet-50 hover:border-violet-300
                transition-all duration-150
            "
        >
            {panelOpen ? (
                <>
                    <PanelRightClose className="w-4 h-4" />
                    <span>Скрыть</span>
                </>
            ) : (
                <>
                    <PanelRightOpen className="w-4 h-4" />
                    <span>Расписание</span>
                </>
            )}
        </button>
    );

    return (
        <div className={`relative flex items-start w-full min-h-0 transition-all duration-300 ${panelOpen ? 'gap-4' : 'gap-0'}`}>
            {/* ── Calendar — fills remaining space ── */}
            <div className="flex-1 min-w-0">
                <Calender
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    rightSlot={panelToggle}
                />
            </div>

            {/* ── Right panel — slides in/out ── */}
            <div
                className={`
                    hidden lg:block flex-shrink-0
                    transition-all duration-300 ease-in-out overflow-hidden
                `}
                style={{ width: panelOpen ? `${PANEL_WIDTH}px` : 0 }}
            >
                {/* Fixed-width inner — prevents layout jitter during transition */}
                <div
                    className="flex flex-col gap-4"
                    style={{ width: `${PANEL_WIDTH}px` }}
                >
                    {user?.role === 'student' && (
                        <>
                            <AverageGradeBlock />
                            <PendingAssignments />
                        </>
                    )}
                    <DaySchedule
                        date={selectedDate}
                        events={dayEvents}
                        onChangeDate={handleDayOffset}
                    />
                </div>
            </div>

            {/* ── Mobile: stacked below calendar ── */}
            <div className="lg:hidden w-full flex flex-col gap-4 mt-4">
                {user?.role === 'student' && (
                    <>
                        <AverageGradeBlock />
                        <PendingAssignments />
                    </>
                )}
                <DaySchedule
                    date={selectedDate}
                    events={dayEvents}
                    onChangeDate={handleDayOffset}
                />
            </div>
        </div>
    );
}
