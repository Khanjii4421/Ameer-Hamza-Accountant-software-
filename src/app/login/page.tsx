'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const [activeForm, setActiveForm] = useState<'login' | 'register' | 'recover'>('login');

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [regData, setRegData] = useState({ companyName: '', phone: '', address: '', username: '', password: '' });
    const [recData, setRecData] = useState({ companyName: '', phone: '', newPassword: '' });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [recoveredUser, setRecoveredUser] = useState('');

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const success = await login(loginData.username, loginData.password);
        setLoading(false);
        if (!success) {
            setError('Invalid username or password');
        } else {
            router.push('/dashboard');
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(regData),
            });

            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                setError(data.error || 'Registration failed');
                return;
            }

            setSuccessMsg('Company registered successfully! Please login.');
            setTimeout(() => {
                setActiveForm('login');
                setLoginData({ username: regData.username, password: '' });
                setSuccessMsg('');
            }, 2000);

        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'Network error');
        }
    };

    const handleRecoverSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setRecoveredUser('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recData),
            });

            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                setError(data.error || 'Recovery failed');
                return;
            }

            if (recData.newPassword) {
                setSuccessMsg('Password updated successfully! Please login.');
                setTimeout(() => {
                    setActiveForm('login');
                    setRecData({ companyName: '', phone: '', newPassword: '' });
                    setSuccessMsg('');
                }, 2000);
            } else {
                setRecoveredUser(data.username);
                setSuccessMsg('Account verified! You can view your username or set a new password.');
            }

        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'Network error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] relative overflow-hidden font-sans text-slate-100 selection:bg-accent/30 selection:text-white">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[60%] bg-blue-600/20 rounded-full blur-[140px] animate-pulse opacity-60" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-indigo-600/20 rounded-full blur-[140px] opacity-60" />

            <div className="w-full max-w-md z-10 p-4 min-h-[600px] flex justify-center items-center relative perspective-[1000px]">
                {/* Forms Container */}
                <div className="w-full relative min-h-[500px]">

                    {/* Forms wrapper with 3D Flip effect - using simple opacity for better compatibility but styled premium */}
                    <div className="absolute inset-0 w-full h-full transition-all duration-500 ease-in-out">
                        {/* LOGIN FORM */}
                        <div className={`absolute inset-0 w-full glass-card bg-[#0d152a]/80 backdrop-blur-2xl p-8 lg:p-10 rounded-[2rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 ${activeForm === 'login' ? 'opacity-100 z-10 translate-x-0 scale-100' : 'opacity-0 -z-10 translate-x-10 lg:translate-x-20 scale-95 pointer-events-none'}`}>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Welcome Back</h2>
                                <p className="text-slate-400 text-sm">Sign in to your enterprise account</p>
                            </div>

                            <form onSubmit={handleLoginSubmit} className="space-y-5">
                                {error && activeForm === 'login' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <span>⚠️</span> {error}
                                    </div>
                                )}
                                {successMsg && activeForm === 'login' && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <span>✅</span> {successMsg}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Username</label>
                                        <Input
                                            value={loginData.username}
                                            onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                            placeholder="Enter username"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 h-12 rounded-xl pointer-events-auto"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center pl-1 pr-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                                            <button
                                                type="button"
                                                onClick={() => { setActiveForm('recover'); setError(''); setSuccessMsg(''); }}
                                                className="text-xs text-blue-400 hover:text-blue-300 font-medium pointer-events-auto"
                                            >
                                                Forgot?
                                            </button>
                                        </div>
                                        <Input
                                            type="password"
                                            value={loginData.password}
                                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                            placeholder="••••••••"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 h-12 rounded-xl pointer-events-auto"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 mt-6 pointer-events-auto"
                                >
                                    {loading ? 'AUTHENTICATING...' : 'ACCESS PORTAL'}
                                </Button>
                            </form>

                            <div className="mt-8 text-center pt-6 border-t border-white/5">
                                <p className="text-slate-400 text-sm">
                                    Don't have a company account?{' '}
                                    <button
                                        onClick={() => { setActiveForm('register'); setError(''); setSuccessMsg(''); }}
                                        className="text-blue-400 font-bold hover:text-blue-300 transition-colors pointer-events-auto"
                                    >
                                        Register Company
                                    </button>
                                </p>
                            </div>
                        </div>

                        {/* REGISTER FORM */}
                        <div className={`absolute inset-0 w-full glass-card bg-[#0d152a]/80 backdrop-blur-2xl p-8 lg:p-10 rounded-[2rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 ${activeForm === 'register' ? 'opacity-100 z-10 translate-x-0 scale-100' : 'opacity-0 -z-10 -translate-x-10 lg:-translate-x-20 scale-95 pointer-events-none'}`}>
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Onboard Company</h2>
                                <p className="text-slate-400 text-sm">Create your master enterprise workspace</p>
                            </div>

                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                {error && activeForm === 'register' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <span>⚠️</span> {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Input
                                            value={regData.companyName}
                                            onChange={(e) => setRegData({ ...regData, companyName: e.target.value })}
                                            placeholder="Company Name *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 h-11 pointer-events-auto"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            value={regData.phone}
                                            onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                                            placeholder="Mobile Number *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 h-11 pointer-events-auto"
                                        />
                                        <Input
                                            value={regData.username}
                                            onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                                            placeholder="Admin Username *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 h-11 pointer-events-auto"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            type="password"
                                            value={regData.password}
                                            onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                                            placeholder="Admin Password *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 h-11 pointer-events-auto"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            value={regData.address}
                                            onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                                            placeholder="Company Address"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 h-11 pointer-events-auto"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 mt-4 pointer-events-auto"
                                >
                                    {loading ? 'CREATING WORKSPACE...' : 'CREATE COMPANY'}
                                </Button>
                            </form>

                            <div className="mt-6 text-center pt-5 border-t border-white/5">
                                <p className="text-slate-400 text-sm">
                                    Already registered?{' '}
                                    <button
                                        onClick={() => { setActiveForm('login'); setError(''); setSuccessMsg(''); }}
                                        className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors pointer-events-auto"
                                    >
                                        Login Here
                                    </button>
                                </p>
                            </div>
                        </div>

                        {/* RECOVER ACCOUNT FORM */}
                        <div className={`absolute inset-0 w-full glass-card bg-[#0d152a]/80 backdrop-blur-2xl p-8 lg:p-10 rounded-[2rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 ${activeForm === 'recover' ? 'opacity-100 z-10 translate-x-0 scale-100' : 'opacity-0 -z-10 -translate-x-10 lg:-translate-x-20 scale-95 pointer-events-none'}`}>
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Recover Account</h2>
                                <p className="text-slate-400 text-sm">Verify your company to retrieve info</p>
                            </div>

                            <form onSubmit={handleRecoverSubmit} className="space-y-4">
                                {error && activeForm === 'recover' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <span>⚠️</span> {error}
                                    </div>
                                )}
                                {successMsg && activeForm === 'recover' && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <span>✅</span> {successMsg}
                                    </div>
                                )}

                                {recoveredUser && (
                                    <div className="p-4 bg-white/5 border border-blue-500/20 rounded-xl text-center space-y-1">
                                        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Your Admin Username</p>
                                        <p className="text-blue-400 font-black text-xl">{recoveredUser}</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Input
                                            value={recData.companyName}
                                            onChange={(e) => setRecData({ ...recData, companyName: e.target.value })}
                                            placeholder="Registered Company Name *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 h-12 pointer-events-auto"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            value={recData.phone}
                                            onChange={(e) => setRecData({ ...recData, phone: e.target.value })}
                                            placeholder="Registered Mobile Number *"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 h-12 pointer-events-auto"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            type="password"
                                            value={recData.newPassword}
                                            onChange={(e) => setRecData({ ...recData, newPassword: e.target.value })}
                                            placeholder="New Password (optional)"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 h-12 pointer-events-auto"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 mt-4 pointer-events-auto"
                                >
                                    {loading ? 'PROCESSING...' : (recData.newPassword ? 'UPDATE PASSWORD' : 'FIND ACCOUNT')}
                                </Button>
                            </form>

                            <div className="mt-6 text-center pt-5 border-t border-white/5">
                                <p className="text-slate-400 text-sm">
                                    Remember your details?{' '}
                                    <button
                                        onClick={() => { setActiveForm('login'); setError(''); setSuccessMsg(''); setRecoveredUser(''); }}
                                        className="text-blue-400 font-bold hover:text-blue-300 transition-colors pointer-events-auto"
                                    >
                                        Login Here
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
