'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Notification } from "@/lib/api";

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'Admin';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        try {
            const data = await api.notifications.getAll();
            setNotifications(data);
        } catch (e) {
            console.error('Failed to load notifications', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const markAsRead = async (id: string, related_id?: string) => {
        try {
            await api.notifications.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));

            // If it's a leave request, maybe navigate to Leaves page?
            // Assuming related_id is leave_id.
            if (related_id) {
                // Navigate logic could be added here if needed, e.g. router.push(`/hr/leaves?highlight=${related_id}`)
                // For now, just mark read.
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!user) return null;

    const unread = notifications.filter(n => n.is_read === 0);
    const read = notifications.filter(n => n.is_read === 1);

    return (
        <>
            <Header title="Notifications" />
            <div className="p-8 max-w-5xl mx-auto space-y-6">

                {/* Unread Section */}
                <Card title={`New Notifications (${unread.length})`} className="border-l-4 border-l-blue-500">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400">Loading...</div>
                    ) : unread.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                            <span className="text-4xl mb-2">📭</span>
                            <p>No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {unread.map(n => (
                                <div key={n.id} className="p-4 hover:bg-blue-50/50 transition-colors flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {n.type === 'info' && <span className="text-blue-500">ℹ️</span>}
                                            {n.type === 'success' && <span className="text-emerald-500">✅</span>}
                                            {n.type === 'warning' && <span className="text-amber-500">⚠️</span>}
                                            {n.type === 'error' && <span className="text-red-500">🛑</span>}
                                            <h4 className="font-bold text-gray-800 text-sm">{n.title}</h4>
                                            <span className="text-xs text-gray-400 ml-auto md:ml-2">{new Date(n.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 pl-6">{n.message}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => markAsRead(n.id, n.related_id)}
                                            className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors whitespace-nowrap"
                                        >
                                            Mark Read
                                        </button>
                                        {n.related_id && (
                                            <button
                                                onClick={() => router.push('/hr/leaves')} // Assuming mostly leaves for now
                                                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors whitespace-nowrap"
                                            >
                                                View Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* History Section */}
                {read.length > 0 && (
                    <Card title="History" className="opacity-80">
                        <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                            {read.map(n => (
                                <div key={n.id} className="p-3 hover:bg-gray-50 flex justify-between items-center opacity-60">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">✔️</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">{n.title}</p>
                                            <p className="text-xs text-gray-500">{n.message}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
}
