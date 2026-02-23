'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { api, CompanyProfile } from '@/lib/api';
import { useState, useEffect } from 'react';

import { useSidebar } from '@/context/SidebarContext';

export const Sidebar = () => {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    useEffect(() => {
        api.profile.get().then(res => {
            if (res) setProfile(res);
        });
    }, []);

    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 'Accounts': true });

    const toggleSubmenu = (name: string) => {
        setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const menuItems = [
        {
            name: 'Accounts',
            icon: '💰',
            submenu: [
                { name: 'Dashboard', href: '/' },
                { name: 'Labor Expenses', href: '/labor-expenses', roles: ['Admin', 'Manager'] },
                { name: 'Labor Payment Received', href: '/labor-payments-received', roles: ['Admin', 'Manager'] },
                { name: 'Vendors', href: '/vendors' },
                { name: 'Expenses', href: '/office-expenses', roles: ['Admin', 'Manager'] },
            ]
        },
        { name: 'Daily Expenses', href: '/independent-expenses', icon: '📝' },
        { name: 'DPR', href: '/dpr', icon: '🏗️' },
        { name: 'Clients & Projects', href: '/clients', icon: '👥' },
        {
            name: 'HR',
            icon: '👔',
            submenu: [
                { name: 'Dashboard', href: '/hr' },
                { name: 'Payroll', href: '/hr/payroll' },
                { name: 'Attendance', href: '/hr/attendance' },
                { name: 'File Record Checklist', href: '/hr/file-record' },
                { name: 'Joining Report', href: '/hr/joining-report' },
                { name: 'Bio Data Form', href: '/hr/bio-data' },
                { name: 'ID Card App.', href: '/hr/id-card-application' },
                { name: 'Bike Issuance', href: '/hr/bike-issuance' },
                { name: 'Leave Application', href: '/hr/leave-application' },
                { name: 'Resignation Letter', href: '/hr/resignation-letter' },
                { name: 'Appreciation Letter', href: '/hr/appreciation-letter' },
                { name: 'Company Agreements', href: '/hr/agreements' },
                { name: 'Saved Documents', href: '/hr/documents' },
                { name: 'Announcements', href: '/hr/announcements' }
            ]
        },
        { name: 'Reports', href: '/reports', icon: '📈' },
        { name: 'Daily Work', href: '/daily-work', icon: '📋' },
        { name: 'Settings', href: '/settings', icon: '⚙️', roles: ['Admin', 'Manager'] },
        { name: 'Notifications', href: '/notifications', icon: '🔔', roles: ['Admin'] },
    ];

    const logoSrc = profile?.sidebar_logo_url || '/logo.png';

    const filteredItems = menuItems.filter(item => {
        if (item.roles) {
            return item.roles.includes(user?.role || '');
        }
        return true;
    });

    return (
        <>
            {/* Backdrop for mobile */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden transition-all duration-300"
                    onClick={toggleSidebar}
                />
            )}

            {/* Toggle Button for Mobile (Hamburger) */}
            <button
                onClick={toggleSidebar}
                className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-[#0a0f1c] text-white rounded-xl shadow-lg border border-white/10 transition-transform active:scale-95"
                title="Toggle Sidebar"
            >
                {isCollapsed ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                )}
            </button>

            {/* Toggle Button for Desktop (Collapse arrow) */}
            <button
                onClick={toggleSidebar}
                className={`hidden lg:flex fixed top-6 z-[60] p-1.5 bg-[#151e32] text-white hover:text-blue-400 rounded-r-xl shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)] border border-l-0 border-white/10 transition-all duration-300 items-center justify-center h-10 w-8 ${isCollapsed ? 'left-0' : 'left-72'
                    }`}
                title="Toggle Sidebar"
            >
                <svg className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <aside
                className={`fixed left-0 top-0 h-screen bg-[#0a0f1c] border-r border-white/5 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-in-out ${isCollapsed ? '-translate-x-full' : 'translate-x-0'} w-72 lg:w-72`}
            >
                {/* Header / Logo */}
                <div className="h-28 flex items-center justify-center px-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative mt-2 lg:mt-0">
                    <div className="relative h-16 w-full flex items-center justify-center mb-2 animate-fade-in group gap-3">
                        {logoSrc === '/logo.png' ? (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transform transition-transform group-hover:scale-105">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-white tracking-wider uppercase leading-tight">Secure</span>
                                    <span className="text-xs font-bold text-blue-400 tracking-[0.2em] uppercase">Portal</span>
                                </div>
                            </div>
                        ) : (
                            <Image
                                src={logoSrc}
                                alt="Company Logo"
                                fill
                                sizes="200px"
                                className="object-contain opacity-90 drop-shadow-xl"
                                priority
                            />
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {filteredItems.map((item) => {
                        if (item.submenu) {
                            const isSubmenuActive = item.submenu.some(sub => pathname === sub.href);
                            return (
                                <div key={item.name} className="mb-3">
                                    <div
                                        className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer group hover:bg-white/5 
                                            ${isSubmenuActive ? 'bg-white/5 border border-white/5' : ''}`}
                                        onClick={() => toggleSubmenu(item.name)}
                                    >
                                        <span className={`mr-4 p-2 rounded-xl text-lg transition-colors flex items-center justify-center w-10 h-10 ${isSubmenuActive ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200'}`}>{item.icon}</span>
                                        <span className={`font-bold tracking-wide flex-1 text-sm transition-colors ${isSubmenuActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{item.name}</span>
                                        <span className={`text-[10px] text-slate-500 transition-transform duration-300 ${expandedMenus[item.name] ? 'rotate-180 text-blue-400' : ''}`}>▼</span>
                                    </div>
                                    <div className={`mt-1 ml-5 space-y-1 overflow-hidden transition-all duration-300 ${expandedMenus[item.name] ? 'max-h-96 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                                        {item.submenu.map(sub => {
                                            if (sub.roles && !sub.roles.includes(user?.role || '')) return null;
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.name}
                                                    href={sub.href}
                                                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-l-2 ml-4
                                                        ${isSubActive
                                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-slate-600'}
                                                    `}
                                                    onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                                                >
                                                    {sub.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                                className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group mb-2 border
                                    ${isActive
                                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)]'
                                        : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/5'}
                                `}
                            >
                                <span className={`mr-4 p-2 rounded-xl text-lg flex items-center justify-center w-10 h-10 transition-all duration-300
                                    ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200 group-hover:scale-105 group-active:scale-95'}`}>
                                    {item.icon}
                                </span>
                                <span className={`tracking-wide text-sm font-bold ${isActive ? 'text-white' : ''}`}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Info */}
                <div className="p-4 border-t border-white/5 bg-[#0a0f1c] mt-auto">
                    <div className="flex items-center gap-3 px-3 py-3 bg-white/5 rounded-2xl border border-white/5 shadow-sm transition-all hover:bg-white/10 hover:border-white/10 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg uppercase shrink-0 shadow-lg shadow-indigo-500/30 relative overflow-hidden">
                            <span className="relative z-10">{user?.name?.charAt(0) || 'U'}</span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest truncate">{user?.role || 'Viewer'}</p>
                        </div>
                        <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-xl" title="Logout">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
