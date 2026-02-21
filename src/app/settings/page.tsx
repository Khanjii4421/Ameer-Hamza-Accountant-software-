'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, CompanyProfile, User, HREmployee } from '@/lib/api';

export default function SettingsPage() {
    const { user } = useAuth();
    const router = useRouter();

    // State
    const [profile, setProfile] = useState<CompanyProfile>({
        id: '',
        name: '',
        address: '',
        phone: '',
        admin_password: '',
        letterhead_url: '',
        logo_url: '',
        sidebar_logo_url: ''
    });
    const [users, setUsers] = useState<User[]>([]);
    const [employees, setEmployees] = useState<HREmployee[]>([]);
    const [loading, setLoading] = useState(true);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const [tempProfile, setTempProfile] = useState<CompanyProfile>(profile);
    const [tempUser, setTempUser] = useState<{ name: string, username: string, password: string, role: string, employee_id?: string }>({
        name: '', username: '', password: '', role: 'Accountant', employee_id: ''
    });

    // Auth Check
    useEffect(() => {
        if (user) {
            if (user.role === 'Employee') router.push('/employee/dashboard'); // Redirect Employees
            if (user.role === 'Accountant' || user.role === 'Viewer') {
                router.push('/');
            }
        }
    }, [user, router]);

    // Fetch Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileData, usersData, employeesData] = await Promise.all([
                api.profile.get(),
                api.users.getAll(),
                api.hrEmployees.getAll()
            ]);
            if (profileData) setProfile(profileData);
            if (usersData) setUsers(usersData);
            if (employeesData) setEmployees(employeesData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Derived state
    const isPdfLetterhead = profile.letterhead_url?.startsWith('data:application/pdf');

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updates: any = {
                name: tempProfile.name,
                address: tempProfile.address,
                phone: tempProfile.phone,
                letterhead_url: tempProfile.letterhead_url,
                logo_url: tempProfile.logo_url,
                sidebar_logo_url: tempProfile.sidebar_logo_url
            };

            // Only include admin_password if a non-empty value was provided
            if (tempProfile.admin_password && tempProfile.admin_password.toString().trim() !== '') {
                updates.admin_password = tempProfile.admin_password;
            }

            const updated = await api.profile.update(updates);
            setProfile(updated);
            setIsProfileModalOpen(false);
        } catch (error) {
            alert('Failed to update profile');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'letterhead_url' | 'logo_url' | 'sidebar_logo_url') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempProfile(prev => ({
                    ...prev,
                    [field]: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempUser.name || !tempUser.username || !tempUser.password) return;

        try {
            const newUser = await api.users.add({
                name: tempUser.name,
                username: tempUser.username,
                password: tempUser.password,
                role: tempUser.role as any,
                employee_id: tempUser.employee_id
            });
            setUsers([...users, newUser]);
            setTempUser({ name: '', username: '', password: '', role: 'Accountant', employee_id: '' });
            setIsUserModalOpen(false);
        } catch (error: any) {
            alert('Failed to add user: ' + (error.message || 'Unknown error'));
            console.error(error);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await api.users.delete(id);
                setUsers(users.filter(u => u.id !== id));
            } catch (err) {
                alert('Failed to delete user');
            }
        }
    };

    // Auto-save admin password when changed in the input directly? Use a button in real app.
    // For now we will rely on strict save buttons for profile updates to avoid complexity.

    const canManageUsers = user?.role === 'Admin';

    if (user?.role === 'Accountant' || user?.role === 'Viewer') return null;
    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <>
            <Header title="System Settings" />

            <div className="p-8 max-w-4xl space-y-6">
                {/* Company Profile Section */}
                <Card title="Company Details & Branding">
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Company Name:</span>
                                <span className="font-bold text-gray-900">{profile.name}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Address:</span>
                                <span className="font-medium text-gray-900">{profile.address}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Phone:</span>
                                <span className="font-medium text-gray-900">{profile.phone}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Letterhead Preview */}
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Letterhead Source:</p>
                                {profile.letterhead_url ? (
                                    isPdfLetterhead ? (
                                        <div className="border rounded-lg h-40 w-full relative bg-gray-100 flex flex-col items-center justify-center">
                                            <span className="text-4xl">📄</span>
                                            <span className="text-sm font-medium mt-2 text-gray-700">PDF Letterhead Loaded</span>
                                        </div>
                                    ) : (
                                        <div className="border rounded-lg overflow-hidden h-40 w-full relative bg-white">
                                            <Image src={profile.letterhead_url} alt="Letterhead" fill className="object-cover" />
                                        </div>
                                    )
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 p-4 text-center text-xs">
                                        No Letterhead.
                                    </div>
                                )}
                            </div>

                            {/* Logo Preview */}
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Center Watermark Logo:</p>
                                {profile.logo_url ? (
                                    <div className="border rounded-lg overflow-hidden h-40 w-full relative bg-white flex items-center justify-center">
                                        <div className="relative h-24 w-24">
                                            <Image src={profile.logo_url} alt="Logo" fill className="object-contain opacity-50" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 p-4 text-center text-xs">
                                        No Logo.
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button variant="secondary" onClick={() => { setTempProfile(profile); setIsProfileModalOpen(true); }}>Edit Profile & Upload Assets</Button>
                    </div>
                </Card>

                {/* Sidebar Logo Section */}
                <Card title="Sidebar Logo">
                    <div className="space-y-4">
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Current Sidebar Logo:</p>
                                {profile.sidebar_logo_url ? (
                                    <div className="border rounded-lg overflow-hidden h-24 w-full max-w-xs bg-gray-900 flex items-center justify-center p-4">
                                        <div className="relative h-16 w-full">
                                            <Image src={profile.sidebar_logo_url} alt="Sidebar Logo" fill className="object-contain" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 w-full max-w-xs flex flex-col items-center justify-center text-gray-400 p-4 text-center text-xs">
                                        No Sidebar Logo.
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button variant="secondary" onClick={() => { setTempProfile(profile); setIsProfileModalOpen(true); }}>Change Sidebar Logo (via Edit Profile)</Button>
                    </div>
                </Card>

                {/* User Management */}
                {canManageUsers && (
                    <Card title="User Management">
                        <div className="space-y-4">
                            {users.map((u) => (
                                <div key={u.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center group hover:bg-gray-100 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-900">{u.name}</p>
                                        <p className="text-xs text-gray-500">@{u.username} • {u.role}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-600 text-sm font-medium">Active</span>
                                        {u.role !== 'Admin' && u.username !== user?.username && (
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-1">
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button variant="primary" onClick={() => setIsUserModalOpen(true)}>Add New User</Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Edit Profile Modal */}
            <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Update Company Profile">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <Input label="Company Name" value={tempProfile.name || ''} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} />
                    <Input label="Address" value={tempProfile.address || ''} onChange={e => setTempProfile({ ...tempProfile, address: e.target.value })} />
                    <Input label="Phone" value={tempProfile.phone || ''} onChange={e => setTempProfile({ ...tempProfile, phone: e.target.value })} />
                    <Input label="Admin Password" value={tempProfile.admin_password || ''} onChange={e => setTempProfile({ ...tempProfile, admin_password: e.target.value })} />

                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Branding Assets</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Letterhead</label>
                                <input type="file" accept="application/pdf, image/*" onChange={(e) => handleFileChange(e, 'letterhead_url')} className="block w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Center Logo</label>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo_url')} className="block w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sidebar Logo</label>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'sidebar_logo_url')} className="block w-full text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsProfileModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Add User Modal */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Add New User">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <Input label="Full Name" value={tempUser.name} onChange={e => setTempUser({ ...tempUser, name: e.target.value })} required />
                    <Input label="Username" value={tempUser.username} onChange={e => setTempUser({ ...tempUser, username: e.target.value })} required />
                    <Input label="Password" type="password" value={tempUser.password} onChange={e => setTempUser({ ...tempUser, password: e.target.value })} required />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                        <select className="w-full px-4 py-2 border rounded-lg bg-white" value={tempUser.role} onChange={e => setTempUser({ ...tempUser, role: e.target.value })}>
                            <option value="Accountant">Accountant</option>
                            <option value="Manager">Manager</option>
                            <option value="Viewer">Viewer</option>
                            <option value="Employee">Employee (Restricted)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Employee (Optional)</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg bg-white"
                            value={tempUser.employee_id || ''}
                            onChange={e => setTempUser({ ...tempUser, employee_id: e.target.value })}
                        >
                            <option value="">-- None --</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name} ({e.designation})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Create User</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
