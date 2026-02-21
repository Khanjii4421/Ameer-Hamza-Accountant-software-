'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';

type AnnouncementType = 'announcement' | 'holiday' | 'urgent';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: AnnouncementType;
    holiday_date?: string;
    created_at: string;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', type: 'announcement' as AnnouncementType, holiday_date: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try { setAnnouncements(await api.announcements.getAll()); } catch { }
    };

    const save = async () => {
        if (!form.title.trim() || !form.message.trim()) { alert('Title and message are required'); return; }
        setSaving(true);
        try {
            await api.announcements.add(form);
            setForm({ title: '', message: '', type: 'announcement', holiday_date: '' });
            setShowForm(false);
            await load();
        } catch (e: any) { alert(e.message); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        await api.announcements.delete(id);
        await load();
    };

    const typeConfig: Record<AnnouncementType, { label: string; icon: string; bg: string; badge: string; border: string }> = {
        holiday: { label: 'Holiday', icon: '🏖️', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
        announcement: { label: 'Announcement', icon: '📢', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
        urgent: { label: 'Urgent', icon: '🚨', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', border: 'border-red-200' },
    };

    const fmtDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
    };

    const inp = 'w-full px-4 py-3 rounded-xl border border-black/10 bg-white/80 text-sm font-medium outline-none focus:ring-2 focus:ring-black/10 transition-all';
    const lbl = 'text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header title="Announcements & Holidays" action={<button onClick={() => setShowForm(s => !s)} className="px-4 py-2 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow">📢 New Announcement</button>} />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* CREATE FORM */}
                {showForm && (
                    <div className="bg-white/90 backdrop-blur-xl border border-black/10 rounded-2xl p-6 shadow-2xl animate-fadeIn">
                        <h2 className="text-sm font-black uppercase tracking-wider mb-5 text-slate-800">📝 Create Announcement</h2>

                        <div className="space-y-4">
                            {/* Type selector */}
                            <div>
                                <label className={lbl}>Type</label>
                                <div className="flex gap-3">
                                    {(['announcement', 'holiday', 'urgent'] as AnnouncementType[]).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setForm({ ...form, type: t })}
                                            className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${form.type === t ? `${typeConfig[t].badge} ${typeConfig[t].border} border-2` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            {typeConfig[t].icon} {typeConfig[t].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={lbl}>Title *</label>
                                <input className={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Company Holiday — Eid ul Fitr" />
                            </div>

                            <div>
                                <label className={lbl}>Message *</label>
                                <textarea className={inp + ' resize-none h-28'} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Describe the announcement in detail..." />
                            </div>

                            {form.type === 'holiday' && (
                                <div>
                                    <label className={lbl}>Holiday Date</label>
                                    <input type="date" className={inp} value={form.holiday_date} onChange={e => setForm({ ...form, holiday_date: e.target.value })} />
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    {saving ? '⏳ Sending...' : `${typeConfig[form.type].icon} Send to All Employees`}
                                </button>
                                <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ANNOUNCEMENTS FEED */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        📋 All Announcements ({announcements.length})
                    </p>

                    {announcements.length === 0 ? (
                        <div className="bg-white/80 rounded-2xl border border-black/8 p-16 text-center">
                            <p className="text-5xl mb-3">📭</p>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-300">No announcements yet</p>
                            <p className="text-xs text-slate-400 mt-2">Click "New Announcement" to notify all employees.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map(a => {
                                const cfg = typeConfig[a.type as AnnouncementType] || typeConfig.announcement;
                                return (
                                    <div key={a.id} className={`group ${cfg.bg} border ${cfg.border} rounded-2xl p-5 flex gap-4 items-start hover:shadow-md transition-all`}>
                                        <div className="text-3xl flex-shrink-0 mt-0.5">{cfg.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                                {a.holiday_date && (
                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-white/80 text-slate-600 border border-slate-200">
                                                        📅 {new Date(a.holiday_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-slate-400 ml-auto font-semibold">{fmtDate(a.created_at)}</span>
                                            </div>
                                            <h3 className="font-black text-slate-800 text-sm mb-1">{a.title}</h3>
                                            <p className="text-xs text-slate-600 leading-relaxed">{a.message}</p>
                                        </div>
                                        <button
                                            onClick={() => remove(a.id)}
                                            className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 text-sm transition-all flex-shrink-0"
                                            title="Delete"
                                        >🗑</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease; }
            `}</style>
        </div>
    );
}
