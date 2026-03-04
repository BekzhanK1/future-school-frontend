'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUserState } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import Calender from '@/components/dashboard/Calender';
import DaySchedule from '@/components/dashboard/DaySchedule';
import PendingAssignments from '@/components/dashboard/PendingAssignments';
import AverageGradeBlock from '@/components/dashboard/AverageGradeBlock';

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
}

export default function DashboardPage() {
    const { user } = useUserState();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
    const [dayEvents, setDayEvents] = useState<DayScheduleEvent[]>([]);

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

    useEffect(() => {
        if (user?.role === 'parent') {
            router.push('/parent/dashboard');
        }
    }, [user, router]);

    if (user?.role === 'parent') {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {/* Календарь: сверху на мобилке, слева на десктопе */}
            <div className="w-full lg:flex-[3] order-3 md:order-1">
                <Calender
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                />
            </div>
            {/* Правая колонка: средний балл, задания, расписание на день */}
            <div className="w-full lg:flex-[2] flex flex-col gap-4 sm:flex-row md:flex-col order-1 md:order-2">
                {user?.role === 'student' && (
                    <>
                        <div className="order-1 sm:flex-1">
                            <AverageGradeBlock />
                        </div>
                        <div className="order-2 sm:flex-1">
                            <PendingAssignments />
                        </div>
                    </>
                )}
                <div className={user?.role === 'student' ? 'order-3 sm:flex-[1.2]' : 'sm:flex-1'}>
                    <DaySchedule
                        date={selectedDate}
                        events={dayEvents}
                        onChangeDate={handleDayOffset}
                    />
                </div>
            </div>
        </div>
    );
}
