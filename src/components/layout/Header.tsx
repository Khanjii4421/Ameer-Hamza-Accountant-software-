'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

interface HeaderProps {
    title: string;
    action?: React.ReactNode | { label: string; onClick: () => void };
}

interface NotifItem {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: number;
    created_at: string;
}

// Toast popup shown when new notification arrives
function NotifToast({ notif, onClose }: { notif: NotifItem; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [onClose]);

    const icon = notif.type === 'success' ? '✅' : notif.type === 'error' ? '❌' : notif.type === 'warning' ? '⚠️' : '📣';

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] flex items-start gap-3 p-4 bg-white rounded-2xl shadow-2xl border border-black/10 max-w-sm animate-slide-up"
            style={{ animation: 'slideUp 0.3s ease' }}
        >
            <div className="text-2xl flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-xs uppercase tracking-wide text-slate-800">{notif.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{notif.message}</p>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0 text-lg leading-none">×</button>
        </div>
    );
}

export const Header = ({ title, action }: HeaderProps) => {
    const [notifications, setNotifications] = useState<NotifItem[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const [toast, setToast] = useState<NotifItem | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await api.notifications.getAll() as any as NotifItem[];
            setNotifications(data);

            // Detect new notifications (not on first load)
            if (!isFirstLoad.current) {
                const newOnes = data.filter(n => !prevIdsRef.current.has(n.id) && !n.is_read);
                if (newOnes.length > 0) {
                    setToast(newOnes[0]); // Show most recent as toast
                }
            }

            prevIdsRef.current = new Set(data.map(n => n.id));
            isFirstLoad.current = false;
        } catch (_) { }
    }, []);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowPanel(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markRead = async (id: string) => {
        await api.notifications.markRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    };

    const markAllRead = async () => {
        await api.notifications.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    };

    const fmtTime = (dt: string) => {
        try { return new Date(dt).toLocaleString('en-PK', { hour12: true, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }); }
        catch { return dt; }
    };

    const typeColor = (type: string) => {
        if (type === 'success') return 'text-emerald-500';
        if (type === 'error') return 'text-red-500';
        if (type === 'warning') return 'text-amber-500';
        return 'text-blue-500';
    };
    const typeIcon = (type: string) => {
        if (type === 'success') return '✅';
        if (type === 'error') return '❌';
        if (type === 'warning') return '⚠️';
        return '📣';
    };

    return (
        <>
            {/* Toast Popup */}
            {toast && <NotifToast notif={toast} onClose={() => setToast(null)} />}

            <header className="sticky top-0 z-40 w-full glass-card border-b border-borderColor transition-all duration-300">
                <div className="max-w-7xl mx-auto pl-16 pr-4 sm:px-6 lg:pl-8 h-20 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate animate-fade-in">{title}</h2>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <button
                            onClick={() => {
                                const html = document.documentElement;
                                if (html.classList.contains('dark')) {
                                    html.classList.remove('dark');
                                    localStorage.setItem('theme', 'light');
                                } else {
                                    html.classList.add('dark');
                                    localStorage.setItem('theme', 'dark');
                                }
                            }}
                            className="p-2 text-foreground hover:bg-secondary rounded-xl transition-all shadow-sm"
                            title="Toggle Theme"
                        >
                            🌓
                        </button>
                        {action && (
                            <div className="animate-fade-in">
                                {action && typeof action === 'object' && 'label' in (action as any)
                                    ? <button onClick={(action as any).onClick} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow">{(action as any).label}</button>
                                    : action as React.ReactNode
                                }
                            </div>
                        )}
                        <div className="hidden sm:block h-8 w-px bg-border mx-2" />

                        {/* Notification Bell */}
                        <div className="relative" ref={panelRef}>
                            <button
                                onClick={() => { setShowPanel(p => !p); if (!showPanel) fetchNotifications(); }}
                                className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
                                title="Notifications"
                            >
                                <span className="text-xl">🔔</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Panel */}
                            {showPanel && (
                                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-black/10 overflow-hidden z-50">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-widest">Notifications</p>
                                            {unreadCount > 0 && <p className="text-[10px] text-white/60">{unreadCount} unread</p>}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-[10px] font-black text-white/70 hover:text-white uppercase tracking-wide transition-colors">
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    {/* List */}
                                    <div className="max-h-[360px] overflow-y-auto divide-y divide-black/5">
                                        {notifications.length === 0 ? (
                                            <div className="py-10 text-center text-black/30">
                                                <p className="text-3xl mb-2">🔕</p>
                                                <p className="text-xs font-black uppercase tracking-widest">No notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => markRead(n.id)}
                                                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}
                                                >
                                                    <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[11px] font-black ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                                                        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{n.message}</p>
                                                        <p className="text-[9px] text-slate-400 mt-1">{fmtTime(n.created_at)}</p>
                                                    </div>
                                                    {!n.is_read && (
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
};
