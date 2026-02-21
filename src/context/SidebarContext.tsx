'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type SidebarContextType = {
    isCollapsed: boolean;
    toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
    isCollapsed: false,
    toggleSidebar: () => { },
});

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsCollapsed(true);
            } else {
                const stored = localStorage.getItem('sidebar_collapsed');
                if (stored) setIsCollapsed(JSON.parse(stored));
            }
        };

        // Initial check
        handleResize();

        // Optional: Listen for resize events to auto-collapse when shrinking window
        // window.addEventListener('resize', handleResize);
        // return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const newVal = !prev;
            localStorage.setItem('sidebar_collapsed', JSON.stringify(newVal));
            return newVal;
        });
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => useContext(SidebarContext);
