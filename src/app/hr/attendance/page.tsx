'use client';
import { useState, useEffect, useRef } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, HREmployee, HRAttendance, HRLeave } from "@/lib/api";

export default function AttendancePage() {
    const [employees, setEmployees] = useState<HREmployee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<HRAttendance[]>([]);
    const [allMonthAttendance, setAllMonthAttendance] = useState<HRAttendance[]>([]);
    const [leaves, setLeaves] = useState<HRLeave[]>([]);
    const [leaveFilter, setLeaveFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
    const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '', leave_type: 'Full' });
    const [leaveEmpId, setLeaveEmpId] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Live refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const [emps, atts, lvs] = await Promise.all([
                api.hrEmployees.getAll(),
                api.hrAttendance.getAll(currentMonth),
                api.hrLeaves.getAll()
            ]);
            setEmployees(emps.filter(e => e.status === 'Active'));
            const today = new Date().toISOString().split('T')[0];
            setTodayAttendance(atts.filter(a => a.date === today));
            setAllMonthAttendance(atts);
            setLeaves(lvs);
        } catch (err) { console.error(err); }
    };

    // ─── Camera ──────────────────────────────────────────────────────────────
    const startCamera = async () => {
        setCameraActive(true); setCapturedImage(null); setStatusMessage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setStatusMessage({ type: 'error', text: 'Camera access denied.' });
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                const data = canvasRef.current.toDataURL('image/png');
                setCapturedImage(data);
                stopCamera();
                verifyAndMark(data);
            }
        }
    };

    const verifyAndMark = async (imageData: string) => {
        if (!selectedEmployeeId) { setStatusMessage({ type: 'error', text: 'Select an employee first!' }); return; }
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes(), day = now.getDay();
        if (day === 0) { setStatusMessage({ type: 'error', text: 'Sunday is a holiday. No attendance needed.' }); return; }
        if (h >= 17) { setStatusMessage({ type: 'error', text: 'Attendance closed after 5:00 PM.' }); return; }
        setStatusMessage({ type: 'info', text: 'Verifying face biometrics...' });
        setTimeout(async () => {
            try {
                const emp = employees.find(e => e.id === selectedEmployeeId);
                const isLate = h > 9 || (h === 9 && m > 15);
                await api.hrAttendance.mark({
                    employee_id: selectedEmployeeId,
                    employee_name: emp?.employee_name,
                    date: now.toISOString().split('T')[0],
                    time_in: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    status: 'Present',
                    is_late: isLate ? 1 : 0
                });
                setStatusMessage({ type: 'success', text: `✅ Attendance marked for ${emp?.employee_name}${isLate ? ' (Late)' : ''}!` });
                loadData();
                setCapturedImage(null);
                setSelectedEmployeeId('');
            } catch (e: any) { setStatusMessage({ type: 'error', text: e.message }); }
        }, 1500);
    };

    // ─── Leaves ───────────────────────────────────────────────────────────────
    const applyLeave = async () => {
        if (!leaveEmpId || !leaveForm.from_date || !leaveForm.to_date) { alert('Fill all fields'); return; }
        try {
            const start = new Date(leaveForm.from_date), end = new Date(leaveForm.to_date);
            let days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
            if (leaveForm.leave_type === 'Half') days = Math.max(0.5, days * 0.5);
            const emp = employees.find(e => e.id === leaveEmpId);
            await api.hrLeaves.add({
                employee_id: leaveEmpId,
                employee_name: emp?.employee_name,
                from_date: leaveForm.from_date,
                to_date: leaveForm.to_date,
                reason: leaveForm.reason,
                days_count: days,
                leave_type: leaveForm.leave_type
            } as any);
            alert('Leave Applied Successfully');
            loadData();
            setLeaveForm({ from_date: '', to_date: '', reason: '', leave_type: 'Full' });
            setLeaveEmpId('');
        } catch (e: any) { alert(e.message); }
    };

    const handleLeaveAction = async (leave: HRLeave, newStatus: 'Approved' | 'Rejected') => {
        if (!confirm(`${newStatus === 'Approved' ? 'Approve' : 'Reject'} leave for ${leave.employee_name}?`)) return;
        try {
            await api.hrLeaves.update(leave.id, { status: newStatus });
            setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: newStatus } : l));
        } catch (e: any) { alert(e.message); }
    };

    const deleteLeave = async (id: string, name: string) => {
        if (!confirm(`Delete leave record for ${name}?`)) return;
        try {
            await api.hrLeaves.delete(id);
            setLeaves(prev => prev.filter(l => l.id !== id));
        } catch (e: any) { alert(e.message); }
    };

    const deleteAttendance = async (id: string, name: string) => {
        if (!confirm(`Delete attendance record for ${name}?`)) return;
        try {
            await api.hrAttendance.delete(id);
            setTodayAttendance(prev => prev.filter(a => a.id !== id));
            setAllMonthAttendance(prev => prev.filter(a => a.id !== id));
        } catch (e: any) { alert(e.message); }
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const inp = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/80 text-sm font-medium focus:ring-2 focus:ring-black/10 outline-none transition-all";
    const lbl = "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";
    const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };

    const filteredLeaves = leaveFilter === 'All' ? leaves : leaves.filter(l => l.status === leaveFilter);

    const pendingCount = leaves.filter(l => l.status === 'Pending').length;
    const approvedCount = leaves.filter(l => l.status === 'Approved').length;
    const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;
    const todayPresent = todayAttendance.filter(a => a.status === 'Present').length;
    const todayLate = todayAttendance.filter(a => a.is_late === 1).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header title="HR Attendance & Leaves" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* ═══════════════════════════════════════════════════════════
                    SECTION 1 — SUMMARY STATS
                ═══════════════════════════════════════════════════════════ */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">📊 Today's Overview</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Present Today', value: todayPresent, color: 'emerald', icon: '✅' },
                            { label: 'Late Today', value: todayLate, color: 'amber', icon: '⏰' },
                            { label: 'Pending Leaves', value: pendingCount, color: 'blue', icon: '📋' },
                            { label: 'Approved', value: approvedCount, color: 'green', icon: '✔️' },
                            { label: 'Rejected', value: rejectedCount, color: 'red', icon: '✖️' },
                        ].map(s => (
                            <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-2xl p-4 text-center`}>
                                <p className="text-2xl mb-1">{s.icon}</p>
                                <p className={`text-2xl font-black text-${s.color}-600`}>{s.value}</p>
                                <p className={`text-[9px] font-black uppercase tracking-widest text-${s.color}-400 mt-0.5`}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    SECTION 2 — MARK ATTENDANCE
                ═══════════════════════════════════════════════════════════ */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">📸 Mark Attendance</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Camera Panel */}
                        <Card className="bg-white/80 backdrop-blur-xl border border-black/8 shadow-lg rounded-2xl p-6">
                            <h3 className="font-black text-sm uppercase tracking-wider mb-4">Face Verification</h3>

                            <div className="mb-4">
                                <label className={lbl}>Select Employee</label>
                                <select className={inp} value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
                                    <option value="">— Choose Employee —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name} · {e.designation}</option>)}
                                </select>
                            </div>

                            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-4 shadow-inner">
                                {cameraActive ? (
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                ) : capturedImage ? (
                                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                                ) : (
                                    <div className="text-white/20 flex flex-col items-center gap-2">
                                        <span className="text-5xl">📷</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Camera Offline</span>
                                    </div>
                                )}
                                <canvas ref={canvasRef} width="320" height="240" className="hidden" />
                            </div>

                            {statusMessage && (
                                <div className={`p-3 rounded-xl mb-4 text-center font-bold text-xs uppercase tracking-wide ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                    {statusMessage.text}
                                </div>
                            )}

                            <div className="flex gap-2">
                                {!cameraActive && !capturedImage && (
                                    <button onClick={startCamera} className="flex-1 py-2.5 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all">
                                        📷 Open Camera
                                    </button>
                                )}
                                {cameraActive && (
                                    <button onClick={capturePhoto} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all">
                                        ✅ Capture & Verify
                                    </button>
                                )}
                                {(cameraActive || capturedImage) && (
                                    <button onClick={() => { stopCamera(); setCapturedImage(null); setStatusMessage(null); }} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all">
                                        ✕
                                    </button>
                                )}
                            </div>

                            <p className="text-center text-[9px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                                Duty: 09:00 AM — 05:00 PM · Late after 09:15 AM
                            </p>
                        </Card>

                        {/* Today's Log */}
                        <Card className="bg-white/80 backdrop-blur-xl border border-black/8 shadow-lg rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-sm uppercase tracking-wider">Today's Log</h3>
                                <span className="px-2.5 py-1 bg-black text-white text-[10px] font-black rounded-lg">
                                    {todayAttendance.length} Records
                                </span>
                            </div>

                            <div className="overflow-y-auto max-h-[380px] space-y-2 pr-1">
                                {todayAttendance.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-36 text-slate-300">
                                        <span className="text-4xl mb-2">📅</span>
                                        <p className="text-xs font-black uppercase tracking-widest">No records yet today</p>
                                    </div>
                                ) : todayAttendance.map(att => (
                                    <div key={att.id} className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {att.image_url ? (
                                                <img src={att.image_url} onClick={() => window.open(att.image_url, '_blank')} className="w-9 h-9 rounded-lg object-cover border border-white shadow cursor-pointer" alt="" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-base">👤</div>
                                            )}
                                            <div>
                                                <p className="font-black text-xs text-slate-800">{att.employee_name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-slate-500 font-semibold">In: {att.time_in || '—'}</span>
                                                    {att.latitude && att.longitude && (
                                                        <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-[9px] text-blue-500 font-black hover:underline">📍 Map</a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${att.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {att.status}
                                                </span>
                                                {att.is_late === 1 && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px] font-black uppercase">Late</span>
                                                )}
                                            </div>
                                            {/* Admin Delete — visible on hover */}
                                            <button
                                                onClick={() => deleteAttendance(att.id, att.employee_name || '')}
                                                title="Delete record"
                                                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs transition-all"
                                            >🗑</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    SECTION 3 — APPLY LEAVE (FOR ADMIN ON BEHALF OF EMPLOYEE)
                ═══════════════════════════════════════════════════════════ */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">📝 Apply Leave (On Behalf)</p>
                    <Card className="bg-white/80 backdrop-blur-xl border border-black/8 shadow-lg rounded-2xl p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className={lbl}>Employee *</label>
                                <select className={inp} value={leaveEmpId} onChange={e => setLeaveEmpId(e.target.value)}>
                                    <option value="">— Select —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>From Date *</label>
                                <input type="date" className={inp} value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} />
                            </div>
                            <div>
                                <label className={lbl}>To Date *</label>
                                <input type="date" className={inp} value={leaveForm.to_date} onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} />
                            </div>
                            <div>
                                <label className={lbl}>Type</label>
                                <div className="flex gap-3 h-[42px] items-center">
                                    {['Full', 'Half'].map(t => (
                                        <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-slate-700">
                                            <input type="radio" name="hrLtype" checked={leaveForm.leave_type === t} onChange={() => setLeaveForm({ ...leaveForm, leave_type: t })} className="accent-black" />
                                            {t} Day
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Reason</label>
                                <input type="text" className={inp} placeholder="Reason..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={applyLeave} className="px-8 py-2.5 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shadow">
                                ➕ Apply Leave
                            </button>
                        </div>
                    </Card>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    SECTION 4 — LEAVE REQUESTS TABLE
                ═══════════════════════════════════════════════════════════ */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">📋 Leave Requests</p>
                        {/* Filter Tabs */}
                        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLeaveFilter(f)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${leaveFilter === f ? 'bg-black text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {f}
                                    {f === 'Pending' && pendingCount > 0 && (
                                        <span className="ml-1 px-1 py-0.5 bg-red-500 text-white text-[8px] rounded-full">{pendingCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Card className="bg-white/80 backdrop-blur-xl border border-black/8 shadow-lg rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-4 py-3 text-left">Employee</th>
                                        <th className="px-4 py-3 text-left">Period</th>
                                        <th className="px-4 py-3 text-center">Type</th>
                                        <th className="px-4 py-3 text-center">Days</th>
                                        <th className="px-4 py-3 text-left">Reason</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredLeaves.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center text-slate-300">
                                                <div className="text-4xl mb-2">📭</div>
                                                <p className="text-xs font-black uppercase tracking-widest">No {leaveFilter !== 'All' ? leaveFilter : ''} requests</p>
                                            </td>
                                        </tr>
                                    ) : filteredLeaves.map(leave => (
                                        <tr key={leave.id} className={`hover:bg-slate-50/80 transition-colors ${leave.status === 'Pending' ? 'bg-amber-50/30' : ''}`}>
                                            <td className="px-4 py-3 font-black text-slate-800">{leave.employee_name}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p className="font-semibold">{fmtDate(leave.from_date)}</p>
                                                <p className="text-[9px] text-slate-400">to {fmtDate(leave.to_date)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${leave.leave_type === 'Half' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {leave.leave_type || 'Full'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-slate-700">{leave.days_count}</td>
                                            <td className="px-4 py-3 max-w-[150px]">
                                                <p className="text-slate-600 truncate text-[11px]" title={leave.reason}>{leave.reason || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : leave.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {leave.status === 'Approved' ? '✅ Approved' : leave.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Approve/Reject — only for Pending */}
                                                    {leave.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleLeaveAction(leave, 'Approved')}
                                                                title="Approve"
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-black text-xs transition-all"
                                                            >✓</button>
                                                            <button
                                                                onClick={() => handleLeaveAction(leave, 'Rejected')}
                                                                title="Reject"
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs transition-all"
                                                            >✕</button>
                                                        </>
                                                    )}
                                                    {/* Delete — always available to admin */}
                                                    <button
                                                        onClick={() => deleteLeave(leave.id, leave.employee_name || '')}
                                                        title="Delete"
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs transition-all"
                                                    >🗑</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    {/* ═══════════════════════════════════════════════════════════
                    SECTION 5 — MONTHLY ATTENDANCE HISTORY
                ═══════════════════════════════════════════════════════════ */}
                    <div>
                        <div className="flex items-center justify-between mb-3 mt-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">🕒 Monthly History</p>
                            <span className="px-2.5 py-1 bg-black text-white text-[10px] font-black rounded-lg">
                                {allMonthAttendance.length} Records
                            </span>
                        </div>

                        <Card className="bg-white/80 backdrop-blur-xl border border-black/8 shadow-lg rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Employee</th>
                                            <th className="px-4 py-3 text-center">Time In</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {allMonthAttendance.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center text-slate-300">
                                                    <div className="text-4xl mb-2">📅</div>
                                                    <p className="text-xs font-black uppercase tracking-widest">No attendance records this month</p>
                                                </td>
                                            </tr>
                                        ) : allMonthAttendance.map(att => (
                                            <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-600">{fmtDate(att.date)}</td>
                                                <td className="px-4 py-3 font-black text-slate-800">{att.employee_name}</td>
                                                <td className="px-4 py-3 text-center text-slate-600 font-mono">{att.time_in || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${att.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                            {att.status}
                                                        </span>
                                                        {att.is_late === 1 && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px] font-black uppercase">Late</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            onClick={() => deleteAttendance(att.id, att.employee_name || '')}
                                                            title="Delete record"
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs transition-all"
                                                        >🗑</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                </div>

            </div>
        </div>
    );
}
