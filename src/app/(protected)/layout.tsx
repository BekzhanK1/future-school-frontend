'use client';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ForcePasswordChangeGate from '@/components/auth/ForcePasswordChangeGate';
import { useUserState, useUserActions } from '@/contexts/UserContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { sidebarOpen } = useSidebar();

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden min-[576px]:block">
                <Sidebar />
            </div>

            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
                    sidebarOpen ? 'min-[576px]:ml-[240px]' : 'lg:ml-[240px]'
                }`}
            >
                <Navbar />
                <main className="flex-1 p-4 lg:p-8 pb-20 min-[576px]:pb-4 overflow-y-auto w-screen min-[576px]:w-auto">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation - Only visible on mobile */}
            <MobileBottomNav />
        </div>
    );
}

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading, user } = useUserState();
    const { logout } = useUserActions();

    useEffect(() => {
        // Only redirect if we're not loading and not authenticated
        if (!isLoading && !isAuthenticated) {
            logout();
            redirect('/login');
        }
    }, [isAuthenticated, isLoading, logout]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    // Don't render protected content if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    if (user?.must_change_password) {
        return <ForcePasswordChangeGate />;
    }

    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
