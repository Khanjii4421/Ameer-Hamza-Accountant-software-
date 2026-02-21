'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { api } from '@/lib/api';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await api.profile.get();
                if (profile?.name) {
                    document.title = `${profile.name} - Management System`;
                }
            } catch (error) {
                console.error('Failed to load company profile for title:', error);
            }
        };
        fetchProfile();
    }, []);

    // If on login page or employee section, don't show sidebar
    if (pathname === '/login' || pathname.startsWith('/employee')) {
        return <div className="min-h-screen bg-gray-50">{children}</div>;
    }

    return (
        <SidebarProvider>
            <ShellContent>{children}</ShellContent>
        </SidebarProvider>
    );
};

const ShellContent = ({ children }: { children: React.ReactNode }) => {
    const { isCollapsed } = useSidebar();

    return (
        <div className="flex min-h-screen bg-slate-50 relative">
            <Sidebar />
            <main
                className={`flex-1 relative flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0' : 'ml-0 lg:ml-72'
                    }`}
            >
                {children}
            </main>
        </div>
    );
};
