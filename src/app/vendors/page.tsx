'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, Vendor, LedgerEntry, CompanyProfile } from "@/lib/api";

export default function VendorsPage() {
    const { user } = useAuth();

    // State
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAdmin = () => user?.role === 'Admin';
    const canDeleteDirectly = checkAdmin();
    const showDelete = canDeleteDirectly;
    const canAdd = user?.role !== 'Viewer';

    // -- STATE --
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
    const [newVendorForm, setNewVendorForm] = useState({ name: '', category: '', phone: '' });

    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    // Delete State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, vendorId: string | null }>({ isOpen: false, vendorId: null });
    const [passwordInput, setPasswordInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [v, l, p, prof] = await Promise.all([
                api.vendors.getAll(),
                api.ledger.getAll(),
                api.projects.getAll(),
                api.profile.get()
            ]);
            if (v) setVendors(v);
            if (l) setLedger(l as any);
            if (p) setProjects(p);
            if (prof) setProfile(prof);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // -- GROUPING LOGIC --
    const vendorsByCategory = useMemo(() => {
        const groups: Record<string, Vendor[]> = {};
        vendors.forEach(v => {
            const cat = v.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(v);
        });
        return groups;
    }, [vendors]);

    // -- HISTORY LOGIC --
    const vendorHistory = useMemo(() => {
        if (!selectedVendor) return { entries: [], total: 0 };
        const entries = ledger
            .filter(e => e.vendor_id === selectedVendor.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
        return { entries, total };
    }, [selectedVendor, ledger]);

    // -- ACTIONS --
    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVendorForm.name) return;

        try {
            if (editingVendorId) {
                // Update existing vendor
                await api.vendors.update(editingVendorId, {
                    name: newVendorForm.name,
                    category: newVendorForm.category,
                    phone: newVendorForm.phone,
                    address: ''
                });
                // Reload data to get updated vendors
                await loadData();
            } else {
                // Add new vendor
                const newVendor = await api.vendors.add({
                    name: newVendorForm.name,
                    category: newVendorForm.category,
                    phone: newVendorForm.phone,
                    address: ''
                });
                setVendors([newVendor, ...vendors]);
            }

            setNewVendorForm({ name: '', category: '', phone: '' });
            setEditingVendorId(null);
            setIsAddModalOpen(false);
        } catch (error) {
            alert(editingVendorId ? 'Failed to update vendor' : 'Failed to add vendor');
        }
    };

    const handleEditClick = (vendor: Vendor, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingVendorId(vendor.id);
        setNewVendorForm({
            name: vendor.name,
            category: vendor.category,
            phone: vendor.phone || ''
        });
        setIsAddModalOpen(true);
    };

    const handleDeleteClick = (vendorId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (canDeleteDirectly) {
            setDeleteModal({ isOpen: true, vendorId });
            setPasswordInput('');
            setErrorMsg('');
        }
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (deleteModal.vendorId) {
            try {
                await api.vendors.delete(deleteModal.vendorId);
                setVendors(vendors.filter(v => v.id !== deleteModal.vendorId));
            } catch (err) {
                alert('Failed to delete vendor');
            }
        }
        setDeleteModal({ isOpen: false, vendorId: null });
        if (selectedVendor?.id === deleteModal.vendorId) setSelectedVendor(null);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <Header
                title="Vendor Management"
                action={canAdd && <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>+ Add Vendor</Button>}
            />

            <div className="p-8 space-y-8">
                {vendors.length === 0 ? (
                    <Card className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">🏗️</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">No Vendors Found</h3>
                        <p className="text-gray-500 mt-2 mb-6">Add vendors to track expenses and material supplies.</p>
                        {canAdd && <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>Add Vendor</Button>}
                    </Card>
                ) : (
                    Object.entries(vendorsByCategory).map(([category, categoryVendors]) => (
                        <div key={category} className="space-y-3">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-accent rounded-full"></span>
                                {category} <span className="text-sm font-normal text-gray-500">({categoryVendors.length})</span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {categoryVendors.map(vendor => (
                                    <div
                                        key={vendor.id}
                                        className="bg-white border hover:border-accent/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group relative"
                                    >
                                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canAdd && (
                                                <button
                                                    onClick={(e) => handleEditClick(vendor, e)}
                                                    className="p-1.5 hover:bg-blue-50 text-gray-300 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Edit Vendor"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            {showDelete && (
                                                <button
                                                    onClick={(e) => handleDeleteClick(vendor.id, e)}
                                                    className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-600 rounded-md transition-colors"
                                                    title="Delete Vendor"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm uppercase">
                                                {vendor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{vendor.name}</h3>
                                                <p className="text-xs text-gray-500">{vendor.phone || 'No Contact'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingVendorId(null);
                    setNewVendorForm({ name: '', category: '', phone: '' });
                }}
                title={editingVendorId ? "Edit Vendor" : "Add New Vendor"}
            >
                <form onSubmit={handleAddVendor} className="space-y-4">
                    <Input
                        label="Vendor Name"
                        placeholder="e.g. Al-Madina Cement"
                        value={newVendorForm.name}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                        <input
                            list="categories"
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            placeholder="e.g. Electrician, Plumber, Material..."
                            value={newVendorForm.category}
                            onChange={e => setNewVendorForm({ ...newVendorForm, category: e.target.value })}
                            required
                        />
                        <datalist id="categories">
                            <option value="Electrician" />
                            <option value="Plumber" />
                            <option value="Labor" />
                            <option value="Mason" />
                            <option value="Cement" />
                            <option value="Steel" />
                            <option value="Paint" />
                            <option value="Wood" />
                            <option value="Contractor" />
                            <option value="Other" />
                        </datalist>
                    </div>
                    <Input
                        label="Phone Number"
                        placeholder="+92 300 1234567"
                        value={newVendorForm.phone}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingVendorId(null);
                            setNewVendorForm({ name: '', category: '', phone: '' });
                        }}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingVendorId ? 'Update Vendor' : 'Save Vendor'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, vendorId: null })}
                title="Confirm Vendor Deletion"
            >
                <form onSubmit={confirmDelete} className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
                        <p className="font-bold mb-1">Warning: Irreversible Action</p>
                        <p>This will permanently delete the vendor record.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setDeleteModal({ isOpen: false, vendorId: null })}>Cancel</Button>
                        <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white">Confirm Delete</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
