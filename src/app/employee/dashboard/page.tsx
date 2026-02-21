'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, HRAttendance, HRLeave } from '@/lib/api';
import { Card } from "@/components/ui/Card";
import Image from 'next/image';

// -- CONFIGURATION --
const ATTENDANCE_CUTOFF_HOUR = 17; // 5:00 PM — Attendance rejected after this time
const LATE_THRESHOLD_HOUR = 9;     // 9:00 AM
const LATE_THRESHOLD_MINUTE = 15;  // 9:15 AM

export default function EmployeeDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'attendance' | 'work' | 'leaves'>('attendance');

    // State
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationError, setLocationError] = useState('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<HRAttendance[]>([]);

    // Stats State
    const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });

    // Work Log State
    const [workForm, setWorkForm] = useState({ description: '', feet: '', project_id: '', expenses: '', expense_description: '' });

    // Project State
    const [projects, setProjects] = useState<{ id: string, title: string }[]>([]);

    // Leave State
    const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '', leave_type: 'Full' });
    const [myLeaves, setMyLeaves] = useState<HRLeave[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!user) router.push('/login');
        if (user && user.role !== 'Employee') {
            // Future admin check
        }
        if (user?.employee_id) {
            loadData();
            loadProjects();
            // Live poll every 30 seconds so leave status (Approved/Rejected) updates instantly
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadData = async () => {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const allAtt = await api.hrAttendance.getAll(currentMonth);
            // Show ALL records for this employee (Present + Absent + Late)
            const myAtt = allAtt.filter(a => a.employee_id === user?.employee_id);
            setAttendanceHistory(myAtt);

            // Calculate Stats
            const present = myAtt.filter(a => a.status === 'Present' && a.is_late !== 1).length;
            const late = myAtt.filter(a => a.is_late === 1).length;
            const absent = myAtt.filter(a => a.status === 'Absent').length;
            setStats({ present, late, absent });

            // Load My Leaves
            const allLeaves = await api.hrLeaves.getAll();
            setMyLeaves(allLeaves.filter((l: any) => l.employee_id === user?.employee_id));

        } catch (e) {
            console.error(e);
        }
    };

    const loadProjects = async () => {
        try {
            const data = await api.projects.getAll();
            setProjects(data || []);
        } catch (e) { }
    };

    // --- Camera & Location ---
    const startCamera = async () => {
        setCameraActive(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationError('');
            },
            (err) => setLocationError('Location access denied. Please enable GPS.')
        );
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            alert('Camera access denied');
            setCameraActive(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0, 640, 480);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg');
            setCapturedImage(dataUrl);
            stopCamera();
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setCameraActive(false);
    };

    const markAttendance = async () => {
        if (!user?.employee_id) return alert('No Employee ID linked to this user Account.');
        if (!capturedImage) return alert('Please capture a photo.');

        // Time Check
        const now = new Date();
        const timeLimit = new Date();
        timeLimit.setHours(ATTENDANCE_CUTOFF_HOUR, 0, 0); // Configurable Cutoff

        const lateThreshold = new Date();
        lateThreshold.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MINUTE, 0);

        const isLate = now > lateThreshold;

        if (!location) return alert('Location not detected. Please enable GPS to mark attendance.');

        if (now >= timeLimit) {
            setStatusMessage({ type: 'error', text: 'Absent Mark and Today Absent will be effected on salary' });
            // Optionally we can still submit as 'Absent' record to DB if required logic dictates
            return;
        }

        setLoading(true);
        try {
            await api.hrAttendance.mark({
                employee_id: user.employee_id,
                employee_name: user.name,
                date: now.toISOString().split('T')[0],
                time_in: now.toLocaleTimeString('en-US', { hour12: false }),
                time_out: '',
                status: 'Present',
                is_late: isLate ? 1 : 0,
                latitude: location.lat,
                longitude: location.lng,
                address: `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`,
                image_url: capturedImage
            } as any);

            setStatusMessage({ type: 'success', text: 'Attendance Marked Successfully!' });
            loadData(); // Refresh history
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message });
        }
        setLoading(false);
    };

    const submitWork = async () => {
        if (!user?.employee_id) return alert('Employee ID missing');
        if (!workForm.description || !workForm.project_id) return alert('Please fill required fields');

        setLoading(true);
        try {
            await api.dailyWorkLogs.add({
                date: new Date().toISOString().split('T')[0],
                employee_id: user.employee_id,
                project_id: workForm.project_id,
                description: workForm.description,
                work_description: workForm.description,
                feet: workForm.feet,
                expenses: parseFloat(workForm.expenses) || 0,
                expense_description: workForm.expense_description,
                weather: 'Sunny',
            } as any);
            alert('Work Submitted Successfully! ✅');
            setWorkForm({ description: '', feet: '', project_id: '', expenses: '', expense_description: '' });
        } catch (e: any) {
            alert('Failed to submit: ' + e.message);
        }
        setLoading(false);
    };

    const applyLeave = async () => {
        if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason) return alert('Fill all fields');
        setLoading(true);
        try {
            const start = new Date(leaveForm.from_date);
            const end = new Date(leaveForm.to_date);
            let days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

            if (leaveForm.leave_type === 'Half') {
                days = days * 0.5;
            }

            await api.hrLeaves.add({
                employee_id: user?.employee_id,
                employee_name: user?.name,
                from_date: leaveForm.from_date,
                to_date: leaveForm.to_date,
                reason: leaveForm.reason,
                days_count: days,
                leave_type: leaveForm.leave_type
            } as any);
            alert('Leave Applied Successfully! Admin Notified.');
            setLeaveForm({ from_date: '', to_date: '', reason: '', leave_type: 'Full' });
            loadData();
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    }

    // Dynamic Profile Image (Last Selfie or Default)
    const profileImage = attendanceHistory.length > 0 && attendanceHistory[0].image_url ? attendanceHistory[0].image_url : null;

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-4">
            <div className="w-full max-w-md bg-white md:rounded-[3rem] shadow-2xl overflow-hidden relative min-h-screen md:min-h-[800px] flex flex-col">

                {/* Header Section */}
                <div className="relative bg-slate-900 text-white p-8 pb-12 rounded-b-[3rem] shadow-2xl z-10 overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/30 to-emerald-600/30 blur-3xl opacity-60"></div>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

                    <div className="relative z-20 flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-2xl font-black border border-white/20 shadow-inner overflow-hidden">
                                {profileImage ? (
                                    <img src={profileImage} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <span>{user?.name?.[0] || 'E'}</span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight">{user?.name}</h1>
                                <p className="text-xs text-white/60 font-medium uppercase tracking-widest">{user?.role}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="w-10 h-10 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-95 border border-white/10">
                            <span className="text-lg">↪️</span>
                        </button>
                    </div>

                    {/* Stats / Notification Area */}
                    <div className="relative z-20 bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Live Status</p>
                                <p className="text-sm font-medium leading-relaxed text-white/90">
                                    Welcome back! Mark your attendance before <span className="text-white font-bold decoration-emerald-400 underline decoration-2 underline-offset-2">09:15 AM</span> to avoid late deductions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-50 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

                    <div className="relative z-10 p-6 pb-32 space-y-6">
                        {activeTab === 'attendance' && (
                            <div className="animate-fade-in-up space-y-8">

                                {/* Monthly Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                        <div className="text-xl font-black text-emerald-500">{stats.present}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                        <div className="text-xl font-black text-amber-500">{stats.late}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Late</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                        <div className="text-xl font-black text-red-500">{stats.absent}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absent</div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Attendance</span>
                                        <span className="text-2xl">📸</span>
                                    </h2>

                                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-2 overflow-hidden border border-slate-100 relative group">
                                        <div className="bg-slate-50 rounded-[2rem] h-80 flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-slate-200 group-hover:border-indigo-300 transition-colors">
                                            {capturedImage ? (
                                                <img src={capturedImage} className="w-full h-full object-cover" />
                                            ) : cameraActive ? (
                                                <>
                                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                                    <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                                                </>
                                            ) : (
                                                <button onClick={startCamera} className="text-slate-400 group-hover:text-indigo-500 transition-all flex flex-col items-center gap-3 active:scale-95">
                                                    <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center text-4xl mb-2">📸</div>
                                                    <span className="font-black text-xs uppercase tracking-widest">Tap to Open Camera</span>
                                                </button>
                                            )}

                                            {cameraActive && (
                                                <button onClick={capturePhoto} className="absolute bottom-6 w-20 h-20 bg-white/90 backdrop-blur rounded-full border-[6px] border-indigo-100 shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
                                                    <div className="w-16 h-16 bg-gradient-to-tr from-red-500 to-pink-500 rounded-full shadow-inner"></div>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {capturedImage && (
                                        <div className="space-y-4 mt-6 animate-fade-in">
                                            {locationError ? (
                                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                                                    <span className="text-2xl">🛑</span>
                                                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide">{locationError}</p>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 shadow-sm">
                                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">📍</div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Location Verified</p>
                                                        <p className="text-xs font-bold text-slate-700">{location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => { setCapturedImage(null); setCameraActive(false); }} className="py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm">
                                                    Retake
                                                </button>
                                                <button
                                                    onClick={markAttendance}
                                                    disabled={loading || !location}
                                                    className="py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? <span className="animate-spin">⏳</span> : <span>Submit Now ✅</span>}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {statusMessage && (
                                        <div className={`mt-6 p-5 rounded-2xl shadow-xl border flex flex-col items-center gap-2 text-center animate-bounce-in ${statusMessage.type === 'success' ? 'bg-white border-emerald-100 shadow-emerald-100/50' : 'bg-white border-red-100 shadow-red-100/50'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${statusMessage.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {statusMessage.type === 'success' ? '🎉' : '⚠️'}
                                            </div>
                                            <p className={`font-black text-sm uppercase tracking-wide ${statusMessage.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {statusMessage.text}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Attendance History */}
                                <div className="pt-4 border-t border-slate-200/60">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-lg font-black text-slate-700">Recent History 🕒</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {attendanceHistory.length === 0 ? (
                                            <p className="text-center text-slate-400 text-xs py-4">No attendance records found.</p>
                                        ) : (
                                            attendanceHistory.slice(0, 10).map((att) => (
                                                <div key={att.id} className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {att.image_url ? (
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 relative group">
                                                                <img src={att.image_url} alt="Selfie" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${att.status === 'Present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                                {att.status === 'Present' ? '✅' : '❌'}
                                                            </div>
                                                        )}

                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">{new Date(att.date).toLocaleDateString()}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{att.time_in || 'Absent'}</span>
                                                                {att.latitude && att.longitude && (
                                                                    <a
                                                                        href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-[10px] text-blue-500 underline font-bold flex items-center gap-0.5"
                                                                    >
                                                                        📍 Loc
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${att.status === 'Present' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                            {att.status}
                                                        </span>
                                                        {att.is_late === 1 && <span className="text-[8px] text-red-500 font-bold">LATE</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'work' && (
                            <div className="animate-fade-in-up">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Daily Work</span>
                                    <span className="text-2xl">📋</span>
                                </h2>

                                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Select Project / Site</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 pl-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 text-sm font-bold appearance-none transition-shadow"
                                                value={workForm.project_id}
                                                onChange={e => setWorkForm({ ...workForm, project_id: e.target.value })}
                                            >
                                                <option value="">-- Start Typing to Search --</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Details</label>
                                            <textarea
                                                className="w-full p-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 resize-none h-32 text-sm font-medium transition-shadow"
                                                placeholder="Describe your work..."
                                                value={workForm.description}
                                                onChange={e => setWorkForm({ ...workForm, description: e.target.value })}
                                            />
                                        </div>

                                        {/* Measurement & Expense Group */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Measurement (Feet)</label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full p-4 pl-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 text-sm font-bold transition-shadow"
                                                        placeholder="0.00"
                                                        value={workForm.feet}
                                                        onChange={e => setWorkForm({ ...workForm, feet: e.target.value })}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">FT</div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Daily Expense</label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full p-4 pl-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 text-sm font-bold transition-shadow"
                                                        placeholder="0"
                                                        value={workForm.expenses}
                                                        onChange={e => setWorkForm({ ...workForm, expenses: e.target.value })}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">PKR</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expense Description */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Expense Details (Optional)</label>
                                            <input
                                                className="w-full p-4 pl-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 text-sm font-bold transition-shadow"
                                                placeholder="e.g. Lunch for team, Fuel, etc."
                                                value={workForm.expense_description}
                                                onChange={e => setWorkForm({ ...workForm, expense_description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={submitWork}
                                        disabled={loading}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-900/20 hover:bg-black disabled:opacity-50 transition-all active:scale-95 mt-4 bg-gradient-to-r from-slate-900 to-slate-800"
                                    >
                                        {loading ? 'Saving...' : 'Submit Log 💾'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'leaves' && (
                            <div className="animate-fade-in-up">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">Apply Leave</span>
                                    <span className="text-2xl">🏖️</span>
                                </h2>

                                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -z-10"></div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">From Date</label>
                                            <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">To Date</label>
                                            <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={leaveForm.to_date} onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Type</label>
                                        <div className="flex gap-4 px-2">
                                            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="ltype_emp"
                                                    checked={leaveForm.leave_type === 'Full'}
                                                    onChange={() => setLeaveForm({ ...leaveForm, leave_type: 'Full' })}
                                                    className="w-4 h-4 accent-slate-900"
                                                />
                                                Full Day
                                            </label>
                                            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="ltype_emp"
                                                    checked={leaveForm.leave_type === 'Half'}
                                                    onChange={() => setLeaveForm({ ...leaveForm, leave_type: 'Half' })}
                                                    className="w-4 h-4 accent-slate-900"
                                                />
                                                Half Day
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Reason</label>
                                        <textarea
                                            className="w-full p-5 bg-slate-50 rounded-2xl resize-none h-32 text-sm font-medium"
                                            placeholder="Why do you need leave?"
                                            value={leaveForm.reason}
                                            onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button
                                        onClick={applyLeave}
                                        disabled={loading}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-orange-900/20 hover:bg-black disabled:opacity-50 transition-all active:scale-95 bg-gradient-to-r from-slate-900 to-slate-800"
                                    >
                                        {loading ? 'Starting...' : 'Submit Application 🚀'}
                                    </button>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-black text-slate-700 mb-4 px-2">My Applications 📋</h3>
                                    <div className="space-y-3">
                                        {myLeaves.length === 0 ? (
                                            <p className="text-center text-slate-400 text-xs text-opacity-70 italic">No leave history found.</p>
                                        ) : (
                                            myLeaves.map(leave => (
                                                <div key={leave.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-black text-sm text-slate-800">{leave.days_count} Day{leave.days_count !== 1 ? 's' : ''}</p>
                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${leave.leave_type === 'Half' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    {leave.leave_type || 'Full'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-medium">{new Date(leave.from_date).toLocaleDateString()} — {new Date(leave.to_date).toLocaleDateString()}</p>
                                                            {leave.reason && <p className="text-[10px] text-slate-400 mt-1 italic">"{leave.reason.slice(0, 40)}{leave.reason.length > 40 ? '...' : ''}"</p>}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shrink-0 ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : leave.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {leave.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Floating Navigation (Verified Glass Stick) */}
                <div className="absolute bottom-6 left-6 right-6 z-50">
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2rem] p-2 flex justify-between items-center px-6 ring-1 ring-black/5">
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`flex flex-col items-center gap-1 p-3 px-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${activeTab === 'attendance' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <span className="text-xl relative z-10">📸</span>
                            {activeTab === 'attendance' && <span className="text-[9px] font-black uppercase tracking-wider relative z-10 animate-fade-in">Verify</span>}
                        </button>

                        <button
                            onClick={() => setActiveTab('work')}
                            className={`flex flex-col items-center gap-1 p-3 px-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${activeTab === 'work' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <span className="text-xl relative z-10">📝</span>
                            {activeTab === 'work' && <span className="text-[9px] font-black uppercase tracking-wider relative z-10 animate-fade-in">Log Work</span>}
                        </button>

                        <button
                            onClick={() => setActiveTab('leaves')}
                            className={`flex flex-col items-center gap-1 p-3 px-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${activeTab === 'leaves' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <span className="text-xl relative z-10">🏖️</span>
                            {activeTab === 'leaves' && <span className="text-[9px] font-black uppercase tracking-wider relative z-10 animate-fade-in">Leaves</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
